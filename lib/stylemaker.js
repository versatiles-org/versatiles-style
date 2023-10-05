import Color from 'color';
import expandBraces from 'brace-expansion';
import template from './template.js';
import layers from './layers.js';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

export default class Stylemaker {
	#id
	#fonts
	#colorLookup
	#layerStyles
	#layers
	#layerIds
	#layerIdSet
	#template
	#style_spec
	constructor(id) {
		if (!id) throw new Error('every style should have an id');

		this.#id = id;
		this.#fonts = new Map();
		this.#colorLookup = new Map();
		this.#layerStyles = new Map();
		this.#layers = layers;
		this.#layerIds = layers.map(l => l.id);
		this.#layerIdSet = new Set(this.#layerIds);
		this.#template = template;
	}
	addFonts(obj) {
		Object.entries(obj).forEach(([key, value]) => {
			if (this.#fonts.has(key)) throw new Error('duplicated font id: ' + key);
			this.#fonts.set(key, value);
		})
	}
	addColors(obj) {
		Object.entries(obj).forEach(([key, value]) => {
			if (this.#colorLookup.has(key)) throw new Error('duplicated color id: ' + key);
			this.#colorLookup.set(key, value);
		})
	}
	addLayerStyles(obj) {
		Object.entries(obj).forEach(([idDef, layerStyle]) => {
			let ids = expandBraces(idDef).flatMap(id => {
				if (!id.includes('*')) return id;
				let regExp = id.replace(/[^a-z\-:]/g, c => {
					switch (c) {
						case '*': return '[a-z\-]*'
					}
					throw new Error('unknown char to process. Do not know how to make a RegExp from: ' + JSON.stringify(c));
				})
				regExp = new RegExp(`^${regExp}$`, 'i');
				return this.#layerIds.filter(layerId => regExp.test(layerId));
			});

			ids.forEach(id => {
				if (!this.#layerIdSet.has(id)) {
					//console.warn(`id "${id}" created from id definition "${idDef}" does not exist`);
					return;
				}
				if (this.#layerStyles.has(id)) {
					this.#layerStyles.set(id, Object.assign(this.#layerStyles.get(id), layerStyle));
				} else {
					this.#layerStyles.set(id, layerStyle)
				}
			})
		})
	}
	build() {
		const style = deepClone(this.#template);
		style.id = this.#id;
		style.name = this.#id;
		style.layers = this.#decorateLayers();
		let errors = validateStyleMin(style);
		console.log({ errors });
	}
	getOptions() { }
	#decorateLayers() {
		let colorLookup = this.#colorLookup;

		return deepClone(this.#layers).flatMap(layer => {
			let id = layer.id;
			let layerStyle = this.#layerStyles.get(id);
			if (!layerStyle) return [];
			processStyling(layer, layerStyle);
			return [layer];
		})

		function processStyling(layer, style) {
			layer.layout = {};
			layer.paint = {};

			processShortcuts(style);

			Object.entries(style).map(([key, value]) => {
				// CamelCase to not-camel-case
				key = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
				switch (key) {
					case 'maxzoom':
					case 'minzoom':
						layer[key] = value; break;
					case 'background-color':
					case 'fill-color':
					case 'fill-outline-color':
					case 'line-color':
					case 'text-color':
					case 'text-halo-color':
						layer.paint[key] = processColor(value); break;
					case 'fill-opacity':
					case 'icon-opacity':
					case 'icon-size':
					case 'line-blur':
					case 'line-opacity':
					case 'line-width':
					case 'text-halo-blur':
					case 'text-halo-width':
						layer.paint[key] = processNumber(value); break;
					case 'fill-antialias':
					case 'fill-pattern':
					case 'fill-translate':
					case 'line-dasharray':
						layer.paint[key] = value; break; // CHECK OTHERS !!!!
					case 'text-padding':
						layer.layout[key] = processNumber(value); break;
					case 'icon-anchor':
					case 'icon-keep-upright':
					case 'icon-optional':
					case 'line-cap':
					case 'line-join':
					case 'symbol-placement':
					case 'text-anchor':
					case 'text-offset':
					case 'text-optional':
					case 'text-transform':
						layer.layout[key] = value; break;
					default: throw new Error(`unknown key "${key}" for layer "${layer.id}"`);
				}
			})

			function processColor(value) {
				switch (typeof value) {
					case 'string': return processColorString(value);
					default:
						throw new Error(`unknown color type "${typeof value}"`);
				}

				function processColorString(value) {
					let color, match;
					console.log({value});
					if (match = value.match(/\$colors.([a-z]*)/)) {
						color = colorLookup.get(match[1]);
						if (!color) throw new Error('color not found');
						return Color(color).hex();
					}
					throw new Error();
				}
			}

			function processNumber(value) {
				switch (typeof value) {
					case 'number': return value;
					case 'object':
						if (Array.isArray(value)) return processExpression(value, processNumber);
						return processZoomStops(value, processNumber);
					default:
						throw new Error(`unknown number type "${typeof value}" of value ${JSON.stringify(value)}`);
				}
			}

			function processFont(value) {
				switch (typeof value) {
					default:
						throw new Error(`unknown font type "${typeof value}" of value ${JSON.stringify(value)}`);
				}
			}

			function processExpression(value, cbValue) {
				console.log(value);
				process.exit();
			}

			function processZoomStops(obj, cbValue) {
				return {
					stops: Object.entries(obj)
						.map(([z, v]) => [parseInt(z, 10), cbValue(v)])
						.sort(([a], [b]) => a - b)
				}
			}

			function processShortcuts(style) {
				switch (layer.type) {
					case 'background': [
						['color', 'paint', 'background-color'],
						['icon', 'paint', 'background-pattern'],
						['opacity', 'paint', 'background-opacity'],
					].forEach(resolveShortcut); break;
					case 'fill': [
						['color', 'paint', 'fill-color'],
						['icon', 'paint', 'fill-pattern'],
						['opacity', 'paint', 'fill-opacity'],
					].forEach(resolveShortcut); break;
					case 'line': [
						['color', 'paint', 'line-color'],
						['size', 'paint', 'line-width'],
						['icon', 'paint', 'line-pattern'],
						['opacity', 'paint', 'line-opacity'],
					].forEach(resolveShortcut); break;
					case 'symbol': [
						['color', 'paint', 'text-color'],
						['size', 'layout', 'text-size'],
						['text', 'layout', 'text-field'],
						['font', 'layout', 'text-font'],
						['icon', 'layout', 'icon-image'],
						['opacity', 'paint', 'text-opacity'],
						['opacity', 'paint', 'icon-opacity'],
					].forEach(resolveShortcut); break;
					default: throw new Error();
				}
				function resolveShortcut([keyShortcut, key1, key2]) {
					if (style[keyShortcut] !== undefined) layer[key1][key2] = style[keyShortcut];
				}

				// delete shortcuts;
				delete style.color
				delete style.size
				delete style.text
				delete style.font
				delete style.icon
				delete style.opacity
			}
		}
	}
	getMaker() {
		let me = this;
		return {
			build: (...args) => me.build(...args),
			getOptions: (...args) => me.getOptions(...args),
		}
	}
}

function deepClone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

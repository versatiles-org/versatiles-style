import Color from 'color';
import expandBraces from 'brace-expansion';
import template from './template.js';
import layers from './layers.js';
import maplibre_style_properties from './maplibre_style_properties.js';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

export default class Stylemaker {
	#id
	#fieldLookup
	#fontLookup
	#colorLookup
	#layerStyles
	#layers
	#layerIds
	#layerIdSet
	#template
	#options
	constructor(id) {
		if (!id) throw new Error('every style should have an id');

		this.#id = id;
		this.#fieldLookup = new Map();
		this.#fontLookup = new Map();
		this.#colorLookup = new Map();
		this.#layerStyles = new Map();
		this.#layers = layers;
		this.#layerIds = layers.map(l => l.id);
		this.#layerIdSet = new Set(this.#layerIds);
		this.#template = template;
		this.#options = {
			language: ''
		}
	}
	addFonts(obj) {
		Object.entries(obj).forEach(([key, value]) => this.#fontLookup.set(key, value));
	}
	addFields(obj) {
		Object.entries(obj).forEach(([key, value]) => this.#fieldLookup.set(key, value));
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
	build(options) {
		options = Object.assign(deepClone(this.#options), options);

		const style = deepClone(this.#template);
		style.id = this.#id;
		style.name = this.#id;
		style.layers = this.#decorateLayers(options);

		//style.layers.forEach((l, i) => console.log('layer', i, l));

		let errors = validateStyleMin(style);
		if (errors.length > 0) console.log(errors);
	}
	getOptions() { }
	#decorateLayers(options = {}) {
		let colorLookup = this.#colorLookup;
		let fontLookup = this.#fontLookup;
		let fieldLookup = this.#fieldLookup;

		return deepClone(this.#layers).flatMap(layer => {
			let id = layer.id;
			let layerStyle = this.#layerStyles.get(id);
			if (!layerStyle) return [];

			layer.source = 'versatiles-shortbread';

			if (layer.layer) {
				layer['source-layer'] = layer.layer;
				delete layer.layer;
			}

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

				let property_def = maplibre_style_properties.get(key);
				if (!property_def) throw new Error();

				if (!property_def.types.has(layer.type)) return;

				switch (property_def.value) {
					case 'color': value = processExpression(value, processColor); break;
					case 'fonts': value = processExpression(value, processFont); break;
					case 'formatted': value = processExpression(value, processField); break;
					case 'resolvedImage': console.warn('handle resolvedImage'); break;
					case 'array':
					case 'boolean':
					case 'enum':
					case 'number': value = processExpression(value); break;
					default: throw new Error(`unknown type "${property_def.type}" for key "${key}"`);
				}


				switch (property_def.parent) {
					case 'layer': layer[key] = value; break;
					case 'layout': layer.layout[key] = value; break;
					case 'paint': layer.paint[key] = value; break;
					default: throw new Error(`unknown parent "${property_def.parent}" for key "${key}"`);
				}
			})

			function processField(value) {
				switch (typeof value) {
					case 'string': return processFieldString(value);
					default:
						throw new Error(`unknown field type "${typeof value}"`);
				}

				function processFieldString(value) {
					let field, match;
					if (match = value.match(/\$fields\.(?<field>[a-zA-Z_]+)$/)) {
						field = fieldLookup.get(match.groups.field);
						if (!field) throw new Error('field not found: ' + field);
						field = field[options.language];
						if (!field) throw new Error('language not found: ' + options.language);

						return field;
					}
					throw new Error('field format not valid: ' + value);
				}
			}

			function processColor(value) {
				switch (typeof value) {
					case 'string': return processColorString(value);
					default:
						throw new Error(`unknown color type "${typeof value}"`);
				}

				function processColorString(value) {
					let color, match;
					if (value.startsWith('#')) {
						if (/^#[0-9a-f]{6}$/i) return value;
					}
					if (match = value.match(/\$colors\.(?<color>[a-zA-Z_]+)(?<filter>(\|[a-z]+\s*:\s*[0-9\.\-]+)*)$/)) {
						color = colorLookup.get(match.groups.color);
						if (!color) throw new Error('color not found:' + color);
						color = new Color(color);

						if (match.groups.filter) {
							let filter = match.groups.filter.split('|').slice(1);
							filter.forEach(filter => {
								let [name, arg] = filter.split(/:/);
								arg = parseFloat(arg.trim());
								switch (name.trim()) {
									case 'darken': color = color.darken(arg); break;
									case 'desaturate': color = color.desaturate(arg); break;
									case 'fade': color = color.fade(arg); break;
									case 'lighten': color = color.lighten(arg); break;
									case 'rotate': color = color.rotate(arg); break;
									case 'saturate': color = color.saturate(arg); break;
									default: throw new Error('unknown color filter: ' + name.trim());
								}
							})
						}

						return color.hex();
					}
					throw new Error('color format not valid: ' + value);
				}
			}

			function processFont(value) {
				switch (typeof value) {
					case 'string': return processFontString(value);
					default:
						throw new Error(`unknown font type "${typeof value}"`);
				}

				function processFontString(value) {
					let font, match;
					if (match = value.match(/\$fonts\.(?<font>[a-zA-Z_]+)$/)) {
						font = fontLookup.get(match.groups.font);
						if (!font) throw new Error('font not found: ' + font);

						return [font];
					}
					throw new Error('font format not valid: ' + value);
				}
			}

			function processExpression(value, cbValue) {
				cbValue ??= v => v;
				if ((typeof value == 'object') && !Array.isArray(value)) {
					return processZoomStops(value, cbValue);
				} else {
					return cbValue(value)
				};
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
						['color', 'background-color'],
						['icon', 'background-pattern'],
						['opacity', 'background-opacity'],
					].forEach(resolveShortcut); break;
					case 'fill': [
						['color', 'fill-color'],
						['icon', 'fill-pattern'],
						['opacity', 'fill-opacity'],
					].forEach(resolveShortcut); break;
					case 'line': [
						['color', 'line-color'],
						['size', 'line-width'],
						['icon', 'line-pattern'],
						['opacity', 'line-opacity'],
					].forEach(resolveShortcut); break;
					case 'symbol': [
						['color', 'text-color'],
						['size', 'text-size'],
						['text', 'text-field'],
						['font', 'text-font'],
						['icon', 'icon-image'],
						['opacity', 'text-opacity'],
						['opacity', 'icon-opacity'],
					].forEach(resolveShortcut); break;
					default: throw new Error();
				}
				function resolveShortcut([keyShortcut, keyCorrect]) {
					if (style[keyShortcut] !== undefined) style[keyCorrect] = style[keyShortcut];
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

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
	#layerStyleGenerator
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
			this.#colorLookup.set(key, new Color(value));
		})
	}
	setLayerStyle(cb) {
		this.#layerStyleGenerator = cb;
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

		let layerStyleRules = this.#layerStyleGenerator({
			getColor: key => {
				let color = colorLookup.get(key);
				if (!color) throw new Error('unknown color name: ' + key)
				return color
			},
			getFont: key => {
				let font = fontLookup.get(key);
				if (!font) throw new Error('unknown font name: ' + key)
				return font
			},
			getField: key => {
				let field = fieldLookup.get(key);
				if (!field) throw new Error('unknown field name: ' + key)
				return field
			},
		})

		let layerStyles = new Map();
		Object.entries(layerStyleRules).forEach(([idDef, layerStyle]) => {
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
				if (!this.#layerIdSet.has(id)) return;
				layerStyles.set(id, Object.assign(layerStyles.get(id) || {}, layerStyle));
			})
		})

		return deepClone(this.#layers).flatMap(layer => {
			let id = layer.id;
			let layerStyle = layerStyles.get(id);
			if (!layerStyle) return [];
			layerStyle = Object.assign({}, layerStyle);

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
				if (typeof value == 'string') {
					let field = fieldLookup.get(value);
					if (!field) throw new Error('field not found: ' + field);
					field = field[options.language];
					if (!field) throw new Error('language not found: ' + options.language);
					return field;
				}
				throw new Error(`unknown field type "${typeof value}"`);
			}

			function processColor(value) {
				if (typeof value === 'string') return Color(value).hex();
				if (value instanceof Color) return value.hex();
				throw new Error(`unknown color type "${typeof value}"`);
			}

			function processFont(value) {
				if (typeof value === 'string') return value;
				throw new Error(`unknown font type "${typeof value}"`);
			}

			function processExpression(value, cbValue) {
				cbValue ??= v => v;
				if (typeof value === 'object') {
					if (value instanceof Color) return cbValue(value);
					if (!Array.isArray(value)) {
						return processZoomStops(value, cbValue);
					}
				}
				return cbValue(value);
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

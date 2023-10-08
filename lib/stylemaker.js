import Color from 'color';
import expandBraces from 'brace-expansion';
import template from './template.js';
import layers from './layers.js';
import maplibreProperties from './maplibre_properties.js';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';

export default class Stylemaker {
	#id
	#layerStyleGenerator
	#layers
	#layerIds
	#layerIdSet
	#template
	#options
	constructor(id) {
		if (!id) throw new Error('every style should have an id');

		this.#id = id;
		this.#layers = layers;
		this.#layerIds = layers.map(l => l.id);
		this.#layerIdSet = new Set(this.#layerIds);
		this.#template = template;
		this.#options = {
			language: null,
			colors: {},
			fonts: {},
		}
	}
	addFonts(obj) {
		Object.entries(obj).forEach(([key, value]) => this.#options.fonts[key] = value);
	}
	addColors(obj) {
		Object.entries(obj).forEach(([key, value]) => this.#options.colors[key] = Color(value).hex());
	}
	setLayerStyle(cb) {
		this.#layerStyleGenerator = cb;
	}
	build(options) {
		options = Object.assign(deepClone(this.#options), options);

		const style = deepClone(this.#template);
		style.id = this.#id;
		style.name = this.#id;

		options.sourceName ??= Object.keys(style.sources)[0];

		style.layers = this.#decorateLayers(options);

		let errors = validateStyleMin(style);
		if (errors.length > 0) console.log(errors);
	}
	getOptions() {
		return deepClone(this.#options);
	}
	#decorateLayers(options = {}) {

		let languageSuffix = options.language;
		languageSuffix = (typeof languageSuffix === 'string') ? '_' + languageSuffix : '';

		let layerStyleRules = this.#layerStyleGenerator({
			colors: new Proxy({}, {
				get(t, key, r) {
					let value = options.colors[key];
					if (!value) throw new Error(`unknown color name: colors.${key}`)
					return Color(value);
				}
			}),
			fonts: new Proxy({}, {
				get(t, key, r) {
					let value = options.fonts[key];
					if (!value) throw new Error(`unknown font name: fonts.${key}`)
					return value
				}
			}),
			languageSuffix
		})

		let layerStyles = new Map();
		Object.entries(layerStyleRules).forEach(([idDef, layerStyle]) => {
			let ids = expandBraces(idDef).flatMap(id => {
				if (!id.includes('*')) return id;
				let regExp = id.replace(/[^a-z\-:]/g, c => {
					if (c === '*') return '[a-z\-]*';
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

		let layers = deepClone(this.#layers).flatMap(layer => {
			let id = layer.id;
			let layerStyle = layerStyles.get(id);
			if (!layerStyle) return [];
			layerStyle = Object.assign({}, layerStyle);

			layer.source = options.sourceName;

			if (layer.layer) {
				layer['source-layer'] = layer.layer;
				delete layer.layer;
			}

			processStyling(layer, layerStyle);
			return [layer];
		})

		return layers;

		function processStyling(layer, style) {
			layer.layout = {};
			layer.paint = {};

			processShortcuts(style);

			Object.entries(style).forEach(([key, value]) => {
				// CamelCase to not-camel-case
				key = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

				let propertyDef = maplibreProperties.get(key);
				if (!propertyDef) throw new Error();

				if (!propertyDef.types.has(layer.type)) return;

				switch (propertyDef.value) {
					case 'color': value = processExpression(value, processColor); break;
					case 'fonts': value = processExpression(value, processFont); break;
					case 'resolvedImage': console.warn('handle resolvedImage'); break;
					case 'formatted': ;
					case 'array':
					case 'boolean':
					case 'enum':
					case 'number': value = processExpression(value); break;
					default: throw new Error(`unknown type "${propertyDef.type}" for key "${key}"`);
				}


				switch (propertyDef.parent) {
					case 'layer': layer[key] = value; break;
					case 'layout': layer.layout[key] = value; break;
					case 'paint': layer.paint[key] = value; break;
					default: throw new Error(`unknown parent "${propertyDef.parent}" for key "${key}"`);
				}
			})

			function processColor(value) {
				if (value instanceof Color) return value.hex();
				if (typeof value === 'string') return Color(value).hex();
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

// Import necessary modules and files
import Color from 'color';
import expandBraces from 'brace-expansion';
import TEMPLATE from './template.js';
import LAYERS from './layers.js';
import MAPLIBRE_PROPERTIES from './maplibre_properties.js';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { deepClone, deepMerge } from './utils.js';


const LAYER_IDS = LAYERS.map(l => l.id);
const LAYER_ID_SET = new Set(LAYER_IDS);

// Stylemaker class definition
export default class Stylemaker {
	// Private class properties
	#id
	#layerStyleGenerator
	#options

	// Constructor
	constructor(id) {
		// Validate that an id is provided
		if (!id) throw new Error('every style should have an id');

		// Initialize private properties
		this.#id = id;
		this.#options = {
			validateStyle: true,
			language: null,
			colors: {},
			fonts: {},
		};
	}

	// Method to add fonts to options
	addFonts(obj) {
		Object.assign(this.#options.fonts, obj);
	}

	// Method to add colors to options and convert them to HEX
	addColors(obj) {
		Object.assign(this.#options.colors, obj);
	}

	// Method to set layer style generator function
	setLayerStyle(cb) {
		this.#layerStyleGenerator = cb;
	}

	// Method to build the final style
	build(options) {
		// Deep clone options and merge with existing options
		options = deepMerge(this.#options, options);

		// Deep clone template and update style
		const style = deepMerge(TEMPLATE, {
			id: this.#id,
			name: this.#id,
		});

		// Set source name if not provided
		options.sourceName ??= Object.keys(style.sources)[0];

		// Decorate layers
		style.layers = this.#decorateLayers(options);

		if (options.validateStyle) {
			// Validate the style and log errors if any	
			let errors = validateStyleMin(style);
			if (errors.length > 0) console.log(errors);
		}
	}

	// Method to get options
	getOptions() {
		return deepClone(this.#options);
	}

	// Private method to decorate layers
	#decorateLayers(options = {}) {
		// If a language option is provided, append it as a suffix, otherwise, leave it empty
		let languageSuffix = options.language ? '_' + options.language : '';

		// Generate layer style rules by invoking the layerStyleGenerator callback
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

		// Initialize a new map to hold final styles for layers
		let layerStyles = new Map();

		// Iterate through the generated layer style rules
		Object.entries(layerStyleRules).forEach(([idDef, layerStyle]) => {
			// Expand any braces in IDs and filter them through a RegExp if necessary
			let ids = expandBraces(idDef).flatMap(id => {
				if (!id.includes('*')) return id;
				let regExp = id.replace(/[^a-z\-:]/g, c => {
					if (c === '*') return '[a-z\-]*';
					throw new Error('unknown char to process. Do not know how to make a RegExp from: ' + JSON.stringify(c));
				})
				regExp = new RegExp(`^${regExp}$`, 'i');
				return LAYER_IDS.filter(layerId => regExp.test(layerId));
			});

			ids.forEach(id => {
				if (!LAYER_ID_SET.has(id)) return;
				layerStyles.set(id, Object.assign(layerStyles.get(id) || {}, layerStyle));
			})
		})

		// Deep clone the original layers and apply styles
		let layers = deepClone(LAYERS).flatMap(layer => {
			// Get the id and style of the layer
			let layerStyle = Object.assign({}, layerStyles.get(layer.id));
			if (!layerStyle) return [];

			// Set the layer source to the provided sourceName option
			layer.source = options.sourceName;
			layer.layout = {};
			layer.paint = {};

			processStyling(layer, layerStyle);
			return [layer];
		})

		return layers;

		// Function to process each style attribute for the layer
		function processStyling(layer, style) {

			Object.entries(style).forEach(([key, value]) => {
				// CamelCase to not-camel-case
				key = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());

				let propertyDefs = MAPLIBRE_PROPERTIES.get(key);
				if (!propertyDefs) throw new Error('unknown key: ' + key);

				let propertyDef = propertyDefs.get(layer.type);
				if (!propertyDef) return;

				key = propertyDef.key;

				switch (propertyDef.value) {
					case 'color': value = processExpression(value, processColor); break;
					case 'fonts': value = processExpression(value, processFont); break;
					case 'resolvedImage': console.warn('handle resolvedImage'); break;
					case 'formatted':
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
		}
	}

	// Method to get a 'maker' object with limited API
	getMaker() {
		let me = this;
		return {
			build: (...args) => me.build(...args),
			getOptions: (...args) => me.getOptions(...args),
		}
	}
}

// Import necessary modules and files
import Color from 'color';
import TEMPLATE from './template.js';
import { deepClone, deepMerge } from './utils.js';
import { decorate } from './decorator.js';

// Stylemaker class definition
export default class Baker {
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
	bake(options) {
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

		style.layers.forEach(layer => layer.source = options.sourceName);

		return style;
	}

	// Method to get options
	getOptions() {
		return deepClone(this.#options);
	}

	#getStyleRules(options) {
		// If a language option is provided, append it as a suffix, otherwise, leave it empty
		let languageSuffix = options.language ? '_' + options.language : '';

		return this.#layerStyleGenerator({
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
	}

	// Private method to decorate layers
	#decorateLayers(options = {}) {
		// Generate layer style rules by invoking the layerStyleGenerator callback
		let layerStyleRules = this.#getStyleRules(options);

		return decorate(layerStyleRules);
	}

	// Method to get a 'maker' object with limited API
	getBaker() {
		let me = this;
		return {
			bake: (...args) => me.bake(...args),
			getOptions: (...args) => me.getOptions(...args),
		}
	}
}

// Import necessary modules and files
import Color from 'color';
import STYLE_TEMPLATE from './shortbread_template.js';
import getLayers from './shortbread_layers.js';
import { deepClone, deepMerge } from './utils.js';
import { decorate } from './decorator.js';
import { transformColors, getDefaultColorTransformer } from './color_transformer.js';

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
			hideLabels: false,
			language: 'de',
			glyphsUrl: false,
			spriteUrl: false,
			tilesUrl: false,
			colors: {},
			fonts: {},
			colorTransformer: getDefaultColorTransformer(),
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
	#bake(options) {
		// Deep clone options and merge with existing options
		options = deepMerge(this.#options, options);

		const style = deepClone(STYLE_TEMPLATE);

		// Set source name if not provided
		options.sourceName ??= Object.keys(style.sources)[0];

		// Decorate layers
		style.layers = this.#decorateLayers(options);

		style.layers.forEach(layer => {
			if (layer.type !== 'background') layer.source = options.sourceName
		});

		style.id = 'versatiles-' + this.#id;
		style.name = 'versatiles-' + this.#id;
		if (options.glyphsUrl) style.glyphs = options.glyphsUrl;
		if (options.spriteUrl) style.sprite = options.spriteUrl;
		if (options.tilesUrl) style.sources[options.sourceName].tiles = options.tilesUrl;

		return style;
	}

	// Method to get options
	#getOptions() {
		return deepClone(this.#options);
	}

	#getStyleRules(options) {
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
			languageSuffix: options.language ? '_' + options.language : '',
		})
	}

	// Private method to decorate layers
	#decorateLayers(options = {}) {
		options = deepMerge(this.#options, options);

		transformColors(options.colors, options.colorTransformer);;

		// Generate layer style rules by invoking the layerStyleGenerator callback
		let layerStyleRules = this.#getStyleRules(options);

		let layers = getLayers({
			languageSuffix: options.language ? '_' + options.language : '',
		})

		layers = decorate(layers, layerStyleRules);

		if (options.hideLabels) layers = layers.filter(l => l.type !== 'symbol');

		return layers;
	}

	// Method to get a 'maker' object with limited API
	getBaker() {
		let me = this;
		return {
			id: this.#id,
			bake: (...args) => me.#bake(...args),
			getOptions: (...args) => me.#getOptions(...args),
		}
	}
}

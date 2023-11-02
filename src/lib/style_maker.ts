// Import necessary modules and files
import Color from 'color';
import STYLE_TEMPLATE from './shortbread_template.js';
import getLayers from './shortbread_layers.js';
import { deepClone, deepMerge } from './utils.js';
import { decorate } from './decorator.js';
import { transformColors, getDefaultColorTransformer } from './color_transformer.js';
import { MaplibreLayer, MaplibreStyle, StyleRules, StylemakerColorLookup, StylemakerFunction, StylemakerLayerStyleGenerator, StylemakerOptions } from './types.js';

// Stylemaker class definition
export default class StyleMaker {
	// Private class properties
	#id: string
	#layerStyleGenerator?: StylemakerLayerStyleGenerator
	#options: StylemakerOptions

	// Constructor
	constructor(id: string) {
		// Validate that an id is provided
		if (!id) throw new Error('every style should have an id');

		// Initialize private properties
		this.#id = id;
		this.#options = {
			hideLabels: false,
			language: false, // false, 'de' or 'en'
			baseUrl: undefined, // set me in the browser
			glyphsUrl: '/assets/fonts/{fontstack}/{range}.pbf',
			spriteUrl: '/assets/sprites/sprites',
			tilesUrls: ['/tiles/osm/{z}/{x}/{y}'],
			colors: {},
			fonts: {},
			colorTransformer: getDefaultColorTransformer(),
		};
	}

	// Method to add fonts to options
	addFonts(obj: { [name: string]: string }) {
		if (!this.#options.fonts) this.#options.fonts = {};
		Object.assign(this.#options.fonts, obj);
	}

	// Method to add colors to options and convert them to HEX
	addColors(obj: { [name: string]: string | Color }) {
		const colors: StylemakerColorLookup = this.#options.colors ??= {};
		Object.entries(obj).forEach(([name, color]) => {
			if (typeof color === 'string') {
				colors[name] = Color(color);
			} else {
				colors[name] = color;

			}
		})
	}

	// Method to set layer style generator function
	setLayerStyle(cb: StylemakerLayerStyleGenerator) {
		this.#layerStyleGenerator = cb;
	}

	// Method to build the final style
	#make(options: StylemakerOptions): MaplibreStyle {
		// Deep clone options and merge with existing options
		options = deepMerge(this.#options, options);

		const style: MaplibreStyle = deepClone(STYLE_TEMPLATE);

		// Set source name if not provided
		options.sourceName ??= Object.keys(style.sources)[0];

		// Decorate layers
		style.layers = this.#decorateLayers(options);

		style.layers.forEach(layer => {
			if ('source' in layer) layer.source = options.sourceName
		});

		style.name = 'versatiles-' + this.#id;

		if (options.glyphsUrl) style.glyphs = resolveUrl(options.glyphsUrl);
		if (options.spriteUrl) style.sprite = resolveUrl(options.spriteUrl);
		if (options.tilesUrls) {
			const source = style.sources[options.sourceName];
			if ('tiles' in source) source.tiles = options.tilesUrls.map(resolveUrl)
		}

		return style;

		function resolveUrl(url: string): string {
			if (!options.baseUrl) return url;
			return (new URL(url, options.baseUrl)).href;
		}
	}

	// Method to get options
	#getOptions(): StylemakerOptions {
		return deepClone(this.#options);
	}

	// Private method to decorate layers
	#decorateLayers(options: StylemakerOptions = {}): MaplibreLayer[] {
		options = deepMerge(this.#options, options);

		if (options.colors && options.colorTransformer) {
			transformColors(options.colors, options.colorTransformer);
		}

		// Generate layer style rules by invoking the layerStyleGenerator callback
		if (!this.#layerStyleGenerator) throw new Error();
		const layerStyleRules: StyleRules = this.#layerStyleGenerator({
			colors: new Proxy({}, {
				get(t, key,) {
					if (typeof key !== 'string') throw new Error(`unknown color name: colors.${String(key)}`);
					const value: Color | undefined = options.colors?.[key];
					if (!value) throw new Error(`unknown color name: colors.${key}`);
					return value;
				}
			}),
			fonts: new Proxy({}, {
				get(t, key,) {
					if (typeof key !== 'string') throw new Error(`unknown color name: colors.${String(key)}`);
					const value: string | undefined = options.fonts?.[key];
					if (!value) throw new Error(`unknown font name: fonts.${key}`)
					return value
				}
			}),
			languageSuffix: options.language ? '_' + options.language : '',
		});

		let layers = getLayers({
			languageSuffix: options.language ? '_' + options.language : '',
		})

		layers = decorate(layers, layerStyleRules);

		if (options.hideLabels) layers = layers.filter(l => l.type !== 'symbol');

		return layers;
	}

	// Method to get a 'maker' object with limited API
	finish():StylemakerFunction {
		const self = this; // eslint-disable-line
		const styleMaker = function (options: StylemakerOptions) { return self.#make(options); }
		Object.assign(styleMaker, {
			get id() { return self.#id },
			get options() { return self.#getOptions() }
		})
		return styleMaker;
	}
}
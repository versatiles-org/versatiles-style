// Import necessary modules and files
import Color from 'color';
import STYLE_TEMPLATE from './shortbread_template.js';
import getLayers from './shortbread_layers.js';
import { deepClone, deepMerge } from './utils.js';
import { decorate } from './decorator.js';
import { transformColors, getDefaultColorTransformer } from './color_transformer.js';
import { MaplibreLayer, MaplibreStyle, StyleRules, StyleRulesOptions, StylemakerColorLookup, StylemakerFontLookup, StylemakerFunction, StylemakerLayerStyleGenerator, StylemakerOptions } from './types.js';

// Stylemaker class definition
export default class StyleMaker {
	// Private class properties
	#name: string = 'unnamed';
	#options: StylemakerOptions

	// Constructor
	constructor() {

		// Initialize private properties
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


	get name(): string {
		return this.#name;
	}
	set name(name: string) {
		this.#name = name;
	}


	get fonts(): StylemakerFontLookup {
		return this.#options.fonts || {}
	}
	set fonts(fonts: { [name: string]: string }) {
		Object.assign(this.#options.fonts ??= {}, fonts);
	}


	get colors(): StylemakerColorLookup {
		return this.#options.colors || {}
	}
	set colors(colors: { [name: string]: string | Color }) {
		const oldColors: StylemakerColorLookup = this.#options.colors ??= {};
		Object.entries(colors).forEach(([name, color]) => {
			if (typeof color === 'string') {
				oldColors[name] = Color(color);
			} else {
				oldColors[name] = color;

			}
		})
	}
	getStyleRules(options: StyleRulesOptions): StyleRules {
		throw Error();
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

		style.name = 'versatiles-' + this.#name;

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
		options.colors ??= {};
		options.fonts ??= {};
		const languageSuffix = options.language ? '_' + options.language : '';

		if (options.colors && options.colorTransformer) {
			transformColors(options.colors, options.colorTransformer);
		}

		// Generate layer style rules by invoking the layerStyleGenerator callback
		const layerStyleRules = this.getStyleRules({
			colors: options.colors,
			fonts: options.fonts,
			languageSuffix,
		});

		let layers = getLayers({ languageSuffix })

		layers = decorate(layers, layerStyleRules);

		if (options.hideLabels) layers = layers.filter(l => l.type !== 'symbol');

		return layers;
	}

	// Method to get a 'maker' object with limited API
	getBuilder(): StylemakerFunction {
		const self = this; // eslint-disable-line
		const styleMaker = function (options: StylemakerOptions) { return self.#make(options); }
		Object.assign(styleMaker, {
			get id() { return self.#name },
			get options() { return self.#getOptions() }
		})
		return styleMaker;
	}
}
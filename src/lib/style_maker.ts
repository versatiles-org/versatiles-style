// Import necessary modules and files
import Color from 'color';
import STYLE_TEMPLATE from './shortbread/template.js';
import getLayers from './shortbread/layers.js';
import { deepClone } from './utils.js';
import { decorate } from './decorator.js';
import { transformColors, getDefaultColorTransformer } from './color_transformer.js';
import { MaplibreLayer, MaplibreStyle, StyleRules, StyleRulesOptions, StylemakerColorLookup, StylemakerFontLookup, StylemakerFunction, StylemakerOptions } from './types.js';
import { Configuration } from './configuration.js';

// Stylemaker class definition
export default class StyleMaker {
	// Private class properties
	#name: string = 'unnamed';
	#sourceName: string = 'versatiles-shortbread';
	#config: Configuration

	// Constructor
	constructor() {
		this.#config = new Configuration();
	}


	get name(): string {
		return this.#name;
	}
	set name(name: string) {
		this.#name = name;
	}


	get fonts(): StylemakerFontLookup {
		return this.#config.fonts;
	}
	set fonts(fonts: { [name: string]: string }) {
		this.#config.setFonts(fonts);
	}


	get colors(): StylemakerColorLookup {
		return this.#config.colors;
	}
	set colors(colors: { [name: string]: string }) {
		this.#config.setColors(colors);
	}


	getStyleRules(options: StyleRulesOptions): StyleRules {
		throw Error();
	}
	// Method to build the final style
	#make(configuration: Configuration): MaplibreStyle {
		const style: MaplibreStyle = deepClone(STYLE_TEMPLATE);

		// Decorate layers
		style.layers = this.#decorateLayers(configuration);

		style.layers.forEach(layer => {
			if ('source' in layer) layer.source = this.#sourceName
		});

		style.name = 'versatiles-' + this.#name;
		style.glyphs = resolveUrl(configuration.glyphsUrl);
		style.sprite = resolveUrl(configuration.spriteUrl);

		const source = style.sources[this.#sourceName];
		if ('tiles' in source) source.tiles = configuration.tilesUrls.map(resolveUrl)

		return style;

		function resolveUrl(url: string): string {
			if (!configuration.baseUrl) return url;
			return (new URL(url, configuration.baseUrl)).href;
		}
	}

	// Private method to decorate layers
	#decorateLayers(config: Configuration): MaplibreLayer[] {

		if (config.colors) {
			Object.keys(config.colors).forEach(key => {
				config.colors[key] = Color(config.colors[key]);
			})
			if (config.colorTransformer) {
				transformColors(config.colors, config.colorTransformer);
			}
		}

		// Generate layer style rules by invoking the layerStyleGenerator callback
		const layerStyleRules = this.getStyleRules({
			colors: config.colors,
			fonts: config.fonts,
			languageSuffix: config.languageSuffix,
		});

		let layers = getLayers({ languageSuffix: config.languageSuffix })

		layers = decorate(layers, layerStyleRules);

		if (config.hideLabels) layers = layers.filter(l => l.type !== 'symbol');

		return layers;
	}

	// Method to get a 'maker' object with limited API
	getBuilder(): StylemakerFunction {
		const self = this; // eslint-disable-line
		const fn = function (options: StylemakerOptions) {
			return self.#make(self.#config.buildNew(options));
		}
		Object.defineProperties(fn, {
			name: { value: self.#name, writable: false },
			options: { value: self.#config.getOptions(), writable: false },
		})
		return fn as StylemakerFunction
	}
}
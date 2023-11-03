// Import necessary modules and files
import Color from 'color';
import getShortbreadTemplate from './shortbread/template.js';
import getShortbreadLayers from './shortbread/layers.js';
import { decorate } from './decorator.js';
import { transformColors } from './color_transformer.js';
import { MaplibreStyle, StyleRules, StyleRulesOptions, StylemakerColorLookup, StylemakerFontLookup, StylemakerOptions } from './types.js';
import { Configuration } from './configuration.js';

// Stylemaker class definition
export default class StyleDefinition {
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
	set colors(colors: { [name: string]: string | Color }) {
		this.#config.setColors(colors);
	}


	getOptions(): StylemakerOptions {
		return this.#config.getOptions();
	}


	getStyleRules(options: StyleRulesOptions): StyleRules {
		throw Error();
	}


	// Method to get a 'maker' object with limited API
	build(options: StylemakerOptions): MaplibreStyle {
		// get configuration
		const configuration = this.#config.buildNew(options);

		// get empty shortbread style
		const style: MaplibreStyle = getShortbreadTemplate();

		// transform colors
		transformColors(configuration.colors, configuration.colorTransformer);

		// get layer style rules from child class
		const layerStyleRules = this.getStyleRules({
			colors: configuration.colors,
			fonts: configuration.fonts,
			languageSuffix: configuration.languageSuffix,
		});

		// get shortbread layers
		let layers = getShortbreadLayers({ languageSuffix: configuration.languageSuffix })

		// apply layer rules
		layers = decorate(layers, layerStyleRules);

		// hide labels, if wanted
		if (configuration.hideLabels) layers = layers.filter(l => l.type !== 'symbol');

		// set source, if needed
		layers.forEach(layer => {
			if ('source' in layer) layer.source = this.#sourceName
		});

		style.layers = layers;
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
}

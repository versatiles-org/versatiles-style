// Import necessary modules and files
import Color from 'color';
import getShortbreadTemplate from './shortbread/template.js';
import getShortbreadLayers from './shortbread/layers.js';
import { decorate } from './decorator.js';
import { recolor } from './recolor.js';
import type { MaplibreStyle, StylemakerColorLookup, StyleBuilderOptions, StylemakerStringLookup, StyleRulesOptions, StyleRules } from './types.js';
import { Configuration } from './configuration.js';
import { StyleBuilder } from './style_builder.js';

// Stylemaker class definition
export default abstract class StyleDefinition {
	readonly #sourceName = 'versatiles-shortbread';

	readonly #config: Configuration;

	public abstract readonly name: string;

	// Constructor
	protected constructor() {
		this.#config = new Configuration();
	}

	protected set fonts(fonts: Record<string, string>) {
		this.#config.setFonts(fonts);
	}

	protected set colors(colors: Record<string, string>) {
		this.#config.setColors(colors);
	}

	public getOptions(): StyleBuilderOptions {
		return this.#config.getOptions();
	}

	// Method to get a 'maker' object with limited API
	public build(options: StyleBuilderOptions): MaplibreStyle {
		// get configuration
		const configuration = this.#config.buildNew(options);

		// get empty shortbread style
		const style: MaplibreStyle = getShortbreadTemplate();

		const colors: StylemakerColorLookup = Object.fromEntries(
			Object.entries(configuration.colors)
				.map(([name, colorString]) => [name, Color(colorString)]),
		);

		// transform colors
		recolor(colors, configuration.recolor);

		// get layer style rules from child class
		const layerStyleRules = this.getStyleRules({
			colors,
			fonts: configuration.fonts,
			languageSuffix: configuration.languageSuffix,
		});

		// get shortbread layers
		let layers = getShortbreadLayers({ languageSuffix: configuration.languageSuffix });

		// apply layer rules
		layers = decorate(layers, layerStyleRules);

		// hide labels, if wanted
		if (configuration.hideLabels) layers = layers.filter(l => l.type !== 'symbol');

		// set source, if needed
		layers.forEach(layer => {
			switch (layer.type) {
				case 'background':
					delete layer.source;
					return;
				case 'fill':
				case 'line':
				case 'symbol':
					layer.source = this.#sourceName;
					return;
			}
			throw Error('unknown layer type');
		});

		style.layers = layers;
		style.name = 'versatiles-' + this.name;
		style.glyphs = resolveUrl(configuration.glyphsUrl);
		style.sprite = resolveUrl(configuration.spriteUrl);

		const source = style.sources[this.#sourceName];
		if ('tiles' in source) source.tiles = configuration.tilesUrls.map(resolveUrl);

		return style;

		function resolveUrl(url: string): string {
			if (!configuration.baseUrl) return url;
			url = new URL(url, configuration.baseUrl).href;
			url = url.replace(/%7B/gi, '{');
			url = url.replace(/%7D/gi, '}');
			return url;
		}
	}

	public getBuilder(): StyleBuilder {
		return new StyleBuilder(this);
	}

	protected recolor(callback: (color: Color) => Color): void {
		const colors: StylemakerStringLookup = Object.fromEntries(
			Object.entries(this.#config.colors)
				.map(([name, color]) => [name, callback(Color(color)).hexa()]),
		);
		this.#config.setColors(colors);
	}


	protected abstract getStyleRules(opt: StyleRulesOptions): StyleRules;
}

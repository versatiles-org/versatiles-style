// Import necessary modules and files
import Color from 'color';
import STYLE_TEMPLATE from './shortbread_template.js';
import getLayers from './shortbread_layers.js';
import { deepClone, deepMerge } from './utils.js';
import { decorate } from './decorator.js';
import { transformColors, getDefaultColorTransformer } from './color_transformer.js';
import { ColorTransformerFlags, MaplibreLayer, MaplibreStyle, StyleRules, StyleRulesOptions, StylemakerColorLookup, StylemakerConfiguration, StylemakerFontLookup, StylemakerFunction, StylemakerLayerStyleGenerator, StylemakerOptions } from './types.js';

// Stylemaker class definition
export default class StyleMaker {
	// Private class properties
	#name: string = 'unnamed';
	#configuration: StylemakerConfiguration

	// Constructor
	constructor() {

		// Initialize private properties
		this.#configuration = {
			hideLabels: false,
			languageSuffix: '',
			baseUrl: 'https://tiles.versatiles.org', // set me in the browser
			glyphsUrl: '/assets/fonts/{fontstack}/{range}.pbf',
			spriteUrl: '/assets/sprites/sprites',
			tilesUrls: ['/tiles/osm/{z}/{x}/{y}'],
			colors: {},
			fonts: {},
			colorTransformer: getDefaultColorTransformer(),
			sourceName: 'versatiles-shortbread',
		};
	}


	get name(): string {
		return this.#name;
	}
	set name(name: string) {
		this.#name = name;
	}


	get fonts(): StylemakerFontLookup {
		return this.#configuration.fonts || {}
	}
	set fonts(fonts: { [name: string]: string }) {
		Object.assign(this.#configuration.fonts ??= {}, fonts);
	}


	get colors(): StylemakerColorLookup {
		return this.#configuration.colors || {}
	}
	set colors(colors: { [name: string]: string | Color }) {
		const oldColors: StylemakerColorLookup = this.#configuration.colors ??= {};
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

	#getConfiguration(options: StylemakerOptions): StylemakerConfiguration {
		const c = this.#configuration;
		const o = options;
		const colors = Object.fromEntries(Object.entries(c.colors).map(([name, color]) => {
			if (o.colors?.[name]) color = Color(o.colors[name]);
			return [name, color];
		}))
		const fonts = Object.fromEntries(Object.entries(c.fonts).map(([name, font]) => {
			if (o.fonts?.[name]) font = o.fonts[name];
			return [name, font];
		}))
		const colorTransformer: ColorTransformerFlags = {
			invert: o.colorTransformer?.invert ?? c.colorTransformer.invert,
			rotate: o.colorTransformer?.rotate ?? c.colorTransformer.rotate,
			saturate: o.colorTransformer?.saturate ?? c.colorTransformer.saturate,
			gamma: o.colorTransformer?.gamma ?? c.colorTransformer.gamma,
			contrast: o.colorTransformer?.contrast ?? c.colorTransformer.contrast,
			brightness: o.colorTransformer?.brightness ?? c.colorTransformer.brightness,
			tint: o.colorTransformer?.tint ?? c.colorTransformer.tint,
			tintColor: o.colorTransformer?.tintColor ? Color(o.colorTransformer?.tintColor) : c.colorTransformer.tintColor,
		}

		let languageSuffix = c.languageSuffix;
		switch (o.language) {
			case 'de': languageSuffix = '_de'; break;
			case 'en': languageSuffix = '_en'; break;
			case '': languageSuffix = ''; break;
			default:
				throw Error('language must be "", "de" or "en"');
		}
		return {
			baseUrl: o.baseUrl ?? c.baseUrl,
			glyphsUrl: o.glyphsUrl ?? c.glyphsUrl,
			spriteUrl: o.spriteUrl ?? c.spriteUrl,
			tilesUrls: o.tilesUrls ?? c.tilesUrls,
			sourceName: o.sourceName ?? c.sourceName,
			hideLabels: o.hideLabels ?? c.hideLabels,
			languageSuffix,
			colors,
			fonts,
			colorTransformer,
		}

		o.language ? '_' + o.language : '';
	}

	// Method to build the final style
	#make(configuration: StylemakerConfiguration): MaplibreStyle {
		const style: MaplibreStyle = deepClone(STYLE_TEMPLATE);

		// Set source name if not provided
		configuration.sourceName ??= Object.keys(style.sources)[0];

		// Decorate layers
		style.layers = this.#decorateLayers(configuration);

		style.layers.forEach(layer => {
			if ('source' in layer) layer.source = configuration.sourceName
		});

		style.name = 'versatiles-' + this.#name;

		if (configuration.glyphsUrl) style.glyphs = resolveUrl(configuration.glyphsUrl);
		if (configuration.spriteUrl) style.sprite = resolveUrl(configuration.spriteUrl);
		if (configuration.tilesUrls) {
			const source = style.sources[configuration.sourceName];
			if ('tiles' in source) source.tiles = configuration.tilesUrls.map(resolveUrl)
		}

		return style;

		function resolveUrl(url: string): string {
			if (!configuration.baseUrl) return url;
			return (new URL(url, configuration.baseUrl)).href;
		}
	}

	// Method to get options
	#getOptions(): StylemakerOptions {
		return deepClone({
			...this.#configuration,
			colors: Object.fromEntries(
				Object.entries(this.#configuration.colors)
					.map(([name, color]) => [name, color.hexa()])
			)
		});
	}

	// Private method to decorate layers
	#decorateLayers(config: StylemakerConfiguration): MaplibreLayer[] {

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
			const configuration: StylemakerConfiguration = self.#getConfiguration(options);
			return self.#make(configuration);
		}
		Object.defineProperties(fn, {
			name: { value: self.#name, writable: false },
			options: { value: self.#getOptions(), writable: false },
		})
		return fn as StylemakerFunction
	}
}
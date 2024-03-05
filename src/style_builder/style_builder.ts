import Color from 'color';
import { getShortbreadTemplate, getShortbreadLayers } from '../shortbread/index.js';
import { decorate } from './decorator.js';
import { CachedRecolor, getDefaultRecolorFlags } from './recolor.js';
import { deepClone, resolveUrl } from '../lib/utils.js';
import type { MaplibreLayer, MaplibreLayerDefinition, MaplibreStyle } from '../types/maplibre.js';
import type { StyleBuilderColorKeys, StyleBuilderColorStrings, StyleBuilderColors, StyleBuilderFontStrings, StyleBuilderOptions } from './types.js';
import type { StyleRules, StyleRulesOptions } from './types.js';



// StyleBuilder class definition
export default abstract class StyleBuilder<Subclass extends StyleBuilder<Subclass>> {
	readonly #sourceName = 'versatiles-shortbread';

	public abstract readonly name: string;

	public abstract readonly defaultColors: StyleBuilderColorStrings<Subclass>;

	public abstract readonly defaultFonts: StyleBuilderFontStrings<Subclass>;

	public build(options?: StyleBuilderOptions<Subclass>): MaplibreStyle {

		options ??= {};

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const baseUrl = options.baseUrl ?? globalThis?.document?.location?.href ?? 'https://tiles.versatiles.org';
		const glyphs = options.glyphs ?? '/assets/fonts/{fontstack}/{range}.pbf';

		const sprite = options.sprite ?? '/assets/sprites/sprites';
		const tiles = options.tiles ?? ['/tiles/osm/{z}/{x}/{y}'];
		const hideLabels = options.hideLabels ?? false;
		const { languageSuffix } = options;
		const recolorOptions = options.recolor ?? getDefaultRecolorFlags();

		const colors = this.getColors(this.defaultColors);
		if (options.colors) {
			for (const key in options.colors) colors[key] = Color(options.colors[key]);
		}

		const fonts = deepClone(this.defaultFonts);
		if (options.fonts) {
			for (const key in options.fonts) {
				const fontName = options.fonts[key];
				if (fontName != null) fonts[key] = fontName;
			}
		}

		// get empty shortbread style
		const style: MaplibreStyle = getShortbreadTemplate();

		const styleRuleOptions: StyleRulesOptions<typeof this> = {
			colors,
			fonts,
			languageSuffix,
		};

		// get layer style rules from child class
		const layerStyleRules = this.getStyleRules(styleRuleOptions);

		// get shortbread layers
		const layerDefinitions: MaplibreLayerDefinition[] = getShortbreadLayers({ languageSuffix });
		let layers: MaplibreLayer[] = layerDefinitions.map(layer => {
			switch (layer.type) {
				case 'background':
					return layer;
				case 'fill':
				case 'line':
				case 'symbol':
					return {
						...layer,
						source: this.#sourceName,
					};
			}
			throw Error('unknown layer type');
		});
		// apply layer rules
		layers = decorate(layers, layerStyleRules, new CachedRecolor(recolorOptions));

		// hide labels, if wanted
		if (hideLabels) layers = layers.filter(l => l.type !== 'symbol');

		style.layers = layers;
		style.name = 'versatiles-' + this.name.toLowerCase();
		style.glyphs = resolveUrl(baseUrl, glyphs);
		style.sprite = resolveUrl(baseUrl, sprite);

		const source = style.sources[this.#sourceName];
		if ('tiles' in source) source.tiles = tiles.map(url => resolveUrl(baseUrl, url));

		return style;
	}

	public getColors(colors: StyleBuilderColorStrings<Subclass>): StyleBuilderColors<Subclass> {
		const entriesString = Object.entries(colors) as [StyleBuilderColorKeys<Subclass>, StyleBuilderColorStrings<Subclass>][];
		const entriesColor = entriesString.map(([key, value]) => [key, Color(value)]) as [StyleBuilderColorKeys<Subclass>, StyleBuilderColors<Subclass>][];
		const result = Object.fromEntries(entriesColor) as StyleBuilderColors<Subclass>;
		return result;
	}

	public getDefaultOptions(): StyleBuilderOptions<Subclass> {
		return {
			baseUrl: '',
			glyphs: '',
			sprite: '',
			tiles: [],
			hideLabels: false,
			languageSuffix: undefined,
			colors: deepClone(this.defaultColors),
			fonts: deepClone(this.defaultFonts),
			recolor: getDefaultRecolorFlags(),
		};
	}

	protected transformDefaultColors(callback: (color: Color) => Color): void {
		const colors = this.getColors(this.defaultColors);
		for (const key in colors) {
			this.defaultColors[key] = callback(colors[key]).hexa();
		}
	}

	protected abstract getStyleRules(options: StyleRulesOptions<Subclass>): StyleRules;
}

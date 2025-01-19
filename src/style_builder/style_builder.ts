import Color from '../color/index.js';
import { getShortbreadTemplate, getShortbreadLayers } from '../shortbread/index.js';
import { decorate } from './decorator.js';
import { CachedRecolor, getDefaultRecolorFlags } from './recolor.js';
import { basename, deepClone, resolveUrl } from '../lib/utils.js';
import type { MaplibreLayer, MaplibreLayerDefinition, StyleSpecification } from '../types/maplibre.js';
import type { StyleBuilderColorKeys, StyleBuilderColorStrings, StyleBuilderColors, StyleBuilderFontStrings, StyleBuilderOptions } from './types.js';
import type { StyleRules, StyleRulesOptions } from './types.js';
import { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';



// StyleBuilder class definition
export default abstract class StyleBuilder<Subclass extends StyleBuilder<Subclass>> {
	readonly #sourceName = 'versatiles-shortbread';

	public abstract readonly name: string;

	public abstract readonly defaultColors: StyleBuilderColorStrings<Subclass>;

	public abstract readonly defaultFonts: StyleBuilderFontStrings<Subclass>;

	public build(options?: StyleBuilderOptions<Subclass>): StyleSpecification {

		options ??= {};


		const baseUrl = options.baseUrl ?? globalThis?.document?.location?.origin ?? 'https://tiles.versatiles.org';
		const glyphs = options.glyphs ?? '/assets/glyphs/{fontstack}/{range}.pbf';

		const sprite: SpriteSpecification = options.sprite ?? [{ id: 'basics', url: '/assets/sprites/basics/sprites' }];
		const tiles = options.tiles ?? ['/tiles/osm/{z}/{x}/{y}'];
		const hideLabels = options.hideLabels ?? false;
		const language = options.language ?? null;
		const recolorOptions = options.recolor ?? getDefaultRecolorFlags();

		const colors = this.getColors(this.defaultColors);
		if (options.colors) {
			for (const key in options.colors) {
				const value = options.colors[key];
				if (value != null) colors[key] = Color.parse(value);
			}
		}

		const fonts = deepClone(this.defaultFonts);
		if (options.fonts) {
			for (const key in options.fonts) {
				const fontName = options.fonts[key];
				if (fontName != null) fonts[key] = fontName;
			}
		}

		// get empty shortbread style
		const style = getShortbreadTemplate();

		const styleRuleOptions: StyleRulesOptions<typeof this> = {
			colors,
			fonts,
			language,
		};

		// get layer style rules from child class
		const layerStyleRules = this.getStyleRules(styleRuleOptions);

		// get shortbread layers
		const layerDefinitions: MaplibreLayerDefinition[] = getShortbreadLayers({ language });
		let layers: MaplibreLayer[] = layerDefinitions.map(layer => {
			switch (layer.type) {
				case 'background':
					return layer;
				case 'fill':
				case 'line':
				case 'symbol':
					return {
						source: this.#sourceName,
						...layer,
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

		if (typeof sprite == 'string') {
			style.sprite = [{ id: basename(sprite), url: resolveUrl(baseUrl, sprite) }];
		} else {
			style.sprite = sprite.map(({ id, url }) => ({ id, url: resolveUrl(baseUrl, url) }));
		}

		const source = style.sources[this.#sourceName];
		if ('tiles' in source) source.tiles = tiles.map(url => resolveUrl(baseUrl, url));

		return style;
	}

	public getColors(colors: StyleBuilderColorStrings<Subclass>): StyleBuilderColors<Subclass> {
		const entriesString = Object.entries(colors) as [StyleBuilderColorKeys<Subclass>, string][];
		const entriesColor = entriesString.map(([key, value]) => [key, Color.parse(value)]) as [StyleBuilderColorKeys<Subclass>, StyleBuilderColors<Subclass>][];
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
			language: undefined,
			colors: deepClone(this.defaultColors),
			fonts: deepClone(this.defaultFonts),
			recolor: getDefaultRecolorFlags(),
		};
	}

	protected transformDefaultColors(callback: (color: Color) => Color): void {
		const colors = this.getColors(this.defaultColors);
		for (const key in colors) {
			this.defaultColors[key] = callback(colors[key]).asHex();
		}
	}

	protected abstract getStyleRules(options: StyleRulesOptions<Subclass>): StyleRules;
}

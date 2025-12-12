import { Color } from '../color/index.js';
import { getShortbreadTemplate, getShortbreadLayers } from '../shortbread/index.js';
import { decorate } from './decorator.js';
import { CachedRecolor, getDefaultRecolorFlags } from './recolor.js';
import { basename, deepClone, resolveUrl } from '../lib/utils.js';
import type { MaplibreLayer, MaplibreLayerDefinition, StyleSpecification } from '../types/maplibre.js';
import {
	styleBuilderColorKeys,
	type StyleBuilderColors,
	type StyleBuilderFonts,
	type StyleBuilderOptions,
} from './types.js';
import type { StyleRules, StyleRulesOptions } from './types.js';

// StyleBuilder class definition
export abstract class StyleBuilder {
	readonly #sourceName = 'versatiles-shortbread';

	public abstract readonly name: string;
	public abstract readonly defaultColors: StyleBuilderColors;
	public abstract readonly defaultFonts: StyleBuilderFonts;

	public build(options?: StyleBuilderOptions): StyleSpecification {
		options ??= {};

		const defaults = this.getDefaultOptions();

		const baseUrl = options.baseUrl ?? defaults.baseUrl;
		const glyphs = options.glyphs ?? defaults.glyphs;
		const sprite = options.sprite ?? defaults.sprite;
		const tiles = options.tiles ?? defaults.tiles;
		const bounds = options.bounds ?? defaults.bounds;
		const hideLabels = options.hideLabels ?? defaults.hideLabels;
		const language = options.language ?? defaults.language;
		const recolorOptions = options.recolor ?? defaults.recolor;

		const colors = this.getColors(this.defaultColors);
		if (options.colors) {
			let key: keyof StyleBuilderColors;
			for (key in options.colors) {
				const value = options.colors[key];
				if (value != null) colors[key] = Color.parse(value);
			}
		}

		const fonts = deepClone(this.defaultFonts);
		if (options.fonts) {
			let key: keyof StyleBuilderFonts;
			for (key in options.fonts) {
				const fontName = options.fonts[key];
				if (fontName != null) fonts[key] = fontName;
			}
		}

		// get empty shortbread style
		const style = getShortbreadTemplate();

		const styleRuleOptions: StyleRulesOptions = {
			colors,
			fonts,
			language,
		};

		// get layer style rules from child class
		const layerStyleRules = this.getStyleRules(styleRuleOptions);

		// get shortbread layers
		const layerDefinitions: MaplibreLayerDefinition[] = getShortbreadLayers({ language });
		let layers: MaplibreLayer[] = layerDefinitions.map((layer) => {
			const { type, id } = layer;
			switch (type) {
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
			throw new Error(
				`StyleBuilder: Unknown layer type "${type}" for layer "${id}". Expected "background", "fill", "line", or "symbol".`
			);
		});
		// apply layer rules
		layers = decorate(layers, layerStyleRules, new CachedRecolor(recolorOptions));

		// hide labels, if wanted
		if (hideLabels) layers = layers.filter((l) => l.type !== 'symbol');

		style.layers = layers;
		style.name = 'versatiles-' + this.name.toLowerCase();
		style.glyphs = resolveUrl(baseUrl, glyphs);

		if (typeof sprite == 'string') {
			style.sprite = [{ id: basename(sprite), url: resolveUrl(baseUrl, sprite) }];
		} else {
			style.sprite = sprite.map(({ id, url }) => ({ id, url: resolveUrl(baseUrl, url) }));
		}

		const source = style.sources[this.#sourceName];
		if ('tiles' in source) source.tiles = tiles.map((url) => resolveUrl(baseUrl, url));
		if ('bounds' in source) source.bounds = bounds;

		return style;
	}

	public getColors(colors: StyleBuilderColors): StyleBuilderColors<Color> {
		const entriesString = Object.entries(colors) as [keyof StyleBuilderColors, string | Color][];
		const result = Object.fromEntries(
			entriesString.map(([key, value]) => [key, Color.parse(value)])
		) as StyleBuilderColors<Color>;
		return result;
	}

	public getDefaultOptions(): Required<StyleBuilderOptions> {
		return {
			// @ts-expect-error globalThis may be undefined in some environments
			baseUrl: globalThis?.document?.location?.origin ?? 'https://tiles.versatiles.org',
			bounds: [-180, -85.0511287798066, 180, 85.0511287798066],
			glyphs: '/assets/glyphs/{fontstack}/{range}.pbf',
			sprite: [{ id: 'basics', url: '/assets/sprites/basics/sprites' }],
			tiles: ['/tiles/osm/{z}/{x}/{y}'],
			hideLabels: false,
			language: '',
			colors: deepClone(this.defaultColors),
			fonts: deepClone(this.defaultFonts),
			recolor: getDefaultRecolorFlags(),
		};
	}

	protected transformDefaultColors(callback: (color: Color) => Color): void {
		const colors = this.getColors(this.defaultColors);
		for (const key of styleBuilderColorKeys) {
			this.defaultColors[key] = callback(colors[key]);
		}
	}

	protected abstract getStyleRules(options: StyleRulesOptions): StyleRules;
}

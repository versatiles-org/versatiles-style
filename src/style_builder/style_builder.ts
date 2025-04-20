import { Color } from '../color/index.js';
import { getTilesetsTemplate, getTilesetsLayers } from '../tilesets/index.js';
import { decorate } from './decorator.js';
import { CachedRecolor, getDefaultRecolorFlags } from './recolor.js';
import { basename, deepClone, resolveUrl } from '../lib/utils.js';
import type { MaplibreLayer, MaplibreLayerDefinition, StyleSpecification } from '../types/maplibre.js';
import type { StyleBuilderColors, StyleBuilderColorsEnsured, StyleBuilderFonts, StyleBuilderOptions } from './types.js';
import type { StyleRules, StyleRulesOptions } from './types.js';
import { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';



// StyleBuilder class definition
export abstract class StyleBuilder {

	public abstract readonly name: string;

	public abstract readonly defaultColors: StyleBuilderColors;

	public abstract readonly defaultFonts: StyleBuilderFonts;

	public build(options?: StyleBuilderOptions): StyleSpecification {

		options ??= {};

		const baseUrl = options.baseUrl ?? globalThis?.document?.location?.origin ?? 'https://tiles.versatiles.org';
		const glyphs = options.glyphs ?? '/assets/glyphs/{fontstack}/{range}.pbf';

		const sprite: SpriteSpecification = options.sprite ?? [{ id: 'basics', url: '/assets/sprites/basics/sprites' }];

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const tiles = options.tiles ?? ['/tiles/osm/{z}/{x}/{y}']; // wtf, there are different sources...
		
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const bounds = options.bounds ?? [-180, -85.0511287798066, 180, 85.0511287798066];
		
		const hideLabels = options.hideLabels ?? false;
		const language = options.language ?? null;
		const recolorOptions = options.recolor ?? getDefaultRecolorFlags();

		const colors = this.getColors(this.defaultColors);
		if (options.colors) {
			let key: keyof StyleBuilderColorsEnsured;
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

		// get empty style
		const style = getTilesetsTemplate();

		const styleRuleOptions: StyleRulesOptions = {
			colors,
			fonts,
			language,
		};

		// get layer style rules from child class
		const layerStyleRules = this.getStyleRules(styleRuleOptions);

		// get layers
		const layerDefinitions: MaplibreLayerDefinition[] = getTilesetsLayers({ language });
		let layers: MaplibreLayer[] = layerDefinitions.map(layer => {
			switch (layer.type) {
				case 'background':
				case 'fill':
				case 'line':
				case 'symbol':
					return layer;
					break;
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

		for (const source of Object.values(style.sources)) {
			if ('tiles' in source) source.tiles = source.tiles?.map(url => resolveUrl(baseUrl, new URL(url, 'https://example.org').pathname));
			// if ('tiles' in source) source.tiles = source.tiles.map(url => resolveUrl(baseUrl, basename(url))); // HERE
			// if ('bounds' in source) source.bounds = bounds; // why is this overridden? bounds might be different by source
		}

		// find used sources
		const usedSources = style.layers.filter(layer => (layer.type !== "background")).reduce((sources, layer) => {
			if ('source' in layer) sources.add(layer.source);
			return sources;
		}, new Set());

		// remove unused sources
		style.sources = Object.entries(style.sources).reduce((sources, [id, source]) => {
			if (usedSources.has(id)) sources[id] = source;
			return sources;
		}, {} as Record<string, typeof style.sources[string]>);

		return style;
	}

	public getColors(colors: StyleBuilderColors): StyleBuilderColorsEnsured {
		const entriesString = Object.entries(colors) as [keyof StyleBuilderColors, string | Color][];
		const result = Object.fromEntries(entriesString.map(([key, value]) => [key, Color.parse(value)])) as StyleBuilderColorsEnsured;
		return result;
	}

	public getDefaultOptions(): StyleBuilderOptions {
		return {
			baseUrl: '',
			bounds: [
				-180,
				-85.0511287798066,
				180,
				85.0511287798066
			],
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
		let key: keyof StyleBuilderColorsEnsured;
		for (key in colors) {
			this.defaultColors[key] = callback(colors[key]);
		}
	}

	protected abstract getStyleRules(options: StyleRulesOptions): StyleRules;
}

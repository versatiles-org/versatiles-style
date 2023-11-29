import Color from 'color';
import getShortbreadTemplate from './shortbread/template.js';
import getShortbreadLayers from './shortbread/layers.js';
import { decorate } from './decorator.js';
import { getDefaultRecolorFlags, recolor } from './recolor.js';
import { deepClone } from './utils.js';
import type {
	MaplibreLayer,
	MaplibreLayerDefinition,
	MaplibreStyle,
	StyleRules,
	StyleRulesOptions,
	StylemakerColorKeys,
	StylemakerColorStrings,
	StylemakerColors,
	StylemakerFontStrings,
	StylemakerOptions,
} from './types.js';

// Stylemaker class definition
export default abstract class StyleBuilder<Subclass extends StyleBuilder<Subclass>> {
	readonly #sourceName = 'versatiles-shortbread';

	public abstract readonly name: string;

	public abstract readonly defaultColors: StylemakerColorStrings<Subclass>;

	public abstract readonly defaultFonts: StylemakerFontStrings<Subclass>;

	public build(options?: StylemakerOptions<Subclass>): MaplibreStyle {

		options ??= {};

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const baseUrl = options.baseUrl ?? globalThis?.document?.location?.href ?? 'https://tiles.versatiles.org';
		const glyphs = options.glyphs ?? '/assets/fonts/{fontstack}/{range}.pbf';

		const sprite = options.sprite ?? '/assets/sprites/sprites';
		const tiles = options.tiles ?? ['/tiles/osm/{z}/{x}/{y}'];
		const hideLabels = options.hideLabels ?? false;
		const languageSuffix = options.languageSuffix ?? '';
		const recolorOptions = options.recolor ?? getDefaultRecolorFlags();

		const colors = this.getColors(this.defaultColors);
		if (options.colors) {
			for (const key in options.colors) colors[key] = Color(options.colors[key]);
		}

		// transform colors
		recolor(colors, recolorOptions);

		const fonts = deepClone(this.defaultColors);
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
			fonts: deepClone(this.defaultFonts),
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
		layers = decorate(layers, layerStyleRules);

		// hide labels, if wanted
		if (hideLabels) layers = layers.filter(l => l.type !== 'symbol');

		style.layers = layers;
		style.name = 'versatiles-' + this.name.toLowerCase();
		style.glyphs = resolveUrl(baseUrl, glyphs);
		style.sprite = resolveUrl(baseUrl, sprite);

		const source = style.sources[this.#sourceName];
		if ('tiles' in source) source.tiles = tiles.map(url => resolveUrl(baseUrl, url));

		return style;

		function resolveUrl(base: string, url: string): string {
			if (!Boolean(base)) return url;
			url = new URL(url, base).href;
			url = url.replace(/%7B/gi, '{');
			url = url.replace(/%7D/gi, '}');
			return url;
		}
	}

	public getColors(colors: StylemakerColorStrings<Subclass>): StylemakerColors<Subclass> {
		const entriesString = Object.entries(colors) as [StylemakerColorKeys<Subclass>, StylemakerColorStrings<Subclass>][];
		const entriesColor = entriesString.map(([key, value]) => [key, Color(value)]) as [StylemakerColorKeys<Subclass>, StylemakerColors<Subclass>][];
		const result = Object.fromEntries(entriesColor) as StylemakerColors<Subclass>;
		return result;
	}

	protected transformDefaultColors(callback: (color: Color) => Color): void {
		const colors = this.getColors(this.defaultColors);
		for (const key in colors) {
			this.defaultColors[key] = callback(colors[key]).hexa();
		}
	}

	protected abstract getStyleRules(options: StyleRulesOptions<Subclass>): StyleRules;
}

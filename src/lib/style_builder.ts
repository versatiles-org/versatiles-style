import Color from 'color';
import getShortbreadTemplate from './shortbread/template.js';
import getShortbreadLayers from './shortbread/layers.js';
import { decorate } from './decorator.js';
import { getDefaultRecolorFlags, recolor } from './recolor.js';
import type {
	LanguageSuffix,
	MaplibreLayer,
	MaplibreLayerDefinition,
	MaplibreStyle,
	RecolorOptions,
	StyleRules,
	StyleRulesOptions,
	StylemakerColorKeys,
	StylemakerColorStrings,
	StylemakerColors,
	StylemakerFontStrings,
	StylemakerFonts,
} from './types.js';
import { deepClone } from './utils.js';

// Stylemaker class definition
export default abstract class StyleBuilder<Subclass extends StyleBuilder<Subclass>> {
	public baseUrl: string;

	public glyphsUrl = '/assets/fonts/{fontstack}/{range}.pbf';

	public spriteUrl = '/assets/sprites/sprites';

	public tilesUrls: string[] = ['/tiles/osm/{z}/{x}/{y}'];

	public hideLabels = false;

	public languageSuffix: LanguageSuffix = '';

	public recolor: RecolorOptions = getDefaultRecolorFlags();

	readonly #sourceName = 'versatiles-shortbread';

	public abstract readonly name: string;

	public abstract readonly defaultColors: StylemakerColorStrings<Subclass>;

	public abstract readonly defaultFonts: StylemakerFontStrings<Subclass>;

	// Constructor
	public constructor() {
		try {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			this.baseUrl = document?.location?.href;
		} catch (e) { }
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		this.baseUrl ??= 'https://tiles.versatiles.org';

	}

	public get colors(): StylemakerColors<Subclass> {
		const entriesString = Object.entries(this.defaultColors) as [StylemakerColorKeys<Subclass>, StylemakerColorStrings<Subclass>][];
		const entriesColor = entriesString.map(([key, value]) => [key, Color(value)]) as [StylemakerColorKeys<Subclass>, StylemakerColors<Subclass>][];
		const result = Object.fromEntries(entriesColor) as StylemakerColors<Subclass>;
		return result;
	}

	public get fonts(): StylemakerFonts<Subclass> {
		return deepClone(this.defaultFonts) as StylemakerFonts<Subclass>;
	}

	public build(): MaplibreStyle {
		// get empty shortbread style
		const style: MaplibreStyle = getShortbreadTemplate();

		const { colors } = this;

		// transform colors
		recolor(colors, this.recolor);

		const styleRuleOptions: StyleRulesOptions<typeof this> = {
			colors,
			fonts: this.fonts,
			languageSuffix: this.languageSuffix,
		};

		// get layer style rules from child class
		const layerStyleRules = this.getStyleRules(styleRuleOptions);

		// get shortbread layers
		const layerDefinitions: MaplibreLayerDefinition[] = getShortbreadLayers({ languageSuffix: this.languageSuffix });
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
		if (this.hideLabels) layers = layers.filter(l => l.type !== 'symbol');

		style.layers = layers;
		style.name = 'versatiles-' + this.name;
		style.glyphs = resolveUrl(this.baseUrl, this.glyphsUrl);
		style.sprite = resolveUrl(this.baseUrl, this.spriteUrl);

		const source = style.sources[this.#sourceName];
		if ('tiles' in source) source.tiles = this.tilesUrls.map(url => resolveUrl(this.baseUrl, url));

		return style;

		function resolveUrl(baseUrl: string, url: string): string {
			if (!Boolean(baseUrl)) return url;
			url = new URL(url, baseUrl).href;
			url = url.replace(/%7B/gi, '{');
			url = url.replace(/%7D/gi, '}');
			return url;
		}
	}

	protected transformDefaultColors(callback: (color: Color) => Color): void {
		const { colors } = this;
		for (const key in colors) {
			this.defaultColors[key] = callback(colors[key]).hexa();
		}
	}

	protected abstract getStyleRules(options: StyleRulesOptions<Subclass>): StyleRules;
}

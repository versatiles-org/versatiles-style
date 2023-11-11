import Color from 'color';
import getShortbreadTemplate from './shortbread/template.js';
import type { MaplibreLayer } from './shortbread/layers.js';
import getShortbreadLayers from './shortbread/layers.js';
import { decorate } from './decorator.js';
import type { RecolorOptions } from './recolor.js';
import { getDefaultRecolorFlags, recolor } from './recolor.js';
import type { Style } from 'mapbox-gl';

export type MaplibreStyle = Style;
export type StyleRuleValue = boolean | number | object | string;
export type StyleRule = Record<string, StyleRuleValue>;
export type StyleRules = Record<string, StyleRule>;
export type StylemakerColorLookup = Record<string, Color>;
export type StylemakerStringLookup = Record<string, string>;
export type LanguageSuffix = '_de' | '_en' | '';
export interface StyleRulesOptions {
	colors: StylemakerColorLookup;
	fonts: StylemakerStringLookup;
	languageSuffix: string;
}


// Stylemaker class definition
export default abstract class StyleBuilder {
	public baseUrl: string;

	public glyphsUrl = '/assets/fonts/{fontstack}/{range}.pbf';

	public spriteUrl = '/assets/sprites/sprites';

	public tilesUrls: string[] = ['/tiles/osm/{z}/{x}/{y}'];

	public hideLabels = false;

	public languageSuffix: LanguageSuffix = '';

	public recolor: RecolorOptions = getDefaultRecolorFlags();

	readonly #sourceName = 'versatiles-shortbread';

	public abstract readonly name: string;

	public abstract fonts: Record<string, string>;

	public abstract colors: Record<string, string>;

	// Constructor
	public constructor() {
		try {
			// @ts-expect-error: I'm not sure if I'm in a browser
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			this.baseUrl = document.location.href as string;
		} catch (e) {
			this.baseUrl = 'https://tiles.versatiles.org'; // set me in the browser
		}
	}

	public build(): MaplibreStyle {
		// get empty shortbread style
		const style: MaplibreStyle = getShortbreadTemplate();

		const colors: StylemakerColorLookup = Object.fromEntries(
			Object.entries(this.colors)
				.map(([name, colorString]) => [name, Color(colorString)]),
		);

		// transform colors
		recolor(colors, this.recolor);

		// get layer style rules from child class
		const layerStyleRules = this.getStyleRules({
			colors,
			fonts: this.fonts,
			languageSuffix: this.languageSuffix,
		});

		// get shortbread layers
		let layers: MaplibreLayer[] = getShortbreadLayers({ languageSuffix: this.languageSuffix });

		// apply layer rules
		layers = decorate(layers, layerStyleRules);

		// hide labels, if wanted
		if (this.hideLabels) layers = layers.filter(l => l.type !== 'symbol');

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

	protected resetColors(callback: (color: Color) => Color): void {
		const colors: StylemakerStringLookup = Object.fromEntries(
			Object.entries(this.colors)
				.map(([name, color]) => [name, callback(Color(color)).hexa()]),
		);
		this.colors = colors;
	}

	protected abstract getStyleRules(opt: StyleRulesOptions): StyleRules;
}

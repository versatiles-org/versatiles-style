import type { Palette, ResolvedTheme } from './theme.js';
import { resolveTheme } from './theme.js';
import type { ColorsOptions, ResolvedColors } from './colors.js';
import { resolveColors } from './colors.js';
import type { RecolorOptions, ResolvedRecolorOptions } from './recolor.js';
import { resolveRecolor } from './recolor.js';
import type { TextOptions, ResolvedText } from './text.js';
import { resolveText } from './text.js';
import type { LayoutOptions, ResolvedLayout } from './layout.js';
import { resolveLayout } from './layout.js';
import type { OsmFeaturesOptions, ResolvedOsmFeatures } from './features.js';
import { resolveOsmFeatures } from './features.js';
import type { SunOptions, ResolvedSun } from './sun.js';
import { resolveSun } from './sun.js';
import type { SkyOptions, ResolvedSky } from './sky.js';
import { resolveSky } from './sky.js';
import type { LayerGroupOptions } from './layer-groups.js';
import type { OsmUrlsOptions, ResolvedUrls } from './urls.js';
import { resolveBase, resolveOsmUrls } from './urls.js';

export type OsmContentOptions = {
	theme?:
		| Palette
		| {
				darkMode?: boolean | 'auto';
				palette?: Palette;
		  };
	layers?: LayerGroupOptions;
	text?: TextOptions;
	layout?: LayoutOptions;
	colors?: ColorsOptions;
	recolor?: RecolorOptions;
};

export type OsmOptions = OsmContentOptions & {
	urls?: OsmUrlsOptions;
	features?: OsmFeaturesOptions;
	sun?: SunOptions;
	sky?: SkyOptions;
};

export type ResolvedOsmOptions = {
	urls: ResolvedUrls;
	features: ResolvedOsmFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	theme: ResolvedTheme;
	layers: LayerGroupOptions;
	text: ResolvedText;
	layout: ResolvedLayout;
	colors: ResolvedColors;
	recolor: ResolvedRecolorOptions;
};

export function resolveOsmContentOptions(content: OsmContentOptions, urls: ResolvedUrls): ResolvedOsmOptions {
	const theme = resolveTheme(content.theme);
	return {
		urls,
		features: { terrain: false, hillshade: false, landcover: false, buildings: 'flat' },
		sun: resolveSun(),
		sky: resolveSky(),
		theme,
		layers: content.layers ?? {},
		text: resolveText(content.text),
		layout: resolveLayout(content.layout),
		colors: resolveColors(theme, content.colors),
		recolor: resolveRecolor(content.recolor),
	};
}

export function resolveOsmOptions(options?: OsmOptions): ResolvedOsmOptions {
	const base = resolveBase(options?.urls?.base);
	const urls = resolveOsmUrls(base, options?.urls);
	const theme = resolveTheme(options?.theme);

	return {
		urls,
		features: resolveOsmFeatures(options?.features),
		sun: resolveSun(options?.sun),
		sky: resolveSky(options?.sky),
		theme,
		layers: options?.layers ?? {},
		text: resolveText(options?.text),
		layout: resolveLayout(options?.layout),
		colors: resolveColors(theme, options?.colors),
		recolor: resolveRecolor(options?.recolor),
	};
}

import { resolveTheme } from './theme.js';
import { resolveColors } from './colors.js';
import { resolveRecolor } from './recolor.js';
import { resolveText } from './text.js';
import { resolveLayout } from './layout.js';
import type { OsmFeaturesOptions, ResolvedOsmFeatures } from './features.js';
import { resolveOsmFeatures } from './features.js';
import type { SunOptions, ResolvedSun } from './sun.js';
import { resolveSun } from './sun.js';
import type { SkyOptions, ResolvedSky } from './sky.js';
import { resolveSky } from './sky.js';
import type { OsmUrlsOptions, ResolvedOsmUrls } from './urls.js';
import { resolveOsmUrls } from './urls.js';
import { OsmOverlayOptions, ResolvedOsmOverlayOptions } from './osm-overlay.js';
import { resolveLayerGroups } from './layer-groups.js';

export type OsmOptions = OsmOverlayOptions & {
	urls?: OsmUrlsOptions;
	features?: OsmFeaturesOptions;
	sun?: SunOptions;
	sky?: SkyOptions;
};

export type ResolvedOsmOptions = ResolvedOsmOverlayOptions & {
	urls: ResolvedOsmUrls;
	features: ResolvedOsmFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
};

export function resolveOsmOptions(options?: OsmOptions): ResolvedOsmOptions {
	const theme = resolveTheme(options?.theme);

	return {
		urls: resolveOsmUrls(options?.urls),
		features: resolveOsmFeatures(options?.features),
		sun: resolveSun(options?.sun),
		sky: resolveSky(options?.sky),
		theme,
		layers: resolveLayerGroups(options?.layers),
		text: resolveText(options?.text),
		layout: resolveLayout(options?.layout),
		colors: resolveColors(theme, options?.colors),
		recolor: resolveRecolor(options?.recolor),
	};
}

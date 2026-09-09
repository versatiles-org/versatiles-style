import {
	resolveColors,
	resolveLayerGroups,
	resolveLayout,
	resolveOsmFeatures,
	resolveProjection,
	resolveRecolor,
	resolveSky,
	resolveSun,
	resolveText,
	resolveTheme,
	resolveOsmUrls,
	type OsmFeaturesOptions,
	type OsmUrlsOptions,
	type ProjectionOptions,
	type ResolvedOsmFeatures,
	type ResolvedOsmUrls,
	type ResolvedProjection,
	type ResolvedSky,
	type ResolvedSun,
	type SkyOptions,
	type SunOptions,
} from './parts.js';
import { OsmOverlayOptions, ResolvedOsmOverlay } from './osm-overlay.js';

export type OsmOptions = OsmOverlayOptions & {
	urls?: OsmUrlsOptions;
	features?: OsmFeaturesOptions;
	sun?: SunOptions;
	sky?: boolean | SkyOptions;
	projection?: ProjectionOptions;
};

export type ResolvedOsm = ResolvedOsmOverlay & {
	urls: ResolvedOsmUrls;
	features: ResolvedOsmFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	projection: ResolvedProjection;
};

export function resolveOsm(options?: OsmOptions): ResolvedOsm {
	const theme = resolveTheme(options?.theme);
	const colors = resolveColors(theme, options?.colors);

	return {
		urls: resolveOsmUrls(options?.urls),
		features: resolveOsmFeatures(options?.features),
		sun: resolveSun(options?.sun),
		sky: resolveSky(options?.sky, { skyColor: colors.water, horizonColor: colors.background }),
		projection: resolveProjection(options?.projection),
		theme,
		layers: resolveLayerGroups(options?.layers),
		text: resolveText(options?.text),
		layout: resolveLayout(options?.layout),
		colors,
		recolor: resolveRecolor(options?.recolor),
	};
}

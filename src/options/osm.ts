import { checkKeys } from './keys.js';
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
	checkKeys(
		options,
		{
			theme: true,
			layers: true,
			text: true,
			layout: true,
			colors: true,
			recolor: true,
			urls: true,
			features: true,
			sun: true,
			sky: true,
			projection: true,
		},
		'osm'
	);
	const theme = resolveTheme(options?.theme, undefined, 'osm.theme');
	const colors = resolveColors(theme, options?.colors, 'osm.colors');

	return {
		urls: resolveOsmUrls(options?.urls, 'osm.urls'),
		features: resolveOsmFeatures(options?.features, 'osm.features'),
		sun: resolveSun(options?.sun, 'osm.sun'),
		sky: resolveSky(options?.sky, 'osm.sky'),
		projection: resolveProjection(options?.projection),
		theme,
		layers: resolveLayerGroups(options?.layers, 'osm.layers'),
		text: resolveText(options?.text, 'osm.text'),
		layout: resolveLayout(options?.layout, 'osm.layout'),
		colors,
		recolor: resolveRecolor(options?.recolor, 'osm.recolor'),
	};
}

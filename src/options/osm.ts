import {
	checkKeys,
	resolveColors,
	resolveLayerGroups,
	resolveIcon,
	resolveOsmFeatures,
	resolveProjection,
	resolveRecolor,
	resolveSky,
	resolveLight,
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
	type ResolvedLight,
	type SkyOptions,
	type LightOptions,
	type SunOptions,
} from './parts/index.js';
import { OsmOverlayOptions, ResolvedOsmOverlay } from './osm-overlay.js';
import { getLinePreset } from '../themes/index.js';

export type OsmOptions = OsmOverlayOptions & {
	urls?: OsmUrlsOptions;
	features?: OsmFeaturesOptions;
	light?: LightOptions;
	/** @deprecated Use `light`; read as `light` until v7. */
	sun?: SunOptions;
	sky?: boolean | SkyOptions;
	projection?: ProjectionOptions;
};

export type ResolvedOsm = ResolvedOsmOverlay & {
	urls: ResolvedOsmUrls;
	features: ResolvedOsmFeatures;
	light: ResolvedLight;
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
			icon: true,
			colors: true,
			recolor: true,
			urls: true,
			features: true,
			light: true,
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
		light: resolveLight(options?.light, options?.sun, 'osm'),
		sky: resolveSky(options?.sky, 'osm.sky'),
		projection: resolveProjection(options?.projection),
		theme,
		layers: resolveLayerGroups(options?.layers, 'osm.layers', getLinePreset(theme)),
		text: resolveText(options?.text, 'osm.text'),
		icon: resolveIcon(options?.icon, 'osm.icon'),
		colors,
		recolor: resolveRecolor(options?.recolor, 'osm.recolor'),
	};
}

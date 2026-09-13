import { checkKeys } from './keys.js';
import {
	resolveColors,
	resolveLayerGroups,
	resolveLayout,
	resolveProtomapsFeatures,
	resolveProjection,
	resolveRecolor,
	resolveSky,
	resolveSun,
	resolveText,
	resolveTheme,
	resolveProtomapsUrls,
	type ProtomapsFeaturesOptions,
	type ProtomapsUrlsOptions,
	type ProjectionOptions,
	type ResolvedProtomapsFeatures,
	type ResolvedProtomapsUrls,
	type ResolvedProjection,
	type ResolvedSky,
	type ResolvedSun,
	type SkyOptions,
	type SunOptions,
} from './parts.js';
import { OsmOverlayOptions, ResolvedOsmOverlay } from './osm-overlay.js';

/**
 * Options for `protomaps()`.
 *
 * SCHEMA-SUPPORT-PLAN.md §19 predicted that per-schema group trees would make `ProtomapsOptions` and
 * `OsmOptions` diverge and multiply the work for downstream UI tools. In the event they differ in
 * exactly two places, and the shared part — `theme`, `colors`, `recolor`, `layout`, `text`, `layers`,
 * `sun`, `sky`, `projection` — is identical, because the option vocabulary names concepts rather than
 * layers (§2):
 *
 *  - `urls.omt` replaces `urls.osm`, and does not default relative to `base` (§5.5);
 *  - `features` has no `landcover`, which is a Shortbread tileset extension.
 *
 * The `layers` tree is the *same* tree. Every one of the 39 groups Shortbread controls is expressible
 * against OpenMapTiles once piers are drawn from `transportation`; only the `icons` alias differs, and
 * that is derived rather than declared.
 */
export type ProtomapsOptions = OsmOverlayOptions & {
	urls?: ProtomapsUrlsOptions;
	features?: ProtomapsFeaturesOptions;
	sun?: SunOptions;
	sky?: boolean | SkyOptions;
	projection?: ProjectionOptions;
};

export type ResolvedProtomaps = ResolvedOsmOverlay & {
	urls: ResolvedProtomapsUrls;
	features: ResolvedProtomapsFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	projection: ResolvedProjection;
};

export function resolveProtomaps(options?: ProtomapsOptions): ResolvedProtomaps {
	// Its own static, type-derived whitelist, as each schema has (§5.1.3).
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
		'protomaps'
	);
	const theme = resolveTheme(options?.theme, undefined, 'protomaps.theme');
	const colors = resolveColors(theme, options?.colors, 'protomaps.colors');

	return {
		urls: resolveProtomapsUrls(options?.urls, 'protomaps.urls'),
		features: resolveProtomapsFeatures(options?.features, 'protomaps.features'),
		sun: resolveSun(options?.sun, 'protomaps.sun'),
		sky: resolveSky(options?.sky, 'protomaps.sky'),
		projection: resolveProjection(options?.projection),
		theme,
		layers: resolveLayerGroups(options?.layers, 'protomaps.layers'),
		text: resolveText(options?.text, 'protomaps.text'),
		layout: resolveLayout(options?.layout, 'protomaps.layout'),
		colors,
		recolor: resolveRecolor(options?.recolor, 'protomaps.recolor'),
	};
}

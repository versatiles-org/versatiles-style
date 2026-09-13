import { checkKeys } from './keys.js';
import {
	resolveColors,
	resolveLayerGroups,
	resolveLayout,
	resolveOmtFeatures,
	resolveProjection,
	resolveRecolor,
	resolveSky,
	resolveSun,
	resolveText,
	resolveTheme,
	resolveOmtUrls,
	type OmtFeaturesOptions,
	type OmtUrlsOptions,
	type ProjectionOptions,
	type ResolvedOmtFeatures,
	type ResolvedOmtUrls,
	type ResolvedProjection,
	type ResolvedSky,
	type ResolvedSun,
	type SkyOptions,
	type SunOptions,
} from './parts.js';
import { OsmOverlayOptions, ResolvedOsmOverlay } from './osm-overlay.js';

/**
 * Options for `omt()`.
 *
 * SCHEMA-SUPPORT-PLAN.md §19 predicted that per-schema group trees would make `OmtOptions` and
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
export type OmtOptions = OsmOverlayOptions & {
	urls?: OmtUrlsOptions;
	features?: OmtFeaturesOptions;
	sun?: SunOptions;
	sky?: boolean | SkyOptions;
	projection?: ProjectionOptions;
};

export type ResolvedOmt = ResolvedOsmOverlay & {
	urls: ResolvedOmtUrls;
	features: ResolvedOmtFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	projection: ResolvedProjection;
};

export function resolveOmt(options?: OmtOptions): ResolvedOmt {
	// Its own static, type-derived whitelist — the "cannot drift" guarantee of `checkKeys`, kept per
	// schema rather than weakened into one list that has to be right for all of them (§5.1.3).
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
		'omt'
	);
	const theme = resolveTheme(options?.theme, undefined, 'omt.theme');
	const colors = resolveColors(theme, options?.colors, 'omt.colors');

	return {
		urls: resolveOmtUrls(options?.urls, 'omt.urls'),
		features: resolveOmtFeatures(options?.features, 'omt.features'),
		sun: resolveSun(options?.sun, 'omt.sun'),
		sky: resolveSky(options?.sky, 'omt.sky'),
		projection: resolveProjection(options?.projection),
		theme,
		layers: resolveLayerGroups(options?.layers, 'omt.layers'),
		text: resolveText(options?.text, 'omt.text'),
		layout: resolveLayout(options?.layout, 'omt.layout'),
		colors,
		recolor: resolveRecolor(options?.recolor, 'omt.recolor'),
	};
}

import {
	checkKeys,
	resolveProjection,
	resolveSatelliteFeatures,
	resolveSatelliteRaster,
	resolveSatelliteUrls,
	resolveSky,
	resolveSun,
	type ProjectionOptions,
	type ResolvedProjection,
	type ResolvedSatelliteFeatures,
	type ResolvedSatelliteRaster,
	type ResolvedSatelliteUrls,
	type ResolvedSky,
	type ResolvedSun,
	type SatelliteFeaturesOptions,
	type SatelliteRasterOptions,
	type SatelliteUrlsOptions,
	type SkyOptions,
	type SunOptions,
} from './parts/';
import {
	resolveOsmOverlay,
	OVERLAY_DEFAULTS,
	OVERLAY_LABEL_STYLES,
	type OsmOverlayOptions,
	type ResolvedOsmOverlay,
} from './osm-overlay.js';

export type SatelliteOptions = {
	urls?: SatelliteUrlsOptions;
	/**
	 * The OSM vector overlay over the imagery. `true` (the default) uses the overlay's own
	 * defaults, `false` disables it, an object configures it — the same shape as `features.terrain`
	 * and `features.hillshade`.
	 */
	osmOverlay?: boolean | OsmOverlayOptions;
	raster?: SatelliteRasterOptions;
	features?: SatelliteFeaturesOptions;
	sun?: SunOptions;
	sky?: boolean | SkyOptions;
	projection?: ProjectionOptions;
};

export type ResolvedSatellite = {
	urls: ResolvedSatelliteUrls;
	features: ResolvedSatelliteFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	projection: ResolvedProjection;
	osmOverlay: false | ResolvedOsmOverlay;
	raster: ResolvedSatelliteRaster;
};

/**
 * The overlay's imagery colours, with the caller's own values layered on top so an explicit
 * `colors.label` still wins. Its label styles are not merged here but passed as the defaults of
 * `text` (`OVERLAY_LABEL_STYLES`), so a caller who sets one topic keeps the overlay's others.
 * See `features/satellite-overlay.ts`.
 */
function overlayDefaults(overlay: boolean | OsmOverlayOptions | undefined): OsmOverlayOptions {
	const o = typeof overlay === 'object' ? overlay : {};
	return {
		...o,
		colors: { ...OVERLAY_DEFAULTS.colors, ...o.colors },
	};
}

export function resolveSatellite(options?: SatelliteOptions): ResolvedSatellite {
	checkKeys(
		options,
		{ urls: true, osmOverlay: true, raster: true, features: true, sun: true, sky: true, projection: true },
		'satellite'
	);
	// The overlay is on unless explicitly disabled: a bare `satellite()` gives a usable map rather
	// than bare imagery, matching v5. Only `false` turns it off — `undefined` must not be treated
	// as `false`, which is the defect that shipped `satellite/style` with no labels.
	const overlay = options?.osmOverlay;
	// v5 built the satellite overlay from `graybeard`; `gray` is its successor and the least
	// saturated palette, so roads and labels stay out of the imagery's way. An explicit
	// `osmOverlay.theme` still wins.
	const osmOverlay =
		overlay === false
			? false
			: resolveOsmOverlay(overlayDefaults(overlay), 'gray', 'satellite.osmOverlay', OVERLAY_LABEL_STYLES);

	return {
		urls: resolveSatelliteUrls(options?.urls, 'satellite.urls'),
		features: resolveSatelliteFeatures(options?.features, 'satellite.features'),
		sun: resolveSun(options?.sun, 'satellite.sun'),
		sky: resolveSky(options?.sky, 'satellite.sky'),
		projection: resolveProjection(options?.projection),
		raster: resolveSatelliteRaster(options?.raster, 'satellite.raster'),
		osmOverlay,
	};
}

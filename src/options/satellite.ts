import {
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
} from './parts.js';
import { resolveOsmOverlay, type OsmOverlayOptions, type ResolvedOsmOverlay } from './osm-overlay.js';
import { OVERLAY_DEFAULTS } from '../features/satellite-overlay.js';

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
 * The overlay's imagery defaults, with the caller's own values layered on top so an explicit
 * `colors.label` or `text.fontNormal` still wins. See `features/satellite-overlay.ts`.
 */
function overlayDefaults(overlay: boolean | OsmOverlayOptions | undefined): OsmOverlayOptions {
	const o = typeof overlay === 'object' ? overlay : {};
	return {
		...o,
		colors: { ...OVERLAY_DEFAULTS.colors, ...o.colors },
		text: { ...OVERLAY_DEFAULTS.text, ...o.text },
	};
}

export function resolveSatellite(options?: SatelliteOptions): ResolvedSatellite {
	// The overlay is on unless explicitly disabled: a bare `satellite()` gives a usable map rather
	// than bare imagery, matching v5. Only `false` turns it off — `undefined` must not be treated
	// as `false`, which is the defect that shipped `satellite/style` with no labels.
	const overlay = options?.osmOverlay;
	// v5 built the satellite overlay from `graybeard`; `gray` is its successor and the least
	// saturated palette, so roads and labels stay out of the imagery's way. An explicit
	// `osmOverlay.theme` still wins.
	const osmOverlay = overlay === false ? false : resolveOsmOverlay(overlayDefaults(overlay), 'gray');

	return {
		urls: resolveSatelliteUrls(options?.urls),
		features: resolveSatelliteFeatures(options?.features),
		sun: resolveSun(options?.sun),
		// With an overlay the sky follows its palette, exactly as `osm()` does — otherwise a dark or
		// `toner` overlay got a bright sky-blue sky, the defect #126 fixed for `osm()` but not here.
		// Bare imagery has no palette to follow and keeps `resolveSky`'s generic sky blue.
		sky: resolveSky(
			options?.sky,
			osmOverlay === false
				? undefined
				: { skyColor: osmOverlay.colors.water, horizonColor: osmOverlay.colors.background }
		),
		projection: resolveProjection(options?.projection),
		raster: resolveSatelliteRaster(options?.raster),
		osmOverlay,
	};
}

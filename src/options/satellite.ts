import {
	checkKeys,
	describeValue,
	reportIssue,
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
} from './parts/index.js';
import {
	resolveOsmOverlay,
	OVERLAY_LABEL_STYLES,
	type OsmOverlayOptions,
	type ResolvedOsmOverlay,
} from './osm-overlay.js';

/**
 * The overlay's options: everything `osm()` takes for its cartography, plus what only makes sense over
 * imagery.
 */
export type SatelliteOverlayOptions = OsmOverlayOptions & {
	/**
	 * Dim borders and motorways with `line-layer-opacity` instead of `line-opacity`. Default `false`.
	 *
	 * `line-opacity` applies to every feature on its own, so where a line crosses itself — a border
	 * winding along a river at low zoom, a motorway's two carriageways — the overlap is blended twice
	 * and shows as a brighter spot. `line-layer-opacity` composites the finished layer once, so the
	 * line reads evenly. It costs an extra offscreen pass per layer, so it is applied to the three
	 * layers that overlap themselves most: `boundary-country`, `boundary-state` and `street-motorway`.
	 *
	 * **Only for MapLibre GL JS 6.0 or newer.** MapLibre Native (Android, iOS) does not implement the
	 * property and drops every layer that carries it — the map then has no borders or motorways
	 * (maplibre-native#4298). Leave it off for any style a native app may load.
	 */
	layerOpacity?: boolean;
};

export type ResolvedSatelliteOverlay = ResolvedOsmOverlay & { layerOpacity: boolean };

export type SatelliteOptions = {
	urls?: SatelliteUrlsOptions;
	/**
	 * The OSM vector overlay over the imagery. `true` (the default) uses the overlay's own
	 * defaults, `false` disables it, an object configures it — the same shape as `features.terrain`
	 * and `features.hillshade`.
	 */
	osmOverlay?: boolean | SatelliteOverlayOptions;
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
	osmOverlay: false | ResolvedSatelliteOverlay;
	raster: ResolvedSatelliteRaster;
};

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
	//
	// The overlay's imagery treatment rides on the theme rather than being merged in here: its label
	// colours are derived from the palette by `overlayLabelColors` and its label styles are passed as
	// the defaults of `text` (`OVERLAY_LABEL_STYLES`), so a caller who sets one topic keeps the
	// overlay's others. See `features/satellite-overlay.ts`.
	const osmOverlay = overlay === false ? false : resolveSatelliteOverlay(typeof overlay === 'object' ? overlay : {});
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

function resolveSatelliteOverlay(content: SatelliteOverlayOptions): ResolvedSatelliteOverlay {
	const path = 'satellite.osmOverlay';
	// Checked here rather than left to `resolveOsmOverlay`, so an unknown key is reported once and the
	// list of known keys it prints includes `layerOpacity`. Only the cartography keys are passed on.
	checkKeys(
		content,
		{ theme: true, layers: true, text: true, icon: true, colors: true, recolor: true, layerOpacity: true },
		path
	);
	const { theme, layers, text, icon, colors, recolor, layerOpacity } = content;
	if (layerOpacity !== undefined && typeof layerOpacity !== 'boolean') {
		reportIssue({ path: `${path}.layerOpacity`, message: `expected a boolean, got ${describeValue(layerOpacity)}` });
	}
	return {
		...resolveOsmOverlay({ theme, layers, text, icon, colors, recolor }, 'gray', path, OVERLAY_LABEL_STYLES),
		layerOpacity: layerOpacity === true,
	};
}

import type { SatelliteFeaturesOptions, ResolvedSatelliteFeatures } from './features.js';
import { resolveSatelliteFeatures } from './features.js';
import type { SunOptions, ResolvedSun } from './sun.js';
import { resolveSun } from './sun.js';
import type { SkyOptions, ResolvedSky } from './sky.js';
import { resolveSky } from './sky.js';
import type { SatelliteUrlsOptions, ResolvedSatelliteUrls } from './urls.js';
import { resolveSatelliteUrls } from './urls.js';
import {
	ResolvedSatelliteRasterOptions,
	resolveSatelliteRasterOptions,
	SatelliteRasterOptions,
} from './satellite-raster.js';
import { OsmOverlayOptions, ResolvedOsmOverlayOptions, resolveOsmOverlayOptions } from './osm-overlay.js';

export type SatelliteOptions = {
	urls?: SatelliteUrlsOptions;
	osmOverlay?: false | OsmOverlayOptions;
	raster?: SatelliteRasterOptions;
	features?: SatelliteFeaturesOptions;
	sun?: SunOptions;
	sky?: SkyOptions;
};

export type ResolvedSatelliteOptions = {
	urls: ResolvedSatelliteUrls;
	features: ResolvedSatelliteFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	osmOverlay: false | ResolvedOsmOverlayOptions;
	raster: ResolvedSatelliteRasterOptions;
};

export function resolveSatelliteOptions(options?: SatelliteOptions): ResolvedSatelliteOptions {
	const osmOverlay = !options?.osmOverlay ? false : resolveOsmOverlayOptions(options.osmOverlay);

	return {
		urls: resolveSatelliteUrls(options?.urls),
		features: resolveSatelliteFeatures(options?.features),
		sun: resolveSun(options?.sun),
		sky: resolveSky(options?.sky),
		raster: resolveSatelliteRasterOptions(options?.raster),
		osmOverlay,
	};
}

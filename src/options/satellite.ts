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
import { OsmContentOptions, ResolvedOsmContentOptions, resolveOsmContentOptions } from './osm-content.js';

export type SatelliteOptions = {
	urls?: SatelliteUrlsOptions;
	osmOverlay?: false | OsmContentOptions;
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
	osmOverlay: false | ResolvedOsmContentOptions;
	raster: ResolvedSatelliteRasterOptions;
};

export function resolveSatelliteOptions(options?: SatelliteOptions): ResolvedSatelliteOptions {
	const osmOverlay = !options?.osmOverlay ? false : resolveOsmContentOptions(options.osmOverlay);

	return {
		urls: resolveSatelliteUrls(options?.urls),
		features: resolveSatelliteFeatures(options?.features),
		sun: resolveSun(options?.sun),
		sky: resolveSky(options?.sky),
		raster: resolveSatelliteRasterOptions(options?.raster),
		osmOverlay,
	};
}

import type { SatelliteFeaturesOptions, ResolvedSatelliteFeatures } from './features.js';
import { resolveOsmFeatures } from './features.js';
import type { SunOptions, ResolvedSun } from './sun.js';
import { resolveSun } from './sun.js';
import type { SkyOptions, ResolvedSky } from './sky.js';
import { resolveSky } from './sky.js';
import type { SatelliteUrlsOptions, ResolvedSatelliteUrls } from './urls.js';
import { resolveSatelliteUrls } from './urls.js';
import type { OsmContentOptions, ResolvedOsmOptions } from './osm.js';
import { resolveOsmContentOptions } from './osm.js';

export type SatelliteOptions = {
	urls?: SatelliteUrlsOptions;
	osmOverlay?: false | OsmContentOptions;
	raster?: {
		opacity?: number;
		hueRotate?: number;
		brightnessMin?: number;
		brightnessMax?: number;
		saturation?: number;
		contrast?: number;
	};
	features?: SatelliteFeaturesOptions;
	sun?: SunOptions;
	sky?: SkyOptions;
};

export type ResolvedSatelliteOptions = {
	urls: ResolvedSatelliteUrls;
	features: ResolvedSatelliteFeatures;
	sun: ResolvedSun;
	sky: ResolvedSky;
	osmOverlay: false | ResolvedOsmOptions;
	raster: Required<NonNullable<SatelliteOptions['raster']>>;
};

export function resolveSatelliteOptions(options?: SatelliteOptions): ResolvedSatelliteOptions {
	const urls = resolveSatelliteUrls(options?.urls);

	const features = {
		terrain: resolveOsmFeatures({ terrain: options?.features?.terrain }).terrain,
		hillshade: resolveOsmFeatures({ hillshade: options?.features?.hillshade }).hillshade,
	};

	const raster = {
		opacity: options?.raster?.opacity ?? 1,
		hueRotate: options?.raster?.hueRotate ?? 0,
		brightnessMin: options?.raster?.brightnessMin ?? 0,
		brightnessMax: options?.raster?.brightnessMax ?? 1,
		saturation: options?.raster?.saturation ?? 0,
		contrast: options?.raster?.contrast ?? 0,
	};

	const osmUrls = {
		osm: urls.osm,
		elevation: urls.elevation,
		glyphsPattern: urls.glyphsPattern,
		sprite: urls.sprite,
		fetch: urls.fetch,
	};

	const osmOverlay =
		options?.osmOverlay === false || options?.osmOverlay == null
			? false
			: resolveOsmContentOptions(options.osmOverlay, osmUrls);

	return {
		urls,
		features,
		sun: resolveSun(options?.sun),
		sky: resolveSky(options?.sky),
		raster,
		osmOverlay,
	};
}

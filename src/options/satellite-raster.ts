import { checkKeys } from './keys.js';
export type SatelliteRasterOptions = {
	opacity?: number;
	hueRotate?: number;
	brightnessMin?: number;
	brightnessMax?: number;
	saturation?: number;
	contrast?: number;
};

export type ResolvedSatelliteRaster = Required<SatelliteRasterOptions>;

export function resolveSatelliteRaster(options?: SatelliteRasterOptions, path = 'raster'): ResolvedSatelliteRaster {
	checkKeys(
		options,
		{ opacity: true, hueRotate: true, brightnessMin: true, brightnessMax: true, saturation: true, contrast: true },
		path
	);
	return {
		opacity: options?.opacity ?? 1,
		hueRotate: options?.hueRotate ?? 0,
		brightnessMin: options?.brightnessMin ?? 0,
		brightnessMax: options?.brightnessMax ?? 1,
		saturation: options?.saturation ?? 0,
		contrast: options?.contrast ?? 0,
	};
}

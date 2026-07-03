export type SatelliteRasterOptions = {
	opacity?: number;
	hueRotate?: number;
	brightnessMin?: number;
	brightnessMax?: number;
	saturation?: number;
	contrast?: number;
};

export type ResolvedSatelliteRaster = Required<SatelliteRasterOptions>;

export function resolveSatelliteRaster(options?: SatelliteRasterOptions): ResolvedSatelliteRaster {
	return {
		opacity: options?.opacity ?? 1,
		hueRotate: options?.hueRotate ?? 0,
		brightnessMin: options?.brightnessMin ?? 0,
		brightnessMax: options?.brightnessMax ?? 1,
		saturation: options?.saturation ?? 0,
		contrast: options?.contrast ?? 0,
	};
}

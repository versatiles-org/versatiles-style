export type SkyOptions = {
	skyColor?: string;
	horizonColor?: string;
	skyHorizonBlend?: number;
	horizonFogBlend?: number;
	atmosphereBlend?: number;
};

export type ResolvedSky = Required<SkyOptions>;

export function resolveSky(sky?: SkyOptions): ResolvedSky {
	return {
		skyColor: sky?.skyColor ?? '#87CEEB',
		horizonColor: sky?.horizonColor ?? '#ffffff',
		skyHorizonBlend: sky?.skyHorizonBlend ?? 0.5,
		horizonFogBlend: sky?.horizonFogBlend ?? 0.5,
		atmosphereBlend: sky?.atmosphereBlend ?? 0,
	};
}

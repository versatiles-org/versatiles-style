/**
 * Atmosphere above the horizon. `true` (the default) uses the defaults below, `false` omits the
 * style's `sky` block entirely, an object overrides individual values — the same
 * `boolean | object` shape as `features.terrain` and `features.hillshade`.
 *
 * MapLibre only renders the sky when the map is pitched or in globe projection, so a flat 2D map
 * carries five paint properties it never draws; `sky: false` drops them.
 */
export type SkyOptions = {
	skyColor?: string;
	horizonColor?: string;
	skyHorizonBlend?: number;
	horizonFogBlend?: number;
	atmosphereBlend?: number;
};

export type ResolvedSky = false | Required<SkyOptions>;

export function resolveSky(sky?: boolean | SkyOptions): ResolvedSky {
	if (sky === false) return false;
	const o = typeof sky === 'object' ? sky : undefined;
	return {
		skyColor: o?.skyColor ?? '#87CEEB',
		horizonColor: o?.horizonColor ?? '#ffffff',
		skyHorizonBlend: o?.skyHorizonBlend ?? 0.5,
		horizonFogBlend: o?.horizonFogBlend ?? 0.5,
		atmosphereBlend: o?.atmosphereBlend ?? 0,
	};
}

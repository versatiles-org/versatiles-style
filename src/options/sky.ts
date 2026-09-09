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

/**
 * Per-palette sky, derived rather than invented: the sky takes the palette's own `water` colour —
 * both are "the blue of this theme", and in dark mode it is already a night blue — and the horizon
 * takes `background`, the map's ground colour, so the two meet without a seam.
 *
 * Without this every theme got the same `#87CEEB`, which put a bright blue sky above a dark map in
 * dark mode and above a monochrome one in `toner` (issue #126).
 */
export type SkyPaletteDefaults = { skyColor: string; horizonColor: string };

export function resolveSky(sky?: boolean | SkyOptions, palette?: SkyPaletteDefaults): ResolvedSky {
	if (sky === false) return false;
	const o = typeof sky === 'object' ? sky : undefined;
	return {
		skyColor: o?.skyColor ?? palette?.skyColor ?? '#87CEEB',
		horizonColor: o?.horizonColor ?? palette?.horizonColor ?? '#ffffff',
		skyHorizonBlend: o?.skyHorizonBlend ?? 0.5,
		horizonFogBlend: o?.horizonFogBlend ?? 0.5,
		atmosphereBlend: o?.atmosphereBlend ?? 0,
	};
}

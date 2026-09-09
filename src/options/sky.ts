import type { PropertyValueSpecification } from '@maplibre/maplibre-gl-style-spec';

/**
 * Atmosphere above the horizon. `true` (the default) uses the defaults below, `false` omits the
 * style's `sky` block entirely, an object overrides individual values — the same
 * `boolean | object` shape as `features.terrain` and `features.hillshade`.
 *
 * MapLibre only renders the sky when the horizon is in frame — in globe projection, or in Mercator
 * once the pitch passes ~65° (measured; nothing shows at MapLibre's default `maxPitch` of 60). A
 * flat 2D map therefore carries five paint properties it never draws; `sky: false` drops them.
 */
export type SkyOptions = {
	skyColor?: string;
	horizonColor?: string;
	skyHorizonBlend?: number;
	horizonFogBlend?: number;
	/** A constant, or any style-spec zoom expression — the default is a zoom ramp, see below. */
	atmosphereBlend?: PropertyValueSpecification<number>;
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

/**
 * `atmosphere-blend` does two jobs with one number, and they want opposite values.
 *
 * In globe projection — the default — it gates the sky entirely: at 0 nothing is drawn and the
 * globe is a hard-edged disc cut out of the page, so it has to be non-zero for the sky to exist at
 * all. But the same property also hazes the scene, and on a pitched terrain view that washes
 * everything out: measured at z9.6/pitch 76 over the Alps, a constant 0.8 lifted mean frame
 * luminance from 153 to 230.
 *
 * It cannot be conditioned on pitch, only on zoom — so ramp it off above the zooms where the globe
 * is actually a globe. At z≤2 the atmosphere is at full strength (identical to a constant 0.8),
 * and from z5 up it is exactly 0 (renders pixel-for-pixel like the old default). The cost is a
 * residual haze on a steeply pitched view at z3–4, where one knob cannot serve both.
 */
const ATMOSPHERE_BLEND: PropertyValueSpecification<number> = ['interpolate', ['linear'], ['zoom'], 2, 0.8, 5, 0];

export function resolveSky(sky?: boolean | SkyOptions, palette?: SkyPaletteDefaults): ResolvedSky {
	if (sky === false) return false;
	const o = typeof sky === 'object' ? sky : undefined;
	return {
		skyColor: o?.skyColor ?? palette?.skyColor ?? '#87CEEB',
		horizonColor: o?.horizonColor ?? palette?.horizonColor ?? '#ffffff',
		skyHorizonBlend: o?.skyHorizonBlend ?? 0.5,
		horizonFogBlend: o?.horizonFogBlend ?? 0.5,
		atmosphereBlend: o?.atmosphereBlend ?? ATMOSPHERE_BLEND,
	};
}

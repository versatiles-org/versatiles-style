import { checkKeys } from './keys.js';
import type { PropertyValueSpecification } from '@maplibre/maplibre-gl-style-spec';

/**
 * Atmosphere above the horizon. `true` (the default) uses the defaults below, `false` omits the
 * style's `sky` block entirely, an object overrides individual values — the same
 * `boolean | object` shape as `features.terrain` and `features.hillshade`.
 *
 * MapLibre only renders the sky when the horizon is in frame — in globe projection, or in Mercator
 * once the pitch passes ~65° (measured; nothing shows at MapLibre's default `maxPitch` of 60). A
 * flat 2D map therefore carries paint properties it never draws; `sky: false` drops them.
 */
export type SkyOptions = {
	/** Default `#ffffff`. */
	fogColor?: string;
	/** Default `#ffffff`. */
	horizonColor?: string;
	/** Default: the palette's `colors.water` — see `resolveSky`. */
	skyColor?: string;

	/** Default `0`: no haze, so the globe's edge stays crisp. */
	atmosphereBlend?: PropertyValueSpecification<number>;
	/** Default `0.5`. */
	fogGroundBlend?: PropertyValueSpecification<number>;
	/** Default `0.8`. */
	horizonFogBlend?: PropertyValueSpecification<number>;
	/** Default `0.8`. */
	skyHorizonBlend?: PropertyValueSpecification<number>;
};

/** Every sky value but `skyColor`, which is set only when the caller set it. */
export type ResolvedSky = undefined | (Required<Omit<SkyOptions, 'skyColor'>> & Pick<SkyOptions, 'skyColor'>);

/**
 * The palette-independent sky defaults. Apart from `atmosphereBlend`, these are MapLibre's own, so a
 * style that writes them looks the same as one that leaves them out.
 */
export const SKY_DEFAULTS = {
	fogColor: '#ffffff',
	horizonColor: '#ffffff',
	atmosphereBlend: 0,
	fogGroundBlend: 0.5,
	horizonFogBlend: 0.8,
	skyHorizonBlend: 0.8,
} as const satisfies Required<Omit<SkyOptions, 'skyColor'>>;

/**
 * Fills in every sky value except `skyColor`, which stays unset unless the caller set it. The style
 * build derives it from the palette's `colors.water` (`applySky`), so a UI should show `colors.water`
 * while it is unset. Resolving it here would bake one palette's colour into `defaults` and
 * `resolveOptions()`, so a resolved object fed back in as options would pin the sky — edit
 * `colors.water` on top of it and the sky would no longer follow.
 */
export function resolveSky(sky?: boolean | SkyOptions, path = 'sky'): ResolvedSky {
	if (sky === false) return undefined;
	const options = typeof sky === 'object' ? sky : {};
	checkKeys(
		options,
		{
			fogColor: true,
			horizonColor: true,
			skyColor: true,
			atmosphereBlend: true,
			fogGroundBlend: true,
			horizonFogBlend: true,
			skyHorizonBlend: true,
		},
		path
	);
	return {
		fogColor: options.fogColor ?? SKY_DEFAULTS.fogColor,
		horizonColor: options.horizonColor ?? SKY_DEFAULTS.horizonColor,
		...(options.skyColor !== undefined ? { skyColor: options.skyColor } : {}),
		atmosphereBlend: options.atmosphereBlend ?? SKY_DEFAULTS.atmosphereBlend,
		fogGroundBlend: options.fogGroundBlend ?? SKY_DEFAULTS.fogGroundBlend,
		horizonFogBlend: options.horizonFogBlend ?? SKY_DEFAULTS.horizonFogBlend,
		skyHorizonBlend: options.skyHorizonBlend ?? SKY_DEFAULTS.skyHorizonBlend,
	};
}

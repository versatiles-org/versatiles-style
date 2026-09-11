import { checkKeys } from './keys.js';

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
	fogColor?: string;
	horizonColor?: string;
	skyColor?: string;

	atmosphereBlend?: number;
	fogGroundBlend?: number;
	horizonFogBlend?: number;
	skyHorizonBlend?: number;
};

export type ResolvedSky = undefined | SkyOptions;

/**
 * `skyColor` and `horizonColor` stay unset unless the caller set them. They are derived from the
 * palette when the style is built (`applySky`), not here: resolving them here baked one palette's
 * colours into `defaults` and `resolveOptions()`, so a resolved object fed back in as options pinned
 * the sky — edit `colors.water` on top of it and the sky no longer followed.
 */
export function resolveSky(sky?: boolean | SkyOptions, path = 'sky'): ResolvedSky {
	if (sky === false) return undefined;
	if (sky === true || sky === undefined) return {};
	checkKeys(
		sky,
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
		...(sky.fogColor !== undefined ? { fogColor: sky.fogColor } : {}),
		...(sky.horizonColor !== undefined ? { horizonColor: sky.horizonColor } : {}),
		...(sky.skyColor !== undefined ? { skyColor: sky.skyColor } : {}),
		...(sky.atmosphereBlend !== undefined ? { atmosphereBlend: sky.atmosphereBlend } : {}),
		...(sky.fogGroundBlend !== undefined ? { fogGroundBlend: sky.fogGroundBlend } : {}),
		...(sky.horizonFogBlend !== undefined ? { horizonFogBlend: sky.horizonFogBlend } : {}),
		...(sky.skyHorizonBlend !== undefined ? { skyHorizonBlend: sky.skyHorizonBlend } : {}),
	};
}

import type { StyleSpecification } from '../types/index.js';
import type { ResolvedSky } from '../options/index.js';

// Writes the resolved sky configuration into the style's top-level `sky` property, one style-spec key
// per resolved value. MapLibre renders the sky when the map is pitched / in globe projection.
// `skyColor` is written only when set: the callers fill it in from the palette's `water`, since resolved
// options leave it unset so it keeps following the palette (see `resolveSky`).
export function applySky(style: StyleSpecification, sky: ResolvedSky) {
	// `sky: false` omits the block rather than writing transparent values.
	if (sky) {
		style.sky = {
			...(sky.skyColor === undefined ? {} : { 'sky-color': sky.skyColor }),
			'horizon-color': sky.horizonColor,
			'fog-color': sky.fogColor,
			'sky-horizon-blend': sky.skyHorizonBlend,
			'horizon-fog-blend': sky.horizonFogBlend,
			'fog-ground-blend': sky.fogGroundBlend,
			'atmosphere-blend': sky.atmosphereBlend,
		};
	} else {
		delete style.sky;
	}
}

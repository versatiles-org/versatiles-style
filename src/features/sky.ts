import type { StyleSpecification } from '../types/index.js';
import type { ResolvedSky } from '../options/index.js';

// Writes the resolved sky configuration into the style's top-level `sky` property.
// MapLibre renders the sky when the map is pitched / in globe projection; the values
// map 1:1 onto the style-spec `sky` keys (fog-color / fog-ground-blend are left at
// their MapLibre defaults — they are not exposed as options).
// `palette` supplies the sky and horizon colours the caller did not set: resolved options leave them
// unset so they keep following the palette (see `resolveSky`).
export function applySky(style: StyleSpecification, sky: ResolvedSky) {
	// `sky: false` omits the block rather than writing transparent values.
	if (sky) {
		style.sky = {
			...(sky.fogColor === undefined ? {} : { 'fog-color': sky.fogColor }),
			...(sky.horizonColor === undefined ? {} : { 'horizon-color': sky.horizonColor }),
			...(sky.skyColor === undefined ? {} : { 'sky-color': sky.skyColor }),
			...(sky.atmosphereBlend === undefined ? {} : { 'atmosphere-blend': sky.atmosphereBlend }),
			...(sky.atmosphereBlend === undefined ? {} : { 'atmosphere-blend': sky.atmosphereBlend }),
			...(sky.fogGroundBlend === undefined ? {} : { 'fog-ground-blend': sky.fogGroundBlend }),
			...(sky.horizonFogBlend === undefined ? {} : { 'horizon-fog-blend': sky.horizonFogBlend }),
			...(sky.skyHorizonBlend === undefined ? {} : { 'sky-horizon-blend': sky.skyHorizonBlend }),
		};
	} else {
		delete style.sky;
	}
}

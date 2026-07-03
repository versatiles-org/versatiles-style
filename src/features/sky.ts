import type { StyleSpecification } from '../types/index.js';
import type { ResolvedSky } from '../options/index.js';

// Writes the resolved sky configuration into the style's top-level `sky` property.
// MapLibre renders the sky when the map is pitched / in globe projection; the values
// map 1:1 onto the style-spec `sky` keys (fog-color / fog-ground-blend are left at
// their MapLibre defaults — they are not exposed as options).
export function applySky(style: StyleSpecification, sky: ResolvedSky) {
	style.sky = {
		'sky-color': sky.skyColor,
		'horizon-color': sky.horizonColor,
		'sky-horizon-blend': sky.skyHorizonBlend,
		'horizon-fog-blend': sky.horizonFogBlend,
		'atmosphere-blend': sky.atmosphereBlend,
	} as StyleSpecification['sky'];
}

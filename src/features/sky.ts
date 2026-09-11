import type { StyleSpecification } from '../types/index.js';
import type { ResolvedSky } from '../options/index.js';
import { GENERIC_SKY, type SkyPaletteDefaults } from '../options/sky.js';

// Writes the resolved sky configuration into the style's top-level `sky` property.
// MapLibre renders the sky when the map is pitched / in globe projection; the values
// map 1:1 onto the style-spec `sky` keys (fog-color / fog-ground-blend are left at
// their MapLibre defaults — they are not exposed as options).
// `palette` supplies the sky and horizon colours the caller did not set: resolved options leave them
// unset so they keep following the palette (see `resolveSky`).
export function applySky(style: StyleSpecification, sky: ResolvedSky, palette: SkyPaletteDefaults = GENERIC_SKY) {
	// `sky: false` omits the block rather than writing transparent values.
	if (sky === false) return;
	style.sky = {
		'sky-color': sky.skyColor ?? palette.skyColor,
		'horizon-color': sky.horizonColor ?? palette.horizonColor,
		'sky-horizon-blend': sky.skyHorizonBlend,
		'horizon-fog-blend': sky.horizonFogBlend,
		'atmosphere-blend': sky.atmosphereBlend,
	} as StyleSpecification['sky'];
}

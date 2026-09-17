import { Color } from '../color/index.js';
import type { StyleSpecification } from '../types/index.js';
import type { ResolvedSky } from '../options/index.js';

// Writes the resolved sky configuration into the style's top-level `sky` property, one style-spec key
// per resolved value. MapLibre renders the sky when the map is pitched / in globe projection.
// `skyColor` is written only when set: the callers fill it in from the palette's `water`, since resolved
// options leave it unset so it keeps following the palette (see `resolveSky`).
/**
 * Every colour in a style goes through `Color`, including the ones up here.
 *
 * These three used to be written straight from the options, so they were never validated — a colour
 * MapLibre cannot read reached the style unexamined, and in the native renderer that means a sky drawn
 * as nothing at all — never normalised, and never seen by `applyRecolor`, which walks layer paint only.
 * An inverted-brightness map therefore kept a bright blue sky over its dark ground.
 */
function color(value: string): string {
	return Color.parse(value).asString();
}

export function applySky(style: StyleSpecification, sky: ResolvedSky) {
	// `sky: false` omits the block rather than writing transparent values.
	if (sky) {
		style.sky = {
			...(sky.skyColor === undefined ? {} : { 'sky-color': color(sky.skyColor) }),
			'horizon-color': color(sky.horizonColor),
			'fog-color': color(sky.fogColor),
			'sky-horizon-blend': sky.skyHorizonBlend,
			'horizon-fog-blend': sky.horizonFogBlend,
			'fog-ground-blend': sky.fogGroundBlend,
			'atmosphere-blend': sky.atmosphereBlend,
		};
	} else {
		delete style.sky;
	}
}

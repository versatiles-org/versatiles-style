import { checkKeys, checkFinite } from './keys.js';
import { checkColor } from './color-check.js';

export type SunOptions =
	| true
	| {
			/** The sun's azimuthal direction in degrees, measured clockwise from north. */
			direction?: number;
			/** The sun's altitude in degrees above the horizon. */
			altitude?: number;
			/** The reference frame for the sun's position: 'map' anchors it to the map, 'viewport' to the screen. */
			anchor?: 'map' | 'viewport';
			/** The light's color. Default `#ffffff`. */
			color?: string;
			/** The light's intensity, 0–1. Default `0.5`. */
			intensity?: number;
	  };

export type ResolvedSun =
	| undefined
	| {
			direction: number;
			altitude: number;
			anchor: 'map' | 'viewport';
			color: string;
			intensity: number;
	  };

/** `color` and `intensity` are MapLibre's own light defaults, so writing them changes nothing. */
export function resolveSun(sun?: SunOptions, path = 'sun'): ResolvedSun {
	if (sun === true) sun = {};
	if (sun === undefined) return undefined;
	checkKeys(sun, { direction: true, altitude: true, anchor: true, color: true, intensity: true }, path);
	checkFinite(sun, path);
	checkColor(sun?.color, `${path}.color`);
	return {
		direction: sun?.direction ?? 210,
		altitude: sun?.altitude ?? 60,
		anchor: sun?.anchor ?? 'viewport',
		color: sun?.color ?? '#ffffff',
		intensity: sun?.intensity ?? 0.5,
	};
}

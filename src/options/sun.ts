import { checkKeys } from './keys.js';

export type SunOptions =
	| true
	| {
			/** The sun's azimuthal direction in degrees, measured clockwise from north. */
			direction?: number;
			/** The sun's altitude in degrees above the horizon. */
			altitude?: number;
			/** The reference frame for the sun's position: 'map' anchors it to the map, 'viewport' to the screen. */
			anchor?: 'map' | 'viewport';
			/** The sun's color. */
			color?: string;
			/** The sun's intensity. */
			intensity?: number;
	  };

export type ResolvedSun =
	| undefined
	| {
			direction: number;
			altitude: number;
			anchor: 'map' | 'viewport';
			color?: string;
			intensity?: number;
	  };

export function resolveSun(sun?: SunOptions, path = 'sun'): ResolvedSun {
	if (sun === true) sun = {};
	if (sun === undefined) return undefined;
	checkKeys(sun, { direction: true, altitude: true, anchor: true, color: true, intensity: true }, path);
	return {
		direction: sun?.direction ?? 210,
		altitude: sun?.altitude ?? 60,
		anchor: sun?.anchor ?? 'viewport',
		...(sun?.color === undefined ? {} : { color: sun?.color }),
		...(sun?.intensity === undefined ? {} : { intensity: sun?.intensity }),
	};
}

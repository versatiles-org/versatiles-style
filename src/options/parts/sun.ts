import { checkKeys, checkFinite } from './keys.js';
import { checkColor } from './color-check.js';
import type { LightOptions } from './light.js';

/** @deprecated Use `light` (`LightOptions`); `sun` is read as `light` and will be removed in v7. */
export type SunOptions =
	| true
	| {
			/** The sun's azimuthal direction in degrees. */
			direction?: number;
			/** The sun's altitude in degrees above the horizon. */
			altitude?: number;
			/** 'map' turns the light with the map — `light.rotateWithMap: true`; 'viewport' does not. */
			anchor?: 'map' | 'viewport';
			color?: string;
			intensity?: number;
	  };

/** @deprecated Resolved options carry `light` (`ResolvedLight`); this is no longer produced. */
export type ResolvedSun =
	| undefined
	| {
			direction: number;
			altitude: number;
			anchor: 'map' | 'viewport';
			color: string;
			intensity: number;
	  };

/**
 * The deprecated `sun`, checked and translated to `light`. Only what the caller set is carried over,
 * so an unset value takes `light`'s default rather than the one `sun` used to have.
 */
export function sunToLight(sun: SunOptions, path = 'sun'): LightOptions {
	if (sun === true) return true;
	checkKeys(sun, { direction: true, altitude: true, anchor: true, color: true, intensity: true }, path);
	checkFinite(sun, path);
	checkColor(sun.color, `${path}.color`);
	const { anchor, ...rest } = sun;
	const light: Exclude<LightOptions, boolean> = Object.fromEntries(
		Object.entries(rest).filter(([, value]) => value !== undefined)
	);
	if (anchor !== undefined) light.rotateWithMap = anchor === 'map';
	return light;
}

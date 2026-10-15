import { checkKeys, checkFinite } from './keys.js';
import { checkColor } from './color-check.js';
import { reportIssue } from './issues.js';
import { sunToLight, type SunOptions } from './sun.js';

/**
 * The one light of the map: it shades the terrain (`features.hillshade`), lights 3D buildings
 * (`features.buildings: 'extruded'`) and, on a globe, decides which side of the atmosphere glows
 * (`sky.atmosphereBlend`). Set once, all three are lit from the same side.
 *
 * `true` uses the defaults below, an object overrides individual values. Unset or `false`, no `light`
 * is written and hillshade and buildings fall back to MapLibre's own lights, which disagree.
 */
export type LightOptions =
	| boolean
	| {
			/**
			 * Where the light comes from, in degrees clockwise: 0 = top, 90 = right. Default `315`, the top
			 * left — the cartographic convention, under which relief never reads inverted.
			 */
			direction?: number;
			/**
			 * The light's height above the horizon, in degrees. Default `45`. A low light deepens the
			 * hillshade's shadows, a high one flattens the relief. With `features.hillshade`, `light` switches
			 * the hillshade to MapLibre's `combined` method, the one that takes the altitude; that needs
			 * MapLibre GL JS 5.5.0 or newer.
			 */
			altitude?: number;
			/**
			 * Whether the light turns with the map. Default `false`: it stays fixed to the screen, so
			 * `direction` 0 is always the top of the screen. `true` makes 0 north instead. On a globe with
			 * a visible atmosphere (`sky.atmosphereBlend` > 0) the atmosphere cannot follow a light that
			 * turns with the map, and glows on a side unrelated to `direction`.
			 */
			rotateWithMap?: boolean;
			/** The light's colour, on 3D buildings only. Default `#ffffff`. */
			color?: string;
			/** The light's intensity on 3D buildings, 0–1. Default `0.5`. */
			intensity?: number;
	  };

/** `false` when there is no light, otherwise every value — so it can be fed back in as options. */
export type ResolvedLight = false | Required<Exclude<LightOptions, boolean>>;

/** `color` and `intensity` are MapLibre's own light defaults, so writing them changes nothing. */
export const LIGHT_DEFAULTS = {
	direction: 315,
	altitude: 45,
	rotateWithMap: false,
	color: '#ffffff',
	intensity: 0.5,
} as const satisfies ResolvedLight;

/**
 * Resolves `light`, or the deprecated `sun` in its place. `base` is the path of the options object
 * both sit in (`osm`, `satellite`), so an error names the key the caller wrote.
 */
export function resolveLight(
	light: LightOptions | undefined,
	sun: SunOptions | undefined,
	base: string
): ResolvedLight {
	if (sun !== undefined) {
		if (light !== undefined) {
			const message = '"sun" is a deprecated alias of "light", and both are set';
			reportIssue({ path: 'sun', message }, `${base}: ${message}`);
		}
		light = sunToLight(sun, `${base}.sun`);
	}
	if (light === undefined || light === false) return false;
	const options = light === true ? {} : light;
	const path = `${base}.light`;
	checkKeys(options, { direction: true, altitude: true, rotateWithMap: true, color: true, intensity: true }, path);
	checkFinite(options, path);
	checkColor(options.color, `${path}.color`);
	return {
		direction: options.direction ?? LIGHT_DEFAULTS.direction,
		altitude: options.altitude ?? LIGHT_DEFAULTS.altitude,
		rotateWithMap: options.rotateWithMap ?? LIGHT_DEFAULTS.rotateWithMap,
		color: options.color ?? LIGHT_DEFAULTS.color,
		intensity: options.intensity ?? LIGHT_DEFAULTS.intensity,
	};
}

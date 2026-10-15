import { checkKeys, checkFinite, checkRange } from './keys.js';
import { checkColor } from './color-check.js';

/**
 * The one light of the map: it shades the terrain (`features.hillshade`), lights 3D buildings
 * (`features.buildings: 'extruded'`) and, on a globe, decides which side of the atmosphere glows
 * (`sky.atmosphereBlend`). Set once, all three are lit from the same side. `features.terrain` alone
 * is not shaded: MapLibre never lights the 3D terrain surface, so only the hillshade shows the light.
 *
 * On by default: unset or `true` uses the defaults below, an object overrides individual values.
 * `false` writes no `light`, and hillshade and buildings fall back to MapLibre's own lights, which
 * disagree. With `features.hillshade`, a light needs MapLibre GL JS 5.5.0 or newer.
 */
export type LightOptions =
	| boolean
	| {
			/**
			 * Where the light comes from, in degrees clockwise: 0 = top, 90 = right. Default `315`, the top
			 * left — the cartographic convention, under which relief never reads inverted. Any angle is
			 * accepted and wrapped: `-45` is `315`.
			 */
			direction?: number;
			/**
			 * The light's height above the horizon, in degrees, 0–90. Default `45`. A low light deepens the
			 * hillshade's shadows, a high one flattens the relief. With `features.hillshade`, `light` switches
			 * the hillshade to MapLibre's `combined` method, the one that takes the altitude; that needs
			 * MapLibre GL JS 5.5.0 or newer.
			 */
			altitude?: number;
			/**
			 * Whether the light turns with the map. Default `false`: it stays fixed to the screen, so
			 * `direction` 0 is always the top of the screen. `true` makes 0 north instead. The globe's
			 * atmosphere (`sky.atmosphereBlend` > 0) cannot turn with the map; it glows from `direction`
			 * on screen, which matches the terrain while the map points north.
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
 * Resolves `light`. `base` is the path of the options object it sits in (`osm`, `satellite`), so an
 * error names the key the caller wrote.
 */
export function resolveLight(light: LightOptions | undefined, base: string): ResolvedLight {
	if (light === false) return false;
	const options = light === undefined || light === true ? {} : light;
	const path = `${base}.light`;
	checkKeys(options, { direction: true, altitude: true, rotateWithMap: true, color: true, intensity: true }, path);
	checkFinite(options, path);
	checkColor(options.color, `${path}.color`);
	checkRange(options.altitude, 0, 90, `${path}.altitude`);
	checkRange(options.intensity, 0, 1, `${path}.intensity`);
	return {
		// Any angle, wrapped to 0–360: `-45` is `315`.
		direction: (((options.direction ?? LIGHT_DEFAULTS.direction) % 360) + 360) % 360,
		altitude: options.altitude ?? LIGHT_DEFAULTS.altitude,
		rotateWithMap: options.rotateWithMap ?? LIGHT_DEFAULTS.rotateWithMap,
		color: options.color ?? LIGHT_DEFAULTS.color,
		intensity: options.intensity ?? LIGHT_DEFAULTS.intensity,
	};
}

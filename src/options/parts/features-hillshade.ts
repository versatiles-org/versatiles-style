import { checkKeys, checkFinite } from './keys.js';
import { checkColors } from './color-check.js';
export type HillshadeOptions =
	| boolean
	| {
			exaggeration?: number;
			shadowColor?: string;
			highlightColor?: string;
			accentColor?: string;
			/**
			 * @deprecated Set `light.rotateWithMap` instead, which turns terrain and 3D buildings together;
			 * removed in v7. Unset, the shading follows `light`; without a `light`, it is 'map'.
			 */
			anchor?: 'map' | 'viewport';
	  };

/**
 * `anchor` stays unset unless the caller set it, like `sky.skyColor`: an unset anchor follows
 * `light.rotateWithMap` when the style is built (`addHillshade`). Resolving it to 'map' here would pin it, and
 * hillshade would turn with the map while buildings, lit by a light fixed to the screen, did not.
 */
export type ResolvedHillshade =
	| false
	| {
			exaggeration: number;
			shadowColor: string;
			highlightColor: string;
			accentColor: string;
			anchor?: 'map' | 'viewport';
	  };

export function resolveHillshade(hillshade?: HillshadeOptions, path = 'hillshade'): ResolvedHillshade {
	checkKeys(
		hillshade,
		{ exaggeration: true, shadowColor: true, highlightColor: true, accentColor: true, anchor: true },
		path
	);
	checkFinite(hillshade, path);
	checkColors(hillshade, ['shadowColor', 'highlightColor', 'accentColor'], path);
	if (!hillshade) return false;
	const h = typeof hillshade === 'object' ? hillshade : {};
	return {
		exaggeration: h.exaggeration ?? 0.1,
		shadowColor: h.shadowColor ?? '#000000',
		highlightColor: h.highlightColor ?? '#ffffff',
		accentColor: h.accentColor ?? '#000000',
		...(h.anchor !== undefined ? { anchor: h.anchor } : {}),
	};
}

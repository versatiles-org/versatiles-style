import { checkKeys, checkFinite, checkRange } from './keys.js';
import { checkColors } from './color-check.js';
export type HillshadeOptions =
	| boolean
	| {
			exaggeration?: number;
			shadowColor?: string;
			highlightColor?: string;
			/** Only with `light: false`: lit, the hillshade uses a method that draws no accent colour. */
			accentColor?: string;
	  };

/** Whether the shading turns with the map is `light.rotateWithMap`, shared with 3D buildings. */
export type ResolvedHillshade =
	| false
	| {
			exaggeration: number;
			shadowColor: string;
			highlightColor: string;
			accentColor: string;
	  };

export function resolveHillshade(hillshade?: HillshadeOptions, path = 'hillshade'): ResolvedHillshade {
	checkKeys(hillshade, { exaggeration: true, shadowColor: true, highlightColor: true, accentColor: true }, path);
	checkFinite(hillshade, path);
	if (typeof hillshade === 'object') checkRange(hillshade.exaggeration, 0, 1, `${path}.exaggeration`);
	checkColors(hillshade, ['shadowColor', 'highlightColor', 'accentColor'], path);
	if (!hillshade) return false;
	const h = typeof hillshade === 'object' ? hillshade : {};
	return {
		exaggeration: h.exaggeration ?? 0.1,
		shadowColor: h.shadowColor ?? '#000000',
		highlightColor: h.highlightColor ?? '#ffffff',
		accentColor: h.accentColor ?? '#000000',
	};
}

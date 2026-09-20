import { checkKeys, checkFinite } from './keys.js';
import { checkColors } from './color-check.js';
export type HillshadeOptions =
	| boolean
	| {
			exaggeration?: number;
			shadowColor?: string;
			highlightColor?: string;
			accentColor?: string;
			anchor?: 'map' | 'viewport';
	  };

export type ResolvedHillshade =
	| false
	| {
			exaggeration: number;
			shadowColor: string;
			highlightColor: string;
			accentColor: string;
			anchor: 'map' | 'viewport';
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
		anchor: h.anchor ?? 'map',
	};
}

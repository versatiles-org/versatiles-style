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

export function resolveHillshade(hillshade?: HillshadeOptions): ResolvedHillshade {
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

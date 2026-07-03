export type TerrainOptions = boolean | { exaggeration?: number };
export type ResolvedTerrain = false | { exaggeration: number };

export function resolveTerrain(terrain?: TerrainOptions): ResolvedTerrain {
	if (!terrain) return false;
	return { exaggeration: (typeof terrain === 'object' ? terrain.exaggeration : undefined) ?? 1.0 };
}

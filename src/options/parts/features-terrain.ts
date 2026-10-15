import { checkKeys, checkFinite, checkRange } from './keys.js';
export type TerrainOptions = boolean | { exaggeration?: number };
export type ResolvedTerrain = false | { exaggeration: number };

export function resolveTerrain(terrain?: TerrainOptions, path = 'terrain'): ResolvedTerrain {
	checkKeys(terrain, { exaggeration: true }, path);
	checkFinite(terrain, path);
	if (typeof terrain === 'object') checkRange(terrain.exaggeration, 0, Infinity, `${path}.exaggeration`);
	if (!terrain) return false;
	return { exaggeration: (typeof terrain === 'object' ? terrain.exaggeration : undefined) ?? 1.0 };
}

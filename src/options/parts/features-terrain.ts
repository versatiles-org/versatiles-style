import { checkKeys, checkFinite, checkRange } from './keys.js';
/**
 * 3D terrain: the map's surface raised by the elevation source. MapLibre does not light that surface,
 * so it shows no relief from above and `light` does not shade it; add `features.hillshade` for that.
 */
export type TerrainOptions = boolean | { exaggeration?: number };
export type ResolvedTerrain = false | { exaggeration: number };

export function resolveTerrain(terrain?: TerrainOptions, path = 'terrain'): ResolvedTerrain {
	checkKeys(terrain, { exaggeration: true }, path);
	checkFinite(terrain, path);
	if (typeof terrain === 'object') checkRange(terrain.exaggeration, 0, Infinity, `${path}.exaggeration`);
	if (!terrain) return false;
	return { exaggeration: (typeof terrain === 'object' ? terrain.exaggeration : undefined) ?? 1.0 };
}

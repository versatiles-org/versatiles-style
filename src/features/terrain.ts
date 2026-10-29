import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import { buildElevationSource } from './elevation-source.js';

// Adds a raster-dem source and enables MapLibre 3D terrain.
//
// Next to a hillshade layer on `elevation`, the terrain gets a source of its own, built from the same
// tiles. MapLibre loads a terrain source's tiles one zoom level coarser (`deltaZoom` in its
// TerrainTileManager), so a hillshade sharing it is drawn from half-resolution data — and MapLibre
// warns about exactly that. Call this after `addHillshade`, which is how it knows.
export function addTerrain(
	style: StyleSpecification,
	options: { exaggeration: number },
	elevation: string | TileJSONSpecification
) {
	const shared = style.layers.some((l) => l.type === 'hillshade' && l.source === 'elevation');
	const source = shared ? 'elevation-terrain' : 'elevation';
	style.sources ??= {};
	style.sources[source] = buildElevationSource(elevation) as StyleSpecification['sources'][string];
	style.terrain = { source, exaggeration: options.exaggeration };
}

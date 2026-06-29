import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import { buildElevationSource } from './elevation-source.js';

// Adds a raster-dem source and enables MapLibre 3D terrain.
export function addTerrain(
	style: StyleSpecification,
	options: { exaggeration: number },
	elevation: string | TileJSONSpecification
) {
	style.sources ??= {};
	style.sources['elevation'] = buildElevationSource(elevation) as StyleSpecification['sources'][string];
	style.terrain = { source: 'elevation', exaggeration: options.exaggeration };
}

import type { TileJSONSpecification } from '../types/index.js';

// Builds a MapLibre raster-dem source descriptor from either a tile URL pattern string
// or a fully resolved TileJSONSpecification. Shared by addTerrain and addHillshade.
export function buildElevationSource(elevation: string | TileJSONSpecification): {
	type: 'raster-dem';
	tiles: string[];
	tileSize: number;
	encoding: 'terrarium' | 'mapbox';
	minzoom?: number;
	maxzoom?: number;
	bounds?: [number, number, number, number];
	attribution?: string;
} {
	if (typeof elevation === 'string') {
		// Treat the string as a direct tile URL pattern.
		return { type: 'raster-dem', tiles: [elevation], tileSize: 512, encoding: 'terrarium' };
	}

	let encoding: 'terrarium' | 'mapbox' = 'terrarium';
	if (elevation.encoding === 'mapbox' || elevation.tile_schema === 'dem/mapbox') {
		encoding = 'mapbox';
	}

	return {
		type: 'raster-dem',
		tiles: elevation.tiles,
		tileSize: elevation.tile_size ?? 512,
		encoding,
		...(elevation.minzoom !== undefined && { minzoom: elevation.minzoom }),
		...(elevation.maxzoom !== undefined && { maxzoom: elevation.maxzoom }),
		...(elevation.bounds && { bounds: elevation.bounds }),
		...(elevation.attribution && { attribution: elevation.attribution }),
	};
}

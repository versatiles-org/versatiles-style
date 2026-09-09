import type { TileJSONSpecification } from '../types/index.js';
import { normalizeAttribution } from '../lib/utils.js';

// Builds a MapLibre raster-dem source descriptor from either a tile URL pattern string
// or a fully resolved TileJSONSpecification. Shared by addTerrain and addHillshade.
export function buildElevationSource(elevation: string | TileJSONSpecification): {
	type: 'raster-dem';
	tiles?: string[];
	url?: string;
	tileSize?: number;
	encoding: 'terrarium' | 'mapbox';
	minzoom?: number;
	maxzoom?: number;
	bounds?: [number, number, number, number];
	attribution?: string;
} {
	if (typeof elevation === 'string') {
		// A `{z}` placeholder marks a raw tile template; anything else is a TileJSON URL, which
		// MapLibre resolves at map load. `encoding` is a MapLibre source property rather than a
		// TileJSON field, so state the VersaTiles default here — `inlineSources` corrects it if
		// the fetched document says otherwise.
		return elevation.includes('{z}')
			? { type: 'raster-dem', tiles: [elevation], encoding: 'terrarium' }
			: { type: 'raster-dem', url: elevation, encoding: 'terrarium' };
	}

	let encoding: 'terrarium' | 'mapbox' = 'terrarium';
	if (elevation.encoding === 'mapbox' || elevation.tile_schema === 'dem/mapbox') {
		encoding = 'mapbox';
	}

	return {
		type: 'raster-dem',
		tiles: elevation.tiles,
		// Only declare `tileSize` when the TileJSON actually states one.
		...(elevation.tile_size !== undefined && { tileSize: elevation.tile_size }),
		encoding,
		...(elevation.minzoom !== undefined && { minzoom: elevation.minzoom }),
		...(elevation.maxzoom !== undefined && { maxzoom: elevation.maxzoom }),
		...(elevation.bounds && { bounds: elevation.bounds }),
		...(elevation.attribution && { attribution: normalizeAttribution(elevation.attribution) }),
	};
}

import type { StyleSpecification, TileJSONSpecification, TileJSONSpecificationVector } from '../types/index.js';
import { isTileJSONSpecification } from '../types/index.js';
import { osm } from './osm.js';
import { satellite } from './satellite.js';

// The canonical set of Shortbread 1.0 source-layer IDs.
// If a TileJSON has vector_layers and enough of them match, we treat it as Shortbread.
const SHORTBREAD_SOURCE_LAYERS = new Set([
	'addresses',
	'aerialways',
	'boundaries',
	'boundary_labels',
	'bridges',
	'buildings',
	'dam_lines',
	'dam_polygons',
	'ferries',
	'land',
	'ocean',
	'pier_lines',
	'pier_polygons',
	'place_labels',
	'pois',
	'public_transport',
	'sites',
	'street_labels_points',
	'street_labels',
	'street_polygons',
	'streets',
	'water_lines',
	'water_polygons',
]);

const SATELLITE_HINTS = new Set(['satellite', 'aerial', 'ortho', 'imagery']);

function isVectorTileJSON(tj: TileJSONSpecification): tj is TileJSONSpecificationVector {
	return 'vector_layers' in tj && Array.isArray((tj as TileJSONSpecificationVector).vector_layers);
}

function isShortbread(tj: TileJSONSpecificationVector): boolean {
	const ids = tj.vector_layers.map((l) => l.id);
	if (ids.length === 0) return false;
	const matches = ids.filter((id) => SHORTBREAD_SOURCE_LAYERS.has(id)).length;
	// Require at least 3 matching layers OR ≥50% match rate
	return matches >= 3 || matches / ids.length >= 0.5;
}

// Deterministic hue from a string (djb2 hash → 0–359).
function stringToHue(s: string): number {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
	return Math.abs(h) % 360;
}

// Build a simple inspector style: one fill + one line + one symbol layer per source-layer,
// each with a unique hue derived from the layer name. Useful for visualising unknown vector tiles.
function buildInspectorStyle(tj: TileJSONSpecificationVector): StyleSpecification {
	const sourceName = 'tiles';
	const sourceSpec: Record<string, unknown> = {
		type: 'vector',
		tiles: tj.tiles,
		scheme: tj.scheme ?? 'xyz',
	};
	if (tj.minzoom !== undefined) sourceSpec['minzoom'] = tj.minzoom;
	if (tj.maxzoom !== undefined) sourceSpec['maxzoom'] = tj.maxzoom;
	if (tj.bounds) sourceSpec['bounds'] = tj.bounds;
	if (tj.attribution) sourceSpec['attribution'] = tj.attribution;

	const layers: StyleSpecification['layers'] = [
		{
			id: 'background',
			type: 'background',
			paint: { 'background-color': '#f8f4f0' },
		} as StyleSpecification['layers'][number],
	];

	for (const vl of tj.vector_layers) {
		const hue = stringToHue(vl.id);
		const fillColor = `hsl(${hue}, 40%, 70%)`;
		const lineColor = `hsl(${hue}, 60%, 40%)`;

		layers.push({
			id: `${vl.id}-fill`,
			type: 'fill',
			source: sourceName,
			'source-layer': vl.id,
			paint: { 'fill-color': fillColor, 'fill-opacity': 0.4 },
		} as StyleSpecification['layers'][number]);

		layers.push({
			id: `${vl.id}-line`,
			type: 'line',
			source: sourceName,
			'source-layer': vl.id,
			paint: { 'line-color': lineColor, 'line-width': 1 },
		} as StyleSpecification['layers'][number]);

		layers.push({
			id: `${vl.id}-label`,
			type: 'symbol',
			source: sourceName,
			'source-layer': vl.id,
			layout: {
				'text-field': ['get', 'name'],
				'text-size': 11,
				'text-max-width': 6,
			},
			paint: { 'text-color': lineColor, 'text-halo-color': '#fff', 'text-halo-width': 1 },
		} as StyleSpecification['layers'][number]);
	}

	return {
		version: 8,
		sources: { [sourceName]: sourceSpec } as unknown as StyleSpecification['sources'],
		layers,
	};
}

// Build a minimal raster style for a raster TileJSON.
function buildRasterStyle(tj: TileJSONSpecification): StyleSpecification {
	const sourceName = isSatelliteHint(tj) ? 'satellite' : 'raster';
	const sourceSpec: Record<string, unknown> = {
		type: 'raster',
		tiles: tj.tiles,
		tileSize: (tj as TileJSONSpecification & { tile_size?: number }).tile_size ?? 256,
	};
	if (tj.minzoom !== undefined) sourceSpec['minzoom'] = tj.minzoom;
	if (tj.maxzoom !== undefined) sourceSpec['maxzoom'] = tj.maxzoom;
	if (tj.bounds) sourceSpec['bounds'] = tj.bounds;
	if (tj.attribution) sourceSpec['attribution'] = tj.attribution;

	if (isSatelliteHint(tj)) {
		return satellite({ urls: { satellite: tj } });
	}

	return {
		version: 8,
		sources: { [sourceName]: sourceSpec } as unknown as StyleSpecification['sources'],
		layers: [
			{
				id: 'background',
				type: 'background',
				paint: { 'background-color': '#000' },
			} as StyleSpecification['layers'][number],
			{
				id: sourceName,
				type: 'raster',
				source: sourceName,
			} as StyleSpecification['layers'][number],
		],
	};
}

function isSatelliteHint(tj: TileJSONSpecification): boolean {
	const name = ((tj as { name?: string }).name ?? '').toLowerCase();
	return SATELLITE_HINTS.has(name) || [...SATELLITE_HINTS].some((hint) => name.includes(hint));
}

/**
 * Inspect a TileJSON and return the most appropriate MapLibre style:
 * - Shortbread vector tiles → full `osm()` style
 * - Unknown vector tiles → inspector style (one color-coded fill+line+label per source-layer)
 * - Raster tiles with satellite name hint → `satellite()` style
 * - Other raster tiles → minimal single-layer raster style
 *
 * Never throws — always returns a valid StyleSpecification.
 */
export function guessStyle(tileJSON: TileJSONSpecification): StyleSpecification {
	try {
		isTileJSONSpecification(tileJSON);
		if (isVectorTileJSON(tileJSON)) {
			if (isShortbread(tileJSON)) {
				return osm({ urls: { osm: tileJSON } });
			}
			return buildInspectorStyle(tileJSON);
		}
		return buildRasterStyle(tileJSON);
	} catch {
		// Fallback: return a blank style rather than throwing
		return { version: 8, sources: {}, layers: [] };
	}
}

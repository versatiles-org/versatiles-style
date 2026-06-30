import type {
	FetchLike,
	StyleSpecification,
	TileJSONSpecification,
	TileJSONSpecificationVector,
} from '../types/index.js';
import { isTileJSONSpecification } from '../types/index.js';
import { loadTileSource, resolveTileJSONTiles } from '../lib/loadTileSource.js';
import { osm } from './osm.js';
import { satellite } from './satellite.js';
import { resolveUrl } from '../lib/utils.js';

/** Options for {@link guessStyle}. */
export type GuessStyleOptions = {
	/** Base URL that relative `tiles[]` entries are resolved against. Defaults to the page origin. */
	base?: string;
	/** Custom `fetch` used to download any nested TileJSON sources. Defaults to the global `fetch`. */
	fetch?: FetchLike;
};

const DEFAULT_BASE = globalThis?.document?.location?.origin ?? 'https://tiles.versatiles.org';

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
function buildInspectorStyle(tj: TileJSONSpecificationVector, base: string): StyleSpecification {
	const sourceName = 'tiles';
	const sourceSpec: Record<string, unknown> = {
		type: 'vector',
		tiles: resolveTileJSONTiles(tj, base).tiles,
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
async function buildRasterStyle(
	url: string,
	tj: TileJSONSpecification,
	options?: GuessStyleOptions
): Promise<StyleSpecification> {
	const base = options?.base ?? DEFAULT_BASE;
	const sourceName = isSatelliteHint(tj) ? 'satellite' : 'raster';
	const sourceSpec: Record<string, unknown> = {
		type: 'raster',
		tiles: resolveTileJSONTiles(tj, base).tiles,
		tileSize: (tj as TileJSONSpecification & { tile_size?: number }).tile_size ?? 256,
	};
	if (tj.minzoom !== undefined) sourceSpec['minzoom'] = tj.minzoom;
	if (tj.maxzoom !== undefined) sourceSpec['maxzoom'] = tj.maxzoom;
	if (tj.bounds) sourceSpec['bounds'] = tj.bounds;
	if (tj.attribution) sourceSpec['attribution'] = tj.attribution;

	if (isSatelliteHint(tj)) {
		return satellite({ urls: { satellite: url, base: options?.base, fetch: options?.fetch } });
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
export async function guessStyle(url: string, options?: GuessStyleOptions): Promise<StyleSpecification> {
	if (!url || typeof url !== 'string') {
		throw new TypeError('guessStyle: url must be a non-empty string');
	}

	url = resolveUrl(options?.base ?? DEFAULT_BASE, url);
	const tileJSON = await loadTileSource(url, options?.fetch);
	try {
		isTileJSONSpecification(tileJSON);
		if (isVectorTileJSON(tileJSON)) {
			if (isShortbread(tileJSON)) {
				return await osm({ urls: { osm: url, base: options?.base, fetch: options?.fetch } });
			}
			return buildInspectorStyle(tileJSON, options?.base ?? DEFAULT_BASE);
		}
		return await buildRasterStyle(url, tileJSON, options);
	} catch {
		// Fallback: return a blank style rather than throwing
		return { version: 8, sources: {}, layers: [] };
	}
}

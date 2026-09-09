import type { TileJSONSpecification } from '../types/index.js';
import type { TileSource } from '../options/urls.js';
import { normalizeAttribution } from './utils.js';

/**
 * Build a MapLibre source descriptor from a tile source, without any I/O.
 *
 * Three input shapes, three outputs:
 *
 * - a **TileJSON URL** → `{ url }`. MapLibre fetches it at map load and fills in
 *   `tiles`, zooms, `bounds` and `attribution` itself. Nothing to inline, nothing to
 *   go stale. Run {@link inlineSources} afterwards if the style must be self-contained.
 * - a **raw tile template** (contains `{z}`) → `{ tiles: [template] }`. There is no
 *   document to read, so nothing else can be stated.
 * - a **pre-fetched TileJSON** → every field inlined, no `url`.
 *
 * Never emit both `url` and `tiles`: MapLibre would fetch the TileJSON and then discard
 * it, because explicit source options take precedence over the fetched document.
 */
export function buildSourceDescriptor(
	type: 'vector' | 'raster' | 'raster-dem',
	source: TileSource,
	extra: Record<string, unknown> = {}
): Record<string, unknown> {
	if (typeof source === 'string') {
		return source.includes('{z}') ? { type, tiles: [source], ...extra } : { type, url: source, ...extra };
	}
	return { type, ...inlinedFields(source), ...extra };
}

/** The subset of a TileJSON that belongs in a MapLibre source descriptor. */
export function inlinedFields(tj: TileJSONSpecification & { tile_size?: number }): Record<string, unknown> {
	return {
		...(tj.tiles && { tiles: tj.tiles }),
		...(tj.minzoom !== undefined && { minzoom: tj.minzoom }),
		...(tj.maxzoom !== undefined && { maxzoom: tj.maxzoom }),
		...(tj.bounds && { bounds: tj.bounds }),
		...(tj.attribution && { attribution: normalizeAttribution(tj.attribution) }),
		// Only declare tileSize when the document states one (see the tile_size fix).
		...(tj.tile_size !== undefined && { tileSize: tj.tile_size }),
	};
}

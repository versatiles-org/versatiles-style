import type { FetchLike, TileJSONSpecification } from '../types/index.js';
import { resolveUrl } from './utils.js';

/**
 * Rewrite a TileJSON's `tiles[]` entries to absolute URLs against `base`,
 * preserving `{z}/{x}/{y}` placeholders. Absolute entries are left unchanged
 * by `resolveUrl`. Returns a shallow copy; the input is not mutated.
 */
export function resolveTileJSONTiles(tj: TileJSONSpecification, base: string): TileJSONSpecification {
	if (!Array.isArray(tj.tiles)) return tj;
	return { ...tj, tiles: tj.tiles.map((tile) => resolveUrl(base, tile)) };
}

/**
 * Resolve a tile source into the form that gets embedded into a style source:
 *
 * - `.json` string  → fetch the TileJSON document, then rewrite its relative
 *   `tiles[]` against the document URL (so relative paths inside the TileJSON
 *   become absolute).
 * - template string → returned unchanged (used directly as a tile URL pattern).
 * - TileJSON object → relative `tiles[]` rewritten against `base`.
 *
 * `fetchFn` defaults to the global `fetch`. If a `.json` source must be loaded
 * and no fetch implementation is available, an error is thrown.
 */
export async function loadTileSource(src: string, base: string, fetchFn?: FetchLike): Promise<TileJSONSpecification> {
	if (typeof src !== 'string') {
		return resolveTileJSONTiles(src, base);
	}

	const doFetch = fetchFn ?? (globalThis.fetch as FetchLike | undefined);
	if (!doFetch) {
		throw new Error(`Cannot load TileJSON from "${src}": no fetch implementation available. Pass a \`fetch\` option.`);
	}

	const response = await doFetch(src);
	if (!response.ok) {
		throw new Error(`Failed to fetch TileJSON from "${src}": HTTP ${response.status}`);
	}

	const tj = (await response.json()) as TileJSONSpecification;
	// Relative tile paths in a TileJSON are resolved against the TileJSON URL.
	return resolveTileJSONTiles(tj, src);
}

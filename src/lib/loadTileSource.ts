import type { FetchLike, TileJSONSpecification } from '../types/index.js';
import { resolveUrl } from './utils.js';

/**
 * A string source URL points to a TileJSON document (to be downloaded) if its
 * path ends in `.json`. Anything else (e.g. `…/{z}/{x}/{y}`) is a tile URL
 * template that is used directly.
 */
export function isTileJSONUrl(url: string): boolean {
	let pathname = url;
	try {
		pathname = new URL(url, 'http://example.org').pathname;
	} catch {
		// not a parseable URL — fall back to the raw string
	}
	return /\.json$/i.test(pathname);
}

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
export async function loadTileSource(
	src: string | TileJSONSpecification,
	base: string,
	fetchFn?: FetchLike
): Promise<string | TileJSONSpecification> {
	if (typeof src !== 'string') {
		return resolveTileJSONTiles(src, base);
	}

	if (!isTileJSONUrl(src)) {
		// A tile URL template (e.g. `…/{z}/{x}/{y}`) — use it directly.
		return src;
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

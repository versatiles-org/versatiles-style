import type { TileJSONSpecification } from '../types/index.js';
import type { FetchLike } from '../options/index.js';
import { resolveUrl } from './utils.js';

// In-memory cache of successful response bodies, keyed by request URL.
// Promises (not resolved Blobs) are stored so concurrent requests for the same
// URL share a single network round-trip.
const blobCache = new Map<string, Promise<Blob>>();

/** Clear the in-memory response cache used by {@link cachingFetch}. */
export function clearTileSourceCache(): void {
	blobCache.clear();
}

// The cache key for a request, or undefined for requests that must not be
// cached (anything other than a simple GET by URL).
function cacheKey(input: RequestInfo | URL, init?: RequestInit): string | undefined {
	const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
	if (method !== 'GET') return undefined;
	if (typeof input === 'string') return input;
	if (input instanceof URL) return input.href;
	if (input instanceof Request) return input.url;
	return undefined;
}

/**
 * A `fetch`-compatible function that caches successful response bodies (as
 * Blobs) in a module-level Map, keyed by URL. Repeated loads of the same source
 * are served from memory instead of re-hitting the network. Only simple GET
 * requests are cached; failed responses and other methods fall through to the
 * global `fetch` and are never cached. A fresh `Response` is returned on every
 * call, so the cached body can be read any number of times.
 */
export const cachingFetch: FetchLike = async (input, init) => {
	const key = cacheKey(input, init);
	if (key === undefined) return globalThis.fetch(input, init);

	let blob = blobCache.get(key);
	if (blob === undefined) {
		blob = globalThis.fetch(input, init).then((response) => {
			if (!response.ok) throw new Error(`Failed to fetch "${key}": HTTP ${response.status}`);
			return response.blob();
		});
		blobCache.set(key, blob);
		// Don't keep failed requests cached — allow a later retry.
		blob.catch(() => blobCache.delete(key));
	}
	return new Response(await blob);
};

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
 * Fetch a TileJSON document from `src` and resolve it into the form that gets
 * embedded into a style source: the document is always downloaded, parsed as
 * JSON, and its relative `tiles[]` entries are rewritten against the document
 * URL (so relative paths inside the TileJSON become absolute).
 *
 * `src` must be a URL pointing at a TileJSON document — it is always fetched and
 * the response is always parsed as JSON. Raw tile-template URLs (e.g.
 * `.../{z}/{x}/{y}.png`) are not accepted here; callers that already hold a
 * TileJSON object should skip this function.
 *
 * `fetchFn` defaults to {@link cachingFetch}, which caches response bodies in
 * memory. If no fetch implementation is available, an error is thrown.
 */
export async function loadTileSource(src: string, fetchFn?: FetchLike): Promise<TileJSONSpecification> {
	const doFetch = fetchFn ?? ((globalThis.fetch as FetchLike | undefined) ? cachingFetch : undefined);
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

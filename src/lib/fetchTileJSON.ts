import { checkKeys } from '../options/keys.js';
import type { TileJSONSpecification } from '../types/index.js';
import type { FetchLike } from '../options/urls.js';
import { loadTileSource } from './loadTileSource.js';

/**
 * Download a TileJSON document and make its relative `tiles[]` entries absolute.
 *
 * `osm()` and `satellite()` do no I/O, so this is how you obtain a TileJSON when the
 * style needs one at build time — to inline it via `urls`, or to inspect it with
 * `osm.languages()`. To resolve an already-built style instead, use `inlineSources()`.
 */
export async function fetchTileJSON(url: string, options?: { fetch?: FetchLike }): Promise<TileJSONSpecification> {
	checkKeys(options, { fetch: true }, 'fetchTileJSON');
	return loadTileSource(url, options?.fetch);
}

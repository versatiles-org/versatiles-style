import type { StyleSpecification } from '../types/index.js';
import type { FetchLike } from '../options/urls.js';
import { loadTileSource } from './loadTileSource.js';
import { inlinedFields } from './tileSource.js';

/**
 * Resolve every `url`-referencing source in a style into an inlined, self-contained one.
 *
 * This is the asynchronous half of the API: `osm()` and `satellite()` build a style with
 * no I/O, and this fetches whatever those styles left as a reference. It is orthogonal to
 * style building — it works on any style, including `guessStyle()` output and hand-written
 * documents.
 *
 * Use it when the style must stand on its own: published `style.json` artifacts, offline
 * or air-gapped deployments, and anywhere the first tile request should not wait for a
 * TileJSON round-trip. It is also the only place that can set the two properties MapLibre
 * cannot infer from a TileJSON — raster `tileSize` and raster-dem `encoding`.
 *
 * Returns a new style; the input is not mutated. Sources without a `url` are left alone.
 */
export async function inlineSources(
	style: StyleSpecification,
	options?: { fetch?: FetchLike }
): Promise<StyleSpecification> {
	const sources: Record<string, unknown> = { ...(style.sources as Record<string, unknown>) };

	await Promise.all(
		Object.entries(sources).map(async ([id, value]) => {
			if (typeof value !== 'object' || value === null) return;
			const source = value as Record<string, unknown>;
			const url = source.url;
			if (typeof url !== 'string') return;

			const tj = (await loadTileSource(url, options?.fetch)) as Parameters<typeof inlinedFields>[0];
			const resolved: Record<string, unknown> = { ...source, ...inlinedFields(tj) };
			delete resolved.url;

			// `encoding` is a MapLibre source property, not a TileJSON field, so it can only be
			// derived here. Leave an explicit caller-set encoding alone.
			if (source.type === 'raster-dem' && source.encoding === undefined) {
				const schema = (tj as { tile_schema?: string; encoding?: string }).tile_schema;
				const encoding = (tj as { encoding?: string }).encoding;
				resolved.encoding = encoding === 'mapbox' || schema === 'dem/mapbox' ? 'mapbox' : 'terrarium';
			}

			sources[id] = resolved;
		})
	);

	return { ...style, sources: sources as StyleSpecification['sources'] };
}

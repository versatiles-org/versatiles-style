import { checkKeys } from '../options/index.js';
import type { FetchLike } from '../options/index.js';
import { assertTileJSONSpecification } from '../types/index.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
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
 * Every fetched document is checked before it is inlined: it must be a valid TileJSON, and it must
 * describe the kind of tiles the source claims — a `type: "vector"` source needs a TileJSON with
 * `vector_layers`, a raster or raster-dem source one without. A `url` pointing at the wrong tileset
 * fails here, naming the offending source, rather than turning into an empty map later.
 *
 * Returns a new style; the input is not mutated. Sources without a `url` are left alone.
 */
export async function inlineSources(
	style: StyleSpecification,
	options?: { fetch?: FetchLike }
): Promise<StyleSpecification> {
	checkKeys(options, { fetch: true }, 'inlineSources');
	const sources: Record<string, unknown> = { ...(style.sources as Record<string, unknown>) };

	await Promise.all(
		Object.entries(sources).map(async ([id, value]) => {
			if (typeof value !== 'object' || value === null) return;
			const source = value as Record<string, unknown>;
			const url = source.url;
			if (typeof url !== 'string') return;

			const tj = await loadTileSource(url, options?.fetch);
			assertUsableAs(tj, source.type, id, url);

			const resolved: Record<string, unknown> = { ...source, ...inlinedFields(tj) };
			delete resolved.url;

			// `encoding` is a MapLibre source property, not a TileJSON field, so it can only be
			// derived here. Leave an explicit caller-set encoding alone.
			if (source.type === 'raster-dem' && source.encoding === undefined) {
				resolved.encoding = tj.encoding === 'mapbox' || tj.tile_schema === 'dem/mapbox' ? 'mapbox' : 'terrarium';
			}

			sources[id] = resolved;
		})
	);

	return { ...style, sources: sources as StyleSpecification['sources'] };
}

/** The MapLibre source types that carry a TileJSON `url`, and whether each one wants vector tiles. */
const WANTS_VECTOR: Record<string, boolean> = { vector: true, raster: false, 'raster-dem': false };

/**
 * Check that a fetched TileJSON is valid and describes the kind of tiles the source claims.
 *
 * `loadTileSource` parses the response and casts, so before this every document that was JSON at all
 * got inlined. That made the two failures a wrong `url` actually produces silent: a document with no
 * `tiles` inlined into a source with nothing left to fetch, and a raster tileset behind a
 * `type: 'vector'` source (or the reverse — an OSM vector tileset behind `type: 'raster'`) inlined
 * cleanly and surfaced only as an empty map, with nothing pointing back at which source was wrong.
 *
 * Vector-ness is read from `vector_layers`, as everywhere else in this library (see `guessSchema`):
 * a TileJSON that lists them describes vector tiles, one that does not describes raster. TileJSON
 * 3.0.0 requires them of every vector tileset. Source types other than the three below are left to
 * the shape check alone — only these three are resolved from a TileJSON.
 */
function assertUsableAs(tj: TileJSONSpecification, type: unknown, id: string, url: string): void {
	const where = `inlineSources: source "${id}" (${url})`;

	try {
		assertTileJSONSpecification(tj);
	} catch (cause) {
		const detail = cause instanceof Error ? cause.message : String(cause);
		throw new Error(`${where} did not return a valid TileJSON — ${detail}`, { cause });
	}

	if (typeof type !== 'string') return;
	const wantsVector = WANTS_VECTOR[type];
	if (wantsVector === undefined) return;

	// Shallow on purpose, matching `assertTileJSONSpecification`: the question here is only which
	// kind of tileset this is, not whether every layer is fully described.
	const isVector = Array.isArray((tj as { vector_layers?: unknown }).vector_layers);
	if (isVector === wantsVector) return;

	throw new Error(
		wantsVector
			? `${where} is declared \`type: "vector"\`, but the TileJSON lists no \`vector_layers\` — it describes raster tiles. Check the URL, or set the source type to "raster".`
			: `${where} is declared \`type: "${type}"\`, but the TileJSON lists \`vector_layers\` — it describes vector tiles. Check the URL, or set the source type to "vector".`
	);
}

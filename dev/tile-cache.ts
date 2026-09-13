import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { PMTilesSource } from '../scripts/lib/pmtiles.js';

/**
 * A caching tile proxy for the dev server, covering all three schemas.
 *
 * ── Why ───────────────────────────────────────────────────────────────────────
 *
 * Two problems, one fix. The dev map was slow because every tile, glyph and sprite went to a remote
 * origin on every reload — and Protomaps was slower still, because the *browser* had to read a 138 GB
 * PMTiles archive: a header request, a root-directory request, a leaf-directory request, then the tile,
 * with only the leaf cached and nothing surviving a page reload.
 *
 * Moving that work here solves both. The archive is opened once per server run (its directories cached
 * in memory), every response is written to disk, and the three sources are normalised to the same shape:
 *
 *     /tilecache/<schema>/tiles.json      → a TileJSON pointing at the line below
 *     /tilecache/<schema>/{z}/{x}/{y}     → the tile, from disk if it has been fetched before
 *
 * The frontend therefore treats Protomaps exactly like the other two — a vector source with a TileJSON
 * URL — and needs no PMTiles support at all. That is the whole reason `pmtiles` is no longer a
 * dependency of this package.
 *
 * ── What it is not ────────────────────────────────────────────────────────────
 *
 * A dev convenience, not a tile server. The cache never expires: it is keyed by schema and coordinate
 * with no regard for the upstream build date, because a style author wants yesterday's tiles instantly
 * rather than today's slowly. Delete `dev/.tiles/` to refetch.
 */

/** Where tiles land. Gitignored; delete it to invalidate everything. */
const CACHE_DIR = resolve(import.meta.dirname, '.tiles');

type Upstream = { kind: 'xyz'; tileJSON: string } | { kind: 'pmtiles'; resolveUrl: () => Promise<string> };

/**
 * Protomaps publishes one dated archive per day and no "latest" alias, so the newest is found by
 * walking back from today — once per server run, not once per tile.
 */
async function latestProtomapsBuild(): Promise<string> {
	const pad = (n: number) => String(n).padStart(2, '0');
	for (let back = 0; back < 21; back++) {
		const d = new Date();
		d.setUTCDate(d.getUTCDate() - back);
		const url = `https://build.protomaps.com/${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}.pmtiles`;
		const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
		if (res.status === 206) return url;
	}
	throw new Error('tile-cache: no Protomaps build found in the last 21 days');
}

const SOURCES: Record<string, Upstream> = {
	shortbread: { kind: 'xyz', tileJSON: 'https://tiles.versatiles.org/tiles/osm/tiles.json' },
	omt: { kind: 'xyz', tileJSON: 'https://tiles.openfreemap.org/planet' },
	protomaps: { kind: 'pmtiles', resolveUrl: latestProtomapsBuild },
};

/** What a schema's upstream turned out to be, resolved once and kept. */
type Resolved = {
	/** Fetch one tile; `undefined` where the source has none (ocean, out of range). */
	getTile: (z: number, x: number, y: number) => Promise<Uint8Array | undefined>;
	minzoom: number;
	maxzoom: number;
	vectorLayers: unknown[];
	/** For the log line, so it is obvious which build is being served. */
	label: string;
};

const resolved = new Map<string, Promise<Resolved>>();

/** Strip a gzip wrapper if the upstream left one on; MapLibre is served plain protobuf. */
function gunzipIfNeeded(body: Uint8Array): Uint8Array {
	return body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body;
}

async function resolveSource(schema: string, upstream: Upstream): Promise<Resolved> {
	if (upstream.kind === 'pmtiles') {
		const url = await upstream.resolveUrl();
		// Sequential, and through the open archive: opening it already read the header, and asking
		// `fetchMetadata` separately would read it again — four range requests where two will do.
		const archive = await PMTilesSource.open(url);
		const metadata = (await archive.getMetadata()) as { vector_layers?: unknown[] };
		return {
			getTile: (z, x, y) => archive.getTile(z, x, y),
			minzoom: archive.header.minzoom,
			maxzoom: archive.header.maxzoom,
			vectorLayers: metadata.vector_layers ?? [],
			label: url,
		};
	}

	const res = await fetch(upstream.tileJSON);
	if (!res.ok) throw new Error(`tile-cache: ${upstream.tileJSON} → HTTP ${res.status}`);
	const tj = (await res.json()) as {
		tiles?: string[];
		minzoom?: number;
		maxzoom?: number;
		vector_layers?: unknown[];
	};
	const template = tj.tiles?.[0];
	if (!template) throw new Error(`tile-cache: ${upstream.tileJSON} carries no tiles template`);
	return {
		getTile: async (z, x, y) => {
			// Substitute *before* resolving: the VersaTiles document serves a relative template, and
			// `new URL()` percent-encodes the braces, so resolving first yields `%7Bz%7D` and every fetch
			// asks the upstream for a tile literally named "{z}".
			const path = template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
			const url = new URL(path, upstream.tileJSON).href;
			const tile = await fetch(url);
			// 404 is how most tile servers say "nothing here", which is not an error.
			if (tile.status === 404 || tile.status === 204) return undefined;
			if (!tile.ok) throw new Error(`${url} → HTTP ${tile.status}`);
			return gunzipIfNeeded(new Uint8Array(await tile.arrayBuffer()));
		},
		minzoom: tj.minzoom ?? 0,
		maxzoom: tj.maxzoom ?? 14,
		vectorLayers: tj.vector_layers ?? [],
		label: template,
	};
}

function sourceFor(schema: string): Promise<Resolved> {
	const upstream = SOURCES[schema];
	if (!upstream) throw new Error(`tile-cache: unknown schema "${schema}"`);
	let entry = resolved.get(schema);
	if (!entry) {
		entry = resolveSource(schema, upstream);
		// A failed resolution must not be cached, or the server stays broken until restart.
		entry.catch(() => resolved.delete(schema));
		resolved.set(schema, entry);
	}
	return entry;
}

/**
 * In-flight deduplication.
 *
 * MapLibre asks for a screenful of tiles at once and re-asks the moment the style changes, so without
 * this the same coordinate is fetched several times over before the first response lands.
 */
const inFlight = new Map<string, Promise<Uint8Array | undefined>>();

async function readTile(schema: string, z: number, x: number, y: number): Promise<Uint8Array | undefined> {
	const file = resolve(CACHE_DIR, schema, String(z), String(x), `${y}.pbf`);
	if (existsSync(file)) {
		const cached = readFileSync(file);
		// A zero-byte file is how "upstream has no tile here" is remembered.
		return cached.length === 0 ? undefined : cached;
	}

	const key = `${schema}/${z}/${x}/${y}`;
	let pending = inFlight.get(key);
	if (!pending) {
		pending = (async () => {
			const source = await sourceFor(schema);
			if (z < source.minzoom || z > source.maxzoom) return undefined;
			const tile = await source.getTile(z, x, y);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, tile ?? new Uint8Array(0));
			return tile;
		})();
		// The `catch` matters: a bare `.finally()` returns a promise that rejects with the original error
		// and nobody awaits it, which takes the whole dev server down as an unhandled rejection. The real
		// error still reaches the request handler, which awaits `pending` itself.
		void pending.finally(() => inFlight.delete(key)).catch(() => undefined);
		inFlight.set(key, pending);
	}
	return pending;
}

const TILE_PATH = /^\/([a-z]+)\/(\d+)\/(\d+)\/(\d+)(?:\.pbf)?$/;

/** The dev-only caching tile proxy. Mounted at `/tilecache`. */
export function tileCache(): Plugin {
	return {
		name: 'tile-cache',
		configureServer(server) {
			server.middlewares.use('/tilecache', (req: IncomingMessage, res: ServerResponse, next) => {
				void (async () => {
					const path = (req.url ?? '').split('?')[0];
					try {
						const tileJSONMatch = /^\/([a-z]+)\/tiles\.json$/.exec(path);
						if (tileJSONMatch) {
							const schema = tileJSONMatch[1];
							const source = await sourceFor(schema);
							// Absolute, because MapLibre does not resolve a relative `tiles` template.
							const origin = `http://${req.headers.host ?? 'localhost:8080'}`;
							res.setHeader('Content-Type', 'application/json');
							res.end(
								JSON.stringify({
									tilejson: '3.0.0',
									tiles: [`${origin}/tilecache/${schema}/{z}/{x}/{y}`],
									minzoom: source.minzoom,
									maxzoom: source.maxzoom,
									vector_layers: source.vectorLayers,
								})
							);
							return;
						}

						const tileMatch = TILE_PATH.exec(path);
						if (!tileMatch) return next();
						const [, schema, z, x, y] = tileMatch;
						const tile = await readTile(schema, Number(z), Number(x), Number(y));
						res.setHeader('Content-Type', 'application/x-protobuf');
						// The style author reloads constantly; let the browser skip the round trip too.
						res.setHeader('Cache-Control', 'max-age=3600');
						if (!tile) {
							res.statusCode = 204;
							res.end();
							return;
						}
						res.end(Buffer.from(tile));
					} catch (error) {
						// Surface the reason in the response body: a failing tile is otherwise a blank map.
						res.statusCode = 500;
						res.setHeader('Content-Type', 'text/plain');
						res.end(`tile-cache: ${String(error)}`);
						server.config.logger.error(`tile-cache ${path}: ${String(error)}`);
					}
				})();
			});
		},
	};
}

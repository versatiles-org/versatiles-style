import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { PMTilesSource } from '../scripts/lib/pmtiles.js';
import { createLimiter, type Limiter } from '../scripts/lib/limit.js';

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

/**
 * How long one upstream tile request may take.
 *
 * A stalled fetch otherwise holds a MapLibre tile slot until the socket gives up, and the map shows a
 * hole with no explanation. The clock starts once the request has a connection slot (see
 * `concurrency` on each source), so this bounds the transfer, not the time spent queued behind others.
 */
const TILE_TIMEOUT_MS = 5_000;

/** The TileJSON is fetched once per server run, so it can afford to wait longer. */
const METADATA_TIMEOUT_MS = 5_000;

/** Attempts per upstream tile: one retry. */
const ATTEMPTS = 2;

/**
 * A transfer slower than this is logged even when it succeeds. Measured from when the request got a
 * connection slot — time spent queued is expected and is not what this is for. The total a browser
 * request waited, queue included, is in its `Server-Timing` header instead.
 */
const SLOW_MS = 3_000;

/** Read an error the way undici reports it: the useful part is usually in `cause`. */
function explain(error: unknown): string {
	if (!(error instanceof Error)) return String(error);
	const cause = error.cause ? ` (cause: ${String(error.cause)})` : '';
	return `${error.name}: ${error.message}${cause}`;
}

type Upstream = ({ kind: 'xyz'; tileJSON: string } | { kind: 'pmtiles'; resolveUrl: () => Promise<string> }) & {
	/**
	 * Parallel upstream requests for this source; unset means unlimited.
	 *
	 * Firing every request MapLibre makes at once was slower, not faster: past a few connections to one
	 * host the requests mostly compete for the same link, each one slows down, more of them cross the
	 * timeout, and the retries add load on top. For an archive this limits *range* requests, which
	 * include the leaf directories, not just tiles.
	 */
	concurrency?: number;
};

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
	// Unlimited: the VersaTiles tile server has answered in ~100 ms throughout, with no timeouts seen.
	shortbread: { kind: 'xyz', tileJSON: 'https://tiles.versatiles.org/tiles/osm/tiles.json' },
	omt: { kind: 'xyz', tileJSON: 'https://tiles.openfreemap.org/planet', concurrency: 4 },
	protomaps: { kind: 'pmtiles', resolveUrl: latestProtomapsBuild, concurrency: 2 },
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

/** An upstream answer that will not change on a retry. */
class PermanentError extends Error {}

/** Strip a gzip wrapper if the upstream left one on; MapLibre is served plain protobuf. */
function gunzipIfNeeded(body: Uint8Array): Uint8Array {
	return body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body;
}

async function resolveSource(schema: string, upstream: Upstream): Promise<Resolved> {
	if (upstream.kind === 'pmtiles') {
		const url = await upstream.resolveUrl();
		// Sequential, and through the open archive: opening it already read the header, and asking
		// `fetchMetadata` separately would read it again — four range requests where two will do.
		// The limit lives inside the reader, because one tile can take two range requests (a leaf
		// directory, then the tile) and both have to count against it.
		const archive = await PMTilesSource.open(url, { concurrency: upstream.concurrency });
		const metadata = (await archive.getMetadata()) as { vector_layers?: unknown[] };
		console.log(`  tile-cache: ${schema} → ${url} (${upstream.concurrency ?? 'default'} parallel)`);
		return {
			getTile: (z, x, y) => archive.getTile(z, x, y),
			minzoom: archive.header.minzoom,
			maxzoom: archive.header.maxzoom,
			vectorLayers: metadata.vector_layers ?? [],
			label: url,
		};
	}

	const res = await fetch(upstream.tileJSON, { signal: AbortSignal.timeout(METADATA_TIMEOUT_MS) });
	if (!res.ok) throw new Error(`tile-cache: ${upstream.tileJSON} → HTTP ${res.status}`);
	const tj = (await res.json()) as {
		tiles?: string[];
		minzoom?: number;
		maxzoom?: number;
		vector_layers?: unknown[];
	};
	const template = tj.tiles?.[0];
	if (!template) throw new Error(`tile-cache: ${upstream.tileJSON} carries no tiles template`);
	const limiter: Limiter | undefined = upstream.concurrency ? createLimiter(upstream.concurrency) : undefined;
	console.log(`  tile-cache: ${schema} → ${template} (${upstream.concurrency ?? 'unlimited'} parallel)`);
	return {
		getTile: async (z, x, y) => {
			// Substitute *before* resolving: the VersaTiles document serves a relative template, and
			// `new URL()` percent-encodes the braces, so resolving first yields `%7Bz%7D` and every fetch
			// asks the upstream for a tile literally named "{z}".
			const path = template.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
			const url = new URL(path, upstream.tileJSON).href;

			let lastError: unknown;
			for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
				try {
					// A slot per attempt: the timeout starts only once this request is actually running, and a
					// retry rejoins the back of the queue rather than holding a slot through its own failure.
					const once = async () => {
						const started = Date.now();
						const tile = await fetch(url, { signal: AbortSignal.timeout(TILE_TIMEOUT_MS) });
						// 404 and 204 are how tile servers say "nothing here", which is not a failure.
						if (tile.status === 404 || tile.status === 204) return undefined;
						// A 4xx will say the same thing next time; a 5xx or a dropped socket may not.
						if (tile.status >= 400 && tile.status < 500) {
							throw new PermanentError(`${url} → HTTP ${tile.status}`);
						}
						if (!tile.ok) throw new Error(`${url} → HTTP ${tile.status}`);
						const body = gunzipIfNeeded(new Uint8Array(await tile.arrayBuffer()));
						const ms = Date.now() - started;
						if (ms >= SLOW_MS) {
							const waiting = limiter ? `, ${limiter.queued} waiting` : '';
							console.warn(
								`  tile-cache: slow transfer ${schema} ${z}/${x}/${y} took ${ms}ms (${body.length} bytes${waiting})`
							);
						}
						return body;
					};
					return await (limiter ? limiter.run(once) : once());
				} catch (error) {
					lastError = error;
					if (error instanceof PermanentError || attempt === ATTEMPTS) break;
					console.warn(`  tile-cache: retrying ${schema} ${z}/${x}/${y} — ${explain(error)}`);
				}
			}
			throw new Error(`${schema} ${z}/${x}/${y} from ${url}: ${explain(lastError)}`, { cause: lastError });
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

/** Where a tile came from, so the log can say whether the cache is doing its job. */
export type TileResult = { tile?: Uint8Array; hit: boolean; ms: number };

async function readTile(schema: string, z: number, x: number, y: number): Promise<TileResult> {
	const started = Date.now();
	const file = resolve(CACHE_DIR, schema, String(z), String(x), `${y}.pbf`);
	if (existsSync(file)) {
		const cached = readFileSync(file);
		// A zero-byte file is how "upstream has no tile here" is remembered.
		return { tile: cached.length === 0 ? undefined : cached, hit: true, ms: Date.now() - started };
	}

	const key = `${schema}/${z}/${x}/${y}`;
	let pending = inFlight.get(key);
	if (!pending) {
		pending = (async () => {
			const source = await sourceFor(schema);
			if (z < source.minzoom || z > source.maxzoom) {
				console.log(`  tile-cache: ${key} outside z${source.minzoom}–${source.maxzoom}, not fetched`);
				return undefined;
			}
			// Slow transfers are logged where they happen — the HTTP fetch below, or the range read in the
			// PMTiles reader — exactly once each. This used to log from every request *waiting* on a fetch,
			// so a tile the browser asked for twice appeared twice with two durations, and the durations
			// included queue time, overstating how much of the network was slow.
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
	const tile = await pending;
	return { tile, hit: false, ms: Date.now() - started };
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
						const { tile, hit, ms } = await readTile(schema, Number(z), Number(x), Number(y));
						res.setHeader('Content-Type', 'application/x-protobuf');
						// The style author reloads constantly; let the browser skip the round trip too.
						res.setHeader('Cache-Control', 'max-age=3600');
						// Visible in the browser's network panel, so a slow tile can be traced without the
						// server log: which source answered, and whether it came off disk.
						res.setHeader('X-Tile-Cache', hit ? 'hit' : 'miss');
						res.setHeader('Server-Timing', `tile;dur=${ms}`);
						if (!tile) {
							res.statusCode = 204;
							res.end();
							return;
						}
						res.end(Buffer.from(tile));
					} catch (error) {
						// A failing tile is otherwise a hole in the map with no explanation, so say why in
						// three places: the response body, the browser console via a header, and the terminal.
						const reason = explain(error);
						res.statusCode = 500;
						res.setHeader('Content-Type', 'text/plain');
						res.setHeader('X-Tile-Cache', 'error');
						res.end(`tile-cache: ${reason}`);
						server.config.logger.error(`  tile-cache FAILED ${path}: ${reason}`, { timestamp: true });
					}
				})();
			});
		},
	};
}

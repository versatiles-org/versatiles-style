import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { PMTilesSource } from './pmtiles.js';
import { createLimiter, type Limiter } from './limit.js';

/**
 * A disk cache of vector tiles for all three schemas, and of the glyphs their styles load.
 *
 * ── Why ───────────────────────────────────────────────────────────────────────
 *
 * Two users, one cache. The dev map was slow because every tile, glyph and sprite went to a remote
 * origin on every reload — and Protomaps was slower still, because the *browser* had to read a 138 GB
 * PMTiles archive: a header request, a root-directory request, a leaf-directory request, then the tile,
 * with only the leaf cached and nothing surviving a page reload. The screenshot comparison of the three
 * schemas (`scripts/schema-compare/`) renders the same places again and again, and must not wait on — or
 * be broken by — a slow upstream either.
 *
 * So the archive is opened once per process (its directories cached in memory), every response is
 * written to disk, and the three sources are normalised to one shape: `sourceMetadata(schema)` and
 * `readTile(schema, z, x, y)`. `dev/tile-cache.ts` serves that over HTTP; the comparison reads it
 * directly.
 *
 * ── What it is not ────────────────────────────────────────────────────────────
 *
 * A dev convenience, not a tile server. The cache never expires: it is keyed by schema and coordinate
 * with no regard for the upstream build date, because a style author wants yesterday's tiles instantly
 * rather than today's slowly, and a comparison wants the same tiles on every run. The build a schema's
 * cache started from is recorded in its `metadata.json`. Delete `dev/.tiles/` to refetch.
 */

/**
 * Where tiles land. Gitignored; delete it to invalidate everything.
 *
 * `VERSATILES_TILE_CACHE` moves it. That exists for the tests, which must not write into a developer's
 * real cache — and read back what a previous run of the dev server happened to leave there — but it is
 * equally the knob for pointing a CI run or a second checkout at its own directory.
 */
export const CACHE_DIR = process.env.VERSATILES_TILE_CACHE
	? resolve(process.env.VERSATILES_TILE_CACHE)
	: resolve(import.meta.dirname, '../../dev/.tiles');

/** The schemas the cache serves. */
export const TILE_SCHEMAS = ['shortbread', 'omt', 'protomaps'] as const;
export type TileSchema = (typeof TILE_SCHEMAS)[number];

/** Options every read accepts. */
export type CacheOptions = {
	/** Never go to the network: a miss throws `CacheMiss` instead. */
	offline?: boolean;
};

/** A read that `offline` forbade from going to the network. */
export class CacheMiss extends Error {}

/**
 * How long one upstream tile request may take.
 *
 * A stalled fetch otherwise holds a MapLibre tile slot until the socket gives up, and the map shows a
 * hole with no explanation. The clock starts once the request has a connection slot (see
 * `concurrency` on each source), so this bounds the transfer, not the time spent queued behind others.
 */
const TILE_TIMEOUT_MS = 5_000;

/** The TileJSON is fetched once per process; the same bound as a tile has proved enough. */
const METADATA_TIMEOUT_MS = 5_000;

/** Attempts per upstream tile: one retry. */
const ATTEMPTS = 2;

/**
 * A transfer slower than this is logged even when it succeeds. Measured from when the request got a
 * connection slot — time spent queued is expected and is not what this is for.
 */
const SLOW_MS = 3_000;

/** Read an error the way undici reports it: the useful part is usually in `cause`. */
export function explain(error: unknown): string {
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
 * walking back from today — once per process, not once per tile.
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

const SOURCES: Record<TileSchema, Upstream> = {
	// Unlimited: the VersaTiles tile server has answered in ~100 ms throughout, with no timeouts seen.
	shortbread: { kind: 'xyz', tileJSON: 'https://tiles.versatiles.org/tiles/osm/tiles.json' },
	omt: { kind: 'xyz', tileJSON: 'https://tiles.openfreemap.org/planet', concurrency: 4 },
	protomaps: { kind: 'pmtiles', resolveUrl: latestProtomapsBuild, concurrency: 2 },
};

/** What a schema's tileset says about itself; persisted, so an offline run knows it too. */
export type SourceMetadata = {
	minzoom: number;
	maxzoom: number;
	vectorLayers: unknown[];
	/** The upstream the cache was filled from: a tile template or an archive URL, with its build date. */
	label: string;
	/** When the metadata was first fetched. */
	fetchedAt: string;
};

/** A schema's upstream, opened once and kept. */
type Resolved = SourceMetadata & {
	/** Fetch one tile; `undefined` where the source has none (ocean, out of range). */
	getTile: (z: number, x: number, y: number) => Promise<Uint8Array | undefined>;
};

const resolved = new Map<TileSchema, Promise<Resolved>>();

/** An upstream answer that will not change on a retry. */
class PermanentError extends Error {}

/** Strip a gzip wrapper if the upstream left one on; MapLibre is served plain protobuf. */
function gunzipIfNeeded(body: Uint8Array): Uint8Array {
	return body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body;
}

function assertSchema(schema: string): asserts schema is TileSchema {
	if (!(TILE_SCHEMAS as readonly string[]).includes(schema)) throw new Error(`tile-cache: unknown schema "${schema}"`);
}

async function resolveSource(schema: TileSchema, upstream: Upstream): Promise<Resolved> {
	const fetchedAt = new Date().toISOString();
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
			fetchedAt,
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
		fetchedAt,
	};
}

function sourceFor(schema: TileSchema): Promise<Resolved> {
	let entry = resolved.get(schema);
	if (!entry) {
		entry = resolveSource(schema, SOURCES[schema]);
		// A failed resolution must not be cached, or the process stays broken until restart.
		entry.catch(() => resolved.delete(schema));
		resolved.set(schema, entry);
	}
	return entry;
}

/**
 * A schema's zoom range, `vector_layers` and upstream label.
 *
 * Read from `<schema>/metadata.json` when the cache has one, so neither an offline run nor a warm one
 * contacts the upstream just to learn the zoom range; written there the first time it is fetched.
 */
export async function sourceMetadata(schema: string, options: CacheOptions = {}): Promise<SourceMetadata> {
	assertSchema(schema);
	const file = resolve(CACHE_DIR, schema, 'metadata.json');
	if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as SourceMetadata;
	if (options.offline) throw new CacheMiss(`tile-cache: no cached metadata for ${schema}`);
	const { minzoom, maxzoom, vectorLayers, label, fetchedAt } = await sourceFor(schema);
	const metadata: SourceMetadata = { minzoom, maxzoom, vectorLayers, label, fetchedAt };
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, JSON.stringify(metadata, null, '\t'));
	return metadata;
}

/**
 * In-flight deduplication.
 *
 * MapLibre asks for a screenful of tiles at once and re-asks the moment the style changes, so without
 * this the same coordinate is fetched several times over before the first response lands.
 */
const inFlight = new Map<string, Promise<Uint8Array | undefined>>();

/** Where a tile came from, so a log can say whether the cache is doing its job. */
export type TileResult = { tile?: Uint8Array; hit: boolean; ms: number };

/** Whether a tile is on disk — as data, or as the zero-byte file that remembers "no tile here". */
export function isTileCached(schema: TileSchema, z: number, x: number, y: number): boolean {
	return existsSync(tileFile(schema, z, x, y));
}

function tileFile(schema: TileSchema, z: number, x: number, y: number): string {
	return resolve(CACHE_DIR, schema, String(z), String(x), `${y}.pbf`);
}

export async function readTile(
	schema: string,
	z: number,
	x: number,
	y: number,
	options: CacheOptions = {}
): Promise<TileResult> {
	assertSchema(schema);
	const started = Date.now();
	const file = tileFile(schema, z, x, y);
	if (existsSync(file)) {
		const cached = readFileSync(file);
		// A zero-byte file is how "upstream has no tile here" is remembered.
		return { tile: cached.length === 0 ? undefined : cached, hit: true, ms: Date.now() - started };
	}
	if (options.offline) throw new CacheMiss(`tile-cache: ${schema} ${z}/${x}/${y} is not cached`);

	const key = `${schema}/${z}/${x}/${y}`;
	let pending = inFlight.get(key);
	if (!pending) {
		pending = (async () => {
			const source = await sourceFor(schema);
			if (z < source.minzoom || z > source.maxzoom) return undefined;
			// Slow transfers are logged where they happen — the HTTP fetch, or the range read in the
			// PMTiles reader — exactly once each, not by every request waiting on the same fetch.
			const tile = await source.getTile(z, x, y);
			mkdirSync(dirname(file), { recursive: true });
			writeFileSync(file, tile ?? new Uint8Array(0));
			return tile;
		})();
		// The `catch` matters: a bare `.finally()` returns a promise that rejects with the original error
		// and nobody awaits it, which takes the whole process down as an unhandled rejection. The real
		// error still reaches the caller, which awaits `pending` itself.
		void pending.finally(() => inFlight.delete(key)).catch(() => undefined);
		inFlight.set(key, pending);
	}
	const tile = await pending;
	return { tile, hit: false, ms: Date.now() - started };
}

const assetInFlight = new Map<string, Promise<Uint8Array | undefined>>();

/**
 * Any other static resource by URL — in practice glyph ranges, which every schema's style loads alike
 * and which are otherwise the slowest thing left once tiles are cached. Stored under
 * `assets/<host>/<path>`; a 404 is remembered as a zero-byte file and read back as `undefined`.
 */
export async function readAsset(url: string, options: CacheOptions = {}): Promise<Uint8Array | undefined> {
	const { host, pathname } = new URL(url);
	const file = resolve(CACHE_DIR, 'assets', host, decodeURIComponent(pathname).replace(/^\/+/, ''));
	if (!file.startsWith(resolve(CACHE_DIR, 'assets'))) throw new Error(`tile-cache: refusing asset path ${url}`);
	if (existsSync(file)) {
		const cached = readFileSync(file);
		return cached.length === 0 ? undefined : cached;
	}
	if (options.offline) throw new CacheMiss(`tile-cache: ${url} is not cached`);

	let pending = assetInFlight.get(url);
	if (!pending) {
		pending = (async () => {
			let lastError: unknown;
			for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
				try {
					const res = await fetch(url, { signal: AbortSignal.timeout(TILE_TIMEOUT_MS) });
					if (res.status === 404) {
						mkdirSync(dirname(file), { recursive: true });
						writeFileSync(file, new Uint8Array(0));
						return undefined;
					}
					if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
					const body = new Uint8Array(await res.arrayBuffer());
					mkdirSync(dirname(file), { recursive: true });
					writeFileSync(file, body);
					return body;
				} catch (error) {
					lastError = error;
				}
			}
			throw new Error(`tile-cache: ${url}: ${explain(lastError)}`, { cause: lastError });
		})();
		void pending.finally(() => assetInFlight.delete(url)).catch(() => undefined);
		assetInFlight.set(url, pending);
	}
	return pending;
}

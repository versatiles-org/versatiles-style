import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The tile cache, against a temporary directory and a stubbed `fetch`.
 *
 * The cache directory is redirected through `VERSATILES_TILE_CACHE` before the module is imported —
 * hence the dynamic import. Writing into the real `dev/.tiles` would both corrupt a developer's cache
 * and make these tests depend on whatever a previous dev-server run had left there, which is the kind
 * of test that passes alone and fails in CI.
 *
 * Nothing contacts the network. The upstreams are reached only through `fetch`, so stubbing the global
 * covers the TileJSON, the tiles and the assets alike.
 */

const CACHE = mkdtempSync(resolve(tmpdir(), 'versatiles-tile-cache-'));
process.env.VERSATILES_TILE_CACHE = CACHE;

const { CACHE_DIR, CacheMiss, explain, isTileCached, readAsset, readTile, sourceMetadata } =
	await import('./tile-cache.js');

afterAll(() => rmSync(CACHE, { recursive: true, force: true }));
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

function write(file: string, body: Uint8Array | string): void {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, body);
}

const tileFile = (schema: string, z: number, x: number, y: number) =>
	resolve(CACHE, schema, String(z), String(x), `${y}.pbf`);

// ── plumbing ──────────────────────────────────────────────────────────────────

describe('CACHE_DIR', () => {
	it('follows VERSATILES_TILE_CACHE, which is what keeps these tests off the real cache', () => {
		expect(CACHE_DIR).toBe(CACHE);
	});
});

describe('explain', () => {
	it('surfaces the cause, which is where undici puts the real reason', () => {
		const error = new TypeError('fetch failed', { cause: new Error('ECONNRESET') });
		expect(explain(error)).toBe('TypeError: fetch failed (cause: Error: ECONNRESET)');
	});

	it('reads an error without a cause, and a thrown non-error', () => {
		expect(explain(new Error('plain'))).toBe('Error: plain');
		expect(explain('a string')).toBe('a string');
	});
});

describe('an unknown schema', () => {
	it.each([
		['readTile', () => readTile('mapbox', 1, 1, 1)],
		['sourceMetadata', () => sourceMetadata('mapbox')],
	])('is rejected by %s before anything is fetched', async (_name, call) => {
		const fetchFn = vi.fn();
		vi.stubGlobal('fetch', fetchFn);
		await expect(call()).rejects.toThrow('tile-cache: unknown schema "mapbox"');
		expect(fetchFn).not.toHaveBeenCalled();
	});
});

// ── reading from disk ─────────────────────────────────────────────────────────

describe('a cached tile', () => {
	it('is read from disk without touching the network', async () => {
		const fetchFn = vi.fn();
		vi.stubGlobal('fetch', fetchFn);
		write(tileFile('shortbread', 5, 1, 2), new Uint8Array([1, 2, 3]));

		const result = await readTile('shortbread', 5, 1, 2);
		expect(result.hit).toBe(true);
		expect(Uint8Array.from(result.tile ?? [])).toStrictEqual(new Uint8Array([1, 2, 3]));
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('remembers "no tile here" as a zero-byte file, not as a miss', async () => {
		write(tileFile('shortbread', 5, 1, 3), new Uint8Array(0));
		// the distinction matters: a miss would refetch an absent tile on every single request
		await expect(readTile('shortbread', 5, 1, 3)).resolves.toStrictEqual({
			tile: undefined,
			hit: true,
			ms: expect.any(Number),
		});
	});

	it('is reported by isTileCached, including the zero-byte kind', () => {
		expect(isTileCached('shortbread', 5, 1, 2)).toBe(true);
		expect(isTileCached('shortbread', 5, 1, 3)).toBe(true);
		expect(isTileCached('shortbread', 9, 9, 9)).toBe(false);
	});
});

describe('offline', () => {
	it('turns a tile miss into CacheMiss rather than a request', async () => {
		const fetchFn = vi.fn();
		vi.stubGlobal('fetch', fetchFn);
		await expect(readTile('shortbread', 7, 7, 7, { offline: true })).rejects.toBeInstanceOf(CacheMiss);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('turns a metadata miss and an asset miss into CacheMiss too', async () => {
		await expect(sourceMetadata('protomaps', { offline: true })).rejects.toBeInstanceOf(CacheMiss);
		await expect(readAsset('https://fonts.invalid/x.pbf', { offline: true })).rejects.toBeInstanceOf(CacheMiss);
	});
});

describe('sourceMetadata', () => {
	it('prefers the cached metadata.json, so a warm run never asks upstream', async () => {
		const fetchFn = vi.fn();
		vi.stubGlobal('fetch', fetchFn);
		const metadata = {
			minzoom: 0,
			maxzoom: 14,
			vectorLayers: [{ id: 'water' }],
			label: 'https://example.invalid/{z}/{x}/{y}',
			fetchedAt: '2026-01-01T00:00:00.000Z',
		};
		write(resolve(CACHE, 'protomaps', 'metadata.json'), JSON.stringify(metadata));

		await expect(sourceMetadata('protomaps')).resolves.toStrictEqual(metadata);
		expect(fetchFn).not.toHaveBeenCalled();
	});
});

// ── fetching tiles from an xyz upstream ───────────────────────────────────────

const TILE_JSON = {
	tiles: ['https://tiles.invalid/{z}/{x}/{y}.pbf'],
	minzoom: 0,
	maxzoom: 14,
	vector_layers: [{ id: 'roads' }],
};

/** Answers the TileJSON, then hands each tile request to `onTile`. */
function upstream(onTile: (url: string) => Response | Promise<Response>) {
	const tiles: string[] = [];
	const fetchFn = vi.fn(async (url: string | URL) => {
		const href = String(url);
		if (href.endsWith('/planet')) return new Response(JSON.stringify(TILE_JSON), { status: 200 });
		tiles.push(href);
		return onTile(href);
	});
	vi.stubGlobal('fetch', fetchFn);
	return { fetchFn, tiles };
}

const body = new Uint8Array([9, 8, 7]);

/** `new Response` wants an `ArrayBuffer`, not a view onto a shared one — `slice` gives it its own. */
function bytes(data: Uint8Array): ArrayBuffer {
	return data.slice().buffer as ArrayBuffer;
}

describe('readTile against an xyz upstream', () => {
	beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => undefined));

	it('substitutes z/x/y into the template and caches the body', async () => {
		const { tiles } = upstream(() => new Response(bytes(body), { status: 200 }));
		const result = await readTile('omt', 3, 4, 5);

		expect(result.hit).toBe(false);
		expect(Uint8Array.from(result.tile ?? [])).toStrictEqual(body);
		// substituted before resolving, or the braces come back percent-encoded as %7Bz%7D
		expect(tiles).toStrictEqual(['https://tiles.invalid/3/4/5.pbf']);
		expect(Uint8Array.from(readFileSync(tileFile('omt', 3, 4, 5)))).toStrictEqual(body);
	});

	it('serves the same tile from disk next time', async () => {
		const { fetchFn } = upstream(() => new Response(bytes(body), { status: 200 }));
		await expect(readTile('omt', 3, 4, 5)).resolves.toMatchObject({ hit: true });
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('unwraps a gzipped tile, because MapLibre is served plain protobuf', async () => {
		upstream(() => new Response(bytes(new Uint8Array(gzipSync(body))), { status: 200 }));
		const result = await readTile('omt', 3, 4, 6);
		expect(Uint8Array.from(result.tile ?? [])).toStrictEqual(body);
	});

	it.each([404, 204])('remembers HTTP %i as "no tile here"', async (status) => {
		upstream(() => new Response(null, { status }));
		const z = status === 404 ? 4 : 5;
		await expect(readTile('omt', z, 1, 1)).resolves.toMatchObject({ tile: undefined, hit: false });
		expect(readFileSync(tileFile('omt', z, 1, 1))).toHaveLength(0);
	});

	it('does not request a tile outside the upstream zoom range', async () => {
		const { tiles } = upstream(() => new Response(bytes(body), { status: 200 }));
		await expect(readTile('omt', 20, 1, 1)).resolves.toMatchObject({ tile: undefined });
		expect(tiles).toStrictEqual([]);
	});

	it('retries a 500 once and says so', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		let calls = 0;
		upstream(() => (++calls === 1 ? new Response(null, { status: 500 }) : new Response(bytes(body), { status: 200 })));

		const result = await readTile('omt', 6, 1, 1);
		expect(Uint8Array.from(result.tile ?? [])).toStrictEqual(body);
		expect(calls).toBe(2);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('retrying omt 6/1/1'));
	});

	it('does not retry a 4xx, which would say the same thing again', async () => {
		const { tiles } = upstream(() => new Response(null, { status: 403 }));
		await expect(readTile('omt', 7, 1, 1)).rejects.toThrow(/HTTP 403/);
		expect(tiles).toHaveLength(1);
	});

	it('fetches one tile once however many callers ask at the same moment', async () => {
		const { tiles } = upstream(() => new Response(bytes(body), { status: 200 }));
		const results = await Promise.all([readTile('omt', 8, 1, 1), readTile('omt', 8, 1, 1), readTile('omt', 8, 1, 1)]);
		expect(results.every((r) => r.tile !== undefined)).toBe(true);
		expect(tiles).toHaveLength(1);
	});
});

// ── assets ────────────────────────────────────────────────────────────────────

describe('readAsset', () => {
	it('stores a body under assets/<host>/<path> and reads it back from disk', async () => {
		const fetchFn = vi.fn(() => new Response(bytes(body), { status: 200 }));
		vi.stubGlobal('fetch', fetchFn);

		const first = await readAsset('https://fonts.invalid/noto/0-255.pbf');
		expect(Uint8Array.from(first ?? [])).toStrictEqual(body);
		expect(Uint8Array.from(readFileSync(resolve(CACHE, 'assets/fonts.invalid/noto/0-255.pbf')))).toStrictEqual(body);

		const second = await readAsset('https://fonts.invalid/noto/0-255.pbf');
		expect(Uint8Array.from(second ?? [])).toStrictEqual(body);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('remembers a 404 as a zero-byte file and reads it back as undefined', async () => {
		const fetchFn = vi.fn(() => new Response(null, { status: 404 }));
		vi.stubGlobal('fetch', fetchFn);

		await expect(readAsset('https://fonts.invalid/missing.pbf')).resolves.toBeUndefined();
		await expect(readAsset('https://fonts.invalid/missing.pbf')).resolves.toBeUndefined();
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});

	it('retries, then reports the URL and the cause', async () => {
		const fetchFn = vi.fn(() => new Response(null, { status: 500 }));
		vi.stubGlobal('fetch', fetchFn);
		await expect(readAsset('https://fonts.invalid/broken.pbf')).rejects.toThrow(/broken\.pbf.*HTTP 500/);
		expect(fetchFn).toHaveBeenCalledTimes(2);
	});

	it('refuses a path that would escape the cache directory', async () => {
		const fetchFn = vi.fn();
		vi.stubGlobal('fetch', fetchFn);
		// Encoded *slashes*, not encoded dots. The URL parser resolves `%2e%2e` away while it is parsing,
		// so a literal `..` never survives to reach the guard — but `%2f` is left encoded in `pathname`
		// and only `decodeURIComponent` turns it back into a separator, after parsing is done. This one
		// lands on `/etc/passwd`, outside the cache entirely.
		await expect(readAsset('https://fonts.invalid/a%2f..%2f..%2f..%2fetc/passwd')).rejects.toThrow(
			/refusing asset path/
		);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('fetches once when several callers ask for the same URL at once', async () => {
		const fetchFn = vi.fn(() => new Response(bytes(body), { status: 200 }));
		vi.stubGlobal('fetch', fetchFn);
		const url = 'https://fonts.invalid/shared.pbf';
		await Promise.all([readAsset(url), readAsset(url), readAsset(url)]);
		expect(fetchFn).toHaveBeenCalledTimes(1);
	});
});

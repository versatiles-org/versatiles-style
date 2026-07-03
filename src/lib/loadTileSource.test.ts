import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { cachingFetch, clearTileSourceCache, loadTileSource, resolveTileJSONTiles } from './loadTileSource.js';
import type { TileJSONSpecification } from '../types/index.js';

export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('resolveTileJSONTiles()', () => {
	it('resolves relative tile paths against the base, preserving placeholders', () => {
		const tj = { tiles: ['{z}/{x}/{y}'] } as TileJSONSpecification;
		const out = resolveTileJSONTiles(tj, 'https://cdn.example/tiles/osm/tiles.json');
		expect(out.tiles[0]).toBe('https://cdn.example/tiles/osm/{z}/{x}/{y}');
	});

	it('leaves absolute tile URLs unchanged', () => {
		const tj = { tiles: ['https://other.example/{z}/{x}/{y}'] } as TileJSONSpecification;
		const out = resolveTileJSONTiles(tj, 'https://cdn.example/tiles.json');
		expect(out.tiles[0]).toBe('https://other.example/{z}/{x}/{y}');
	});

	it('does not mutate the input', () => {
		const tj = { tiles: ['{z}/{x}/{y}'] } as TileJSONSpecification;
		resolveTileJSONTiles(tj, 'https://cdn.example/tiles.json');
		expect(tj.tiles[0]).toBe('{z}/{x}/{y}');
	});
});

describe('loadTileSource()', () => {
	it('returns a tile URL', async () => {
		const fetchFn = vi.fn(async () => jsonResponse({ tiles: ['/tiles/temp/{z}/{x}/{y}'], maxzoom: 12 }));
		const out = await loadTileSource('https://cdn.example/tiles/temp/tiles.json', fetchFn);
		expect(out).toStrictEqual({
			maxzoom: 12,
			tiles: ['https://cdn.example/tiles/temp/{z}/{x}/{y}'],
		});
		expect(fetchFn).toHaveBeenCalled();
	});

	it('fetches a `.json` URL and resolves relative tiles against the document URL', async () => {
		const fetchFn = vi.fn(async () => jsonResponse({ tiles: ['{z}/{x}/{y}'], maxzoom: 12 }));
		const out = (await loadTileSource(
			'https://cdn.example/tiles/osm/tiles.json',
			fetchFn as unknown as typeof fetch
		)) as TileJSONSpecification;
		expect(fetchFn).toHaveBeenCalledWith('https://cdn.example/tiles/osm/tiles.json');
		expect(out.tiles[0]).toBe('https://cdn.example/tiles/osm/{z}/{x}/{y}');
		expect(out.maxzoom).toBe(12);
	});

	it('throws when the TileJSON request fails', async () => {
		const fetchFn = vi.fn(async () => jsonResponse({}, 404));
		await expect(loadTileSource('https://cdn.example/tiles.json', fetchFn as unknown as typeof fetch)).rejects.toThrow(
			/HTTP 404/
		);
	});

	it('throws when a `.json` source must be loaded but no fetch is available', async () => {
		const original = globalThis.fetch;
		// @ts-expect-error — simulate an environment without fetch
		delete globalThis.fetch;
		try {
			await expect(loadTileSource('https://cdn.example/tiles.json')).rejects.toThrow(/no fetch implementation/);
		} finally {
			globalThis.fetch = original;
		}
	});
});

describe('cachingFetch()', () => {
	let fetchSpy: MockInstance<typeof fetch>;

	beforeEach(() => {
		clearTileSourceCache();
		fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockClear();
	});

	afterEach(() => {
		clearTileSourceCache();
		vi.restoreAllMocks();
	});

	it('serves repeated GETs of the same URL from the cache (one network call)', async () => {
		fetchSpy.mockImplementation(async () => jsonResponse({ tiles: ['a'], maxzoom: 5 }));

		const first = await (await cachingFetch('https://cdn.example/tiles.json')).json();
		const second = await (await cachingFetch('https://cdn.example/tiles.json')).json();

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(first).toStrictEqual({ tiles: ['a'], maxzoom: 5 });
		expect(second).toStrictEqual(first);
	});

	it('dedupes concurrent requests for the same URL', async () => {
		fetchSpy.mockImplementation(async () => jsonResponse({ tiles: ['a'] }));

		await Promise.all([cachingFetch('https://cdn.example/a.json'), cachingFetch('https://cdn.example/a.json')]);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('does not cache failed responses (allows retry)', async () => {
		fetchSpy
			.mockImplementationOnce(async () => jsonResponse({}, 500))
			.mockImplementationOnce(async () => jsonResponse({ tiles: ['ok'] }));

		await expect(cachingFetch('https://cdn.example/flaky.json')).rejects.toThrow(/HTTP 500/);
		const retried = await (await cachingFetch('https://cdn.example/flaky.json')).json();

		expect(fetchSpy).toHaveBeenCalledTimes(2);
		expect(retried).toStrictEqual({ tiles: ['ok'] });
	});

	it('is used as the default and caches across loadTileSource calls', async () => {
		fetchSpy.mockImplementation(async () => jsonResponse({ tiles: ['{z}/{x}/{y}'], maxzoom: 9 }));

		const url = 'https://cdn.example/tiles/osm/tiles.json';
		const a = await loadTileSource(url);
		const b = await loadTileSource(url);

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(a.tiles[0]).toBe('https://cdn.example/tiles/osm/{z}/{x}/{y}');
		expect(b).toStrictEqual(a);
	});
});

describe('cachingFetch() — cache key by request type', () => {
	let fetchSpy: MockInstance<typeof fetch>;

	beforeEach(() => {
		clearTileSourceCache();
		fetchSpy = vi.spyOn(globalThis, 'fetch');
		fetchSpy.mockClear();
		fetchSpy.mockImplementation(async () => jsonResponse({ tiles: ['a'] }));
	});

	afterEach(() => {
		clearTileSourceCache();
		vi.restoreAllMocks();
	});

	it('caches a URL-object request by its href', async () => {
		const url = new URL('https://cdn.example/u.json');
		await cachingFetch(url);
		await cachingFetch(new URL('https://cdn.example/u.json'));
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('caches a Request-object GET by its url', async () => {
		await cachingFetch(new Request('https://cdn.example/r.json'));
		await cachingFetch(new Request('https://cdn.example/r.json'));
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('does not cache non-GET requests (falls straight through)', async () => {
		await cachingFetch('https://cdn.example/p.json', { method: 'POST' });
		await cachingFetch('https://cdn.example/p.json', { method: 'POST' });
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});

	it('does not cache a non-GET Request object', async () => {
		await cachingFetch(new Request('https://cdn.example/p.json', { method: 'DELETE' }));
		await cachingFetch(new Request('https://cdn.example/p.json', { method: 'DELETE' }));
		expect(fetchSpy).toHaveBeenCalledTimes(2);
	});
});

import { describe, expect, it, vi } from 'vitest';
import { isTileJSONUrl, loadTileSource, resolveTileJSONTiles } from './loadTileSource.js';
import type { TileJSONSpecification } from '../types/index.js';

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('isTileJSONUrl()', () => {
	it('treats `.json` paths as TileJSON documents', () => {
		expect(isTileJSONUrl('https://example.org/tiles/osm/tiles.json')).toBe(true);
		expect(isTileJSONUrl('/tiles/osm/tiles.json')).toBe(true);
		expect(isTileJSONUrl('https://example.org/tiles.json?foo=bar')).toBe(true);
	});

	it('treats tile URL templates as non-TileJSON', () => {
		expect(isTileJSONUrl('https://example.org/tiles/osm/{z}/{x}/{y}')).toBe(false);
		expect(isTileJSONUrl('/tiles/osm/{z}/{x}/{y}.pbf')).toBe(false);
	});
});

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
	it('returns a tile URL template unchanged (no fetch)', async () => {
		const fetchFn = vi.fn();
		const out = await loadTileSource('https://cdn.example/{z}/{x}/{y}', 'https://base.example', fetchFn);
		expect(out).toBe('https://cdn.example/{z}/{x}/{y}');
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('rewrites relative tiles of a TileJSON object against the given base (no fetch)', async () => {
		const fetchFn = vi.fn();
		const tj = { tiles: ['{z}/{x}/{y}'], minzoom: 2 } as TileJSONSpecification;
		const out = (await loadTileSource(tj, 'https://base.example/dir/', fetchFn)) as TileJSONSpecification;
		expect(out.tiles[0]).toBe('https://base.example/dir/{z}/{x}/{y}');
		expect(out.minzoom).toBe(2);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('fetches a `.json` URL and resolves relative tiles against the document URL', async () => {
		const fetchFn = vi.fn(async () => jsonResponse({ tiles: ['{z}/{x}/{y}'], maxzoom: 12 }));
		const out = (await loadTileSource(
			'https://cdn.example/tiles/osm/tiles.json',
			'https://ignored.example',
			fetchFn as unknown as typeof fetch
		)) as TileJSONSpecification;
		expect(fetchFn).toHaveBeenCalledWith('https://cdn.example/tiles/osm/tiles.json');
		expect(out.tiles[0]).toBe('https://cdn.example/tiles/osm/{z}/{x}/{y}');
		expect(out.maxzoom).toBe(12);
	});

	it('throws when the TileJSON request fails', async () => {
		const fetchFn = vi.fn(async () => jsonResponse({}, 404));
		await expect(
			loadTileSource('https://cdn.example/tiles.json', 'https://base.example', fetchFn as unknown as typeof fetch)
		).rejects.toThrow(/HTTP 404/);
	});

	it('throws when a `.json` source must be loaded but no fetch is available', async () => {
		const original = globalThis.fetch;
		// @ts-expect-error — simulate an environment without fetch
		delete globalThis.fetch;
		try {
			await expect(loadTileSource('https://cdn.example/tiles.json', 'https://base.example')).rejects.toThrow(
				/no fetch implementation/
			);
		} finally {
			globalThis.fetch = original;
		}
	});
});

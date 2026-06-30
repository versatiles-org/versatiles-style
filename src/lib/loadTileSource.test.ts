import { describe, expect, it, vi } from 'vitest';
import { loadTileSource, resolveTileJSONTiles } from './loadTileSource.js';
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

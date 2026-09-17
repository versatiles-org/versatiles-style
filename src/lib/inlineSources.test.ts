import { describe, expect, it, vi } from 'vitest';
import { inlineSources } from './inlineSources.js';
import type { StyleSpecification } from '../types/index.js';

const json = (body: unknown) =>
	new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

function styleWith(sources: Record<string, unknown>): StyleSpecification {
	return { version: 8, sources, layers: [] } as unknown as StyleSpecification;
}

// A minimal valid vector TileJSON. `vector_layers` is what marks a tileset as vector, so a
// `type: 'vector'` source will not inline a document that omits it.
const vectorTJ = { tiles: ['https://t/{z}/{x}/{y}'], vector_layers: [{ id: 'water', fields: {} }] };

describe('inlineSources()', () => {
	it('replaces a source `url` with the fetched TileJSON fields', async () => {
		const fetchFn = vi.fn(() =>
			Promise.resolve(json({ ...vectorTJ, minzoom: 0, maxzoom: 14, bounds: [-1, -2, 3, 4], attribution: '© x' }))
		);
		const out = await inlineSources(styleWith({ v: { type: 'vector', url: 'https://t/tiles.json' } }), {
			fetch: fetchFn,
		});
		const src = out.sources['v'] as Record<string, unknown>;
		expect(src).not.toHaveProperty('url');
		expect(src.tiles).toEqual(['https://t/{z}/{x}/{y}']);
		expect(src.maxzoom).toBe(14);
		expect(src.bounds).toEqual([-1, -2, 3, 4]);
		expect(src.attribution).toBe('© x');
	});

	it('leaves sources without a `url` untouched', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(json({})));
		const inline = { type: 'vector', tiles: ['https://t/{z}/{x}/{y}'] };
		const out = await inlineSources(styleWith({ v: inline }), { fetch: fetchFn });
		expect(out.sources['v']).toStrictEqual(inline);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('does not mutate the input style', async () => {
		const fetchFn = vi.fn(() => Promise.resolve(json(vectorTJ)));
		const input = styleWith({ v: { type: 'vector', url: 'https://t/tiles.json' } });
		await inlineSources(input, { fetch: fetchFn });
		expect(input.sources['v']).toStrictEqual({ type: 'vector', url: 'https://t/tiles.json' });
	});

	it('declares tileSize only when the TileJSON states tile_size', async () => {
		const withSize = await inlineSources(styleWith({ r: { type: 'raster', url: 'https://r/tiles.json' } }), {
			fetch: vi.fn(() => Promise.resolve(json({ tiles: ['https://r/{z}/{x}/{y}'], tile_size: 512 }))),
		});
		expect(withSize.sources['r'] as Record<string, unknown>).toMatchObject({ tileSize: 512 });

		const without = await inlineSources(styleWith({ r: { type: 'raster', url: 'https://r/tiles.json' } }), {
			fetch: vi.fn(() => Promise.resolve(json({ tiles: ['https://r/{z}/{x}/{y}'] }))),
		});
		expect(without.sources['r'] as Record<string, unknown>).not.toHaveProperty('tileSize');
	});

	it('derives raster-dem encoding from tile_schema, which MapLibre cannot infer', async () => {
		const mapbox = await inlineSources(styleWith({ e: { type: 'raster-dem', url: 'https://e/tiles.json' } }), {
			fetch: vi.fn(() => Promise.resolve(json({ tiles: ['https://e/{z}/{x}/{y}'], tile_schema: 'dem/mapbox' }))),
		});
		expect(mapbox.sources['e'] as Record<string, unknown>).toMatchObject({ encoding: 'mapbox' });

		const terrarium = await inlineSources(styleWith({ e: { type: 'raster-dem', url: 'https://e/tiles.json' } }), {
			fetch: vi.fn(() => Promise.resolve(json({ tiles: ['https://e/{z}/{x}/{y}'], tile_schema: 'dem/terrarium' }))),
		});
		expect(terrarium.sources['e'] as Record<string, unknown>).toMatchObject({ encoding: 'terrarium' });
	});

	it('keeps an explicitly set encoding', async () => {
		const out = await inlineSources(
			styleWith({ e: { type: 'raster-dem', url: 'https://e/tiles.json', encoding: 'terrarium' } }),
			{ fetch: vi.fn(() => Promise.resolve(json({ tiles: ['https://e/{z}/{x}/{y}'], tile_schema: 'dem/mapbox' }))) }
		);
		expect(out.sources['e'] as Record<string, unknown>).toMatchObject({ encoding: 'terrarium' });
	});
});

// A wrong `url` used to inline cleanly and surface only as an empty map, because the fetched
// document was cast, never checked. These are the failures that cast hid.
describe('inlineSources() validation', () => {
	const rasterTJ = { tiles: ['https://t/{z}/{x}/{y}'] };

	it('rejects a vector source whose TileJSON has no vector_layers', async () => {
		await expect(
			inlineSources(styleWith({ v: { type: 'vector', url: 'https://t/tiles.json' } }), {
				fetch: vi.fn(() => Promise.resolve(json(rasterTJ))),
			})
		).rejects.toThrow(/source "v" .*type: "vector".*no `vector_layers`/s);
	});

	it('rejects a raster source whose TileJSON has vector_layers', async () => {
		await expect(
			inlineSources(styleWith({ r: { type: 'raster', url: 'https://t/tiles.json' } }), {
				fetch: vi.fn(() => Promise.resolve(json(vectorTJ))),
			})
		).rejects.toThrow(/source "r" .*type: "raster".*lists `vector_layers`/s);
	});

	it('rejects a raster-dem source whose TileJSON has vector_layers', async () => {
		await expect(
			inlineSources(styleWith({ e: { type: 'raster-dem', url: 'https://t/tiles.json' } }), {
				fetch: vi.fn(() => Promise.resolve(json(vectorTJ))),
			})
		).rejects.toThrow(/type: "raster-dem"/);
	});

	it('rejects a document that is not a TileJSON at all', async () => {
		await expect(
			inlineSources(styleWith({ v: { type: 'vector', url: 'https://t/tiles.json' } }), {
				fetch: vi.fn(() => Promise.resolve(json({}))),
			})
		).rejects.toThrow(/did not return a valid TileJSON — .*spec\.tiles/);
	});

	it('names the offending source and its url', async () => {
		await expect(
			inlineSources(styleWith({ basemap: { type: 'vector', url: 'https://t/wrong.json' } }), {
				fetch: vi.fn(() => Promise.resolve(json(rasterTJ))),
			})
		).rejects.toThrow('inlineSources: source "basemap" (https://t/wrong.json)');
	});

	it('leaves source types it cannot resolve to the shape check alone', async () => {
		const out = await inlineSources(styleWith({ g: { type: 'geojson', url: 'https://t/tiles.json' } }), {
			fetch: vi.fn(() => Promise.resolve(json(vectorTJ))),
		});
		expect(out.sources['g'] as Record<string, unknown>).toMatchObject({ type: 'geojson' });
	});
});

// Upstream TileJSONs quote HTML attributes inconsistently (the satellite source uses single
// quotes, OSM and elevation use double), so a style inlining several sources would show mixed
// markup in one attribution bar. v5 normalised; v6 kept the helper but stopped calling it (F6).
describe('attribution normalisation', () => {
	it('rewrites single-quoted attributes to double', async () => {
		const out = await inlineSources(styleWith({ v: { type: 'vector', url: 'https://t/tiles.json' } }), {
			fetch: vi.fn(() => Promise.resolve(json({ ...vectorTJ, attribution: "<a href='https://x.example/'>X</a>" }))),
		});
		expect((out.sources['v'] as Record<string, unknown>).attribution).toBe('<a href="https://x.example/">X</a>');
	});

	it('collapses whitespace and trims', async () => {
		const out = await inlineSources(styleWith({ v: { type: 'vector', url: 'https://t/tiles.json' } }), {
			fetch: vi.fn(() => Promise.resolve(json({ ...vectorTJ, attribution: '  a \n\t b  ' }))),
		});
		expect((out.sources['v'] as Record<string, unknown>).attribution).toBe('a b');
	});

	it('leaves already-normalised markup untouched', async () => {
		const attribution = '<a href="https://x.example/" target="_blank">&copy; X</a>';
		const out = await inlineSources(styleWith({ v: { type: 'vector', url: 'https://t/tiles.json' } }), {
			fetch: vi.fn(() => Promise.resolve(json({ ...vectorTJ, attribution }))),
		});
		expect((out.sources['v'] as Record<string, unknown>).attribution).toBe(attribution);
	});
});

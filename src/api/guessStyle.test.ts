import { describe, expect, it, vi } from 'vitest';
import { guessStyle } from './guessStyle.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import { jsonResponse } from '../lib/loadTileSource.test.js';

function layerTypes(style: StyleSpecification): string[] {
	return style.layers.map((l) => l.type);
}

function sourceIds(style: StyleSpecification): string[] {
	return Object.keys(style.sources);
}

// ── Shortbread detection ──────────────────────────────────────────────────────

const fetchShortbreadFn = vi.fn(() =>
	Promise.resolve(
		jsonResponse({
			tiles: ['https://tiles.example.com/{z}/{x}/{y}'],
			vector_layers: [
				{ id: 'land', fields: {} },
				{ id: 'water_polygons', fields: {} },
				{ id: 'streets', fields: {} },
				{ id: 'buildings', fields: {} },
				{ id: 'place_labels', fields: { name: 'String', name_de: 'String' } },
			],
		})
	)
);

describe('guessStyle() — Shortbread vector tiles', () => {
	it('returns a full OSM style for Shortbread vector tiles', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchShortbreadFn });
		expect(style.version).toBe(8);
		// Should have many layers (OSM style has 50+)
		expect(style.layers.length).toBeGreaterThan(50);
	});

	it('sets the TileJSON as the OSM source', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchShortbreadFn });
		const src = style.sources['versatiles-shortbread'] as { url: string };
		expect(src).toBeDefined();
		// guessStyle fetches to classify the tileset, but the style it returns still
		// references the TileJSON rather than inlining it; use inlineSources for that.
		expect(src.url).toBe('https://tiles.example.com/tiles.json');
	});

	it('includes slot anchors in the OSM style', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchShortbreadFn });
		const ids = style.layers.map((l) => l.id);
		expect(ids).toContain('slot-below-fills');
		expect(ids).toContain('slot-below-symbols');
	});

	it('detects Shortbread with ≥3 matching layers even if others are unknown', async () => {
		const fetchFn = vi.fn(() =>
			Promise.resolve(
				jsonResponse({
					tiles: ['https://t/{z}/{x}/{y}'],
					vector_layers: [
						{ id: 'streets', fields: {} },
						{ id: 'buildings', fields: {} },
						{ id: 'place_labels', fields: {} },
						{ id: 'some_custom_layer', fields: {} },
					],
				})
			)
		);
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchFn });
		expect(style.layers.length).toBeGreaterThan(50);
	});

	it('does NOT treat 2-layer vector tiles with 0 Shortbread matches as Shortbread', async () => {
		const fetchFn = vi.fn(() =>
			Promise.resolve(
				jsonResponse({
					tiles: ['https://t/{z}/{x}/{y}'],
					vector_layers: [
						{ id: 'my_layer', fields: {} },
						{ id: 'other_layer', fields: {} },
					],
				})
			)
		);
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchFn });
		// Inspector style has far fewer layers
		expect(style.layers.length).toBeLessThan(50);
	});
});

// ── Inspector style (unknown vector) ──────────────────────────────────────────

const fetchUnknownVectorFn = vi.fn(() =>
	Promise.resolve(
		jsonResponse({
			tiles: ['https://custom.tiles/{z}/{x}/{y}'],
			vector_layers: [
				{ id: 'my_points', fields: { name: 'String' } },
				{ id: 'my_polygons', fields: {} },
			],
		})
	)
);

describe('guessStyle() — unknown vector tiles (inspector)', () => {
	it('returns a valid style', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchUnknownVectorFn });
		expect(style.version).toBe(8);
	});

	it('uses the tiles URL as the vector source', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchUnknownVectorFn });
		const srcId = sourceIds(style)[0];
		const src = style.sources[srcId] as { tiles: string[] };
		expect(src.tiles[0]).toBe('https://custom.tiles/{z}/{x}/{y}');
	});

	it('has a fill, line, and symbol layer per source-layer', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchUnknownVectorFn });
		const ids = style.layers.map((l) => l.id);
		expect(ids).toContain('my_points-fill');
		expect(ids).toContain('my_points-line');
		expect(ids).toContain('my_points-label');
		expect(ids).toContain('my_polygons-fill');
		expect(ids).toContain('my_polygons-line');
		expect(ids).toContain('my_polygons-label');
	});

	it('has a background layer', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchUnknownVectorFn });
		expect(layerTypes(style)).toContain('background');
	});

	it('assigns distinct hue-based colors to different source-layers', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchUnknownVectorFn });
		const color1 = (style.layers.find((l) => l.id === 'my_points-fill')?.paint as Record<string, string>)?.[
			'fill-color'
		];
		const color2 = (style.layers.find((l) => l.id === 'my_polygons-fill')?.paint as Record<string, string>)?.[
			'fill-color'
		];
		// Colors will differ for different layer names
		expect(color1).toBeDefined();
		expect(color2).toBeDefined();
		expect(color1).not.toBe(color2);
	});

	it('passes through minzoom/maxzoom', async () => {
		const fetchMinMaxFn = vi.fn(() =>
			Promise.resolve(
				jsonResponse({
					tiles: ['https://t/{z}/{x}/{y}'],
					minzoom: 4,
					maxzoom: 14,
					vector_layers: [{ id: 'layer_a', fields: {} }],
				})
			)
		);
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchMinMaxFn });
		const srcId = sourceIds(style)[0];
		const src = style.sources[srcId] as { minzoom: number; maxzoom: number };
		expect(src.minzoom).toBe(4);
		expect(src.maxzoom).toBe(14);
	});
});

// ── Raster tiles ──────────────────────────────────────────────────────────────

const fetchRasterFn = vi.fn(() =>
	Promise.resolve(
		jsonResponse({
			tiles: ['https://raster.tiles/{z}/{x}/{y}'],
		})
	)
);

describe('guessStyle() — raster tiles', () => {
	it('returns a valid style for raster tiles', async () => {
		const style = await guessStyle('https://raster.tiles/tiles.json', { fetch: fetchRasterFn });
		expect(style.version).toBe(8);
	});

	it('has a raster layer', async () => {
		const style = await guessStyle('https://raster.tiles/tiles.json', { fetch: fetchRasterFn });
		expect(layerTypes(style)).toContain('raster');
	});

	it('uses the tiles URL in the raster source', async () => {
		const style = await guessStyle('https://raster.tiles/tiles.json', { fetch: fetchRasterFn });
		const srcId = sourceIds(style)[0];
		const src = style.sources[srcId] as { tiles: string[]; type: string };
		expect(src.type).toBe('raster');
		expect(src.tiles[0]).toBe('https://raster.tiles/{z}/{x}/{y}');
	});

	it('uses satellite() for raster TileJSON with name = "satellite"', async () => {
		const satTJ: TileJSONSpecification = {
			tiles: ['https://sat.tiles/{z}/{x}/{y}'],
			name: 'satellite',
		};
		const style = await guessStyle('https://tiles.example.com/tiles.json', {
			fetch: vi.fn(() => Promise.resolve(jsonResponse(satTJ))),
		});
		// satellite() produces more than 3 layers (background, slot, raster at minimum)
		expect(style.sources).toHaveProperty('satellite');
	});

	it('uses satellite() for raster TileJSON with "aerial" in name', async () => {
		const aerialTJ: TileJSONSpecification = {
			tiles: ['https://sat.tiles/{z}/{x}/{y}'],
			name: 'Aerial imagery 2024',
		};
		const style = await guessStyle('https://tiles.example.com/tiles.json', {
			fetch: vi.fn(() => Promise.resolve(jsonResponse(aerialTJ))),
		});
		expect(style.sources).toHaveProperty('satellite');
	});
});

// ── Error safety ──────────────────────────────────────────────────────────────

describe('guessStyle() — never throws', () => {
	it('handles a minimal TileJSON with just tiles', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', {
			fetch: vi.fn(() => Promise.resolve(jsonResponse({ tiles: ['https://t/{z}/{x}/{y}'] }))),
		});
		expect(style.version).toBe(8);
	});

	it('falls back to a blank style when the fetched document is not a valid TileJSON', async () => {
		// loadTileSource returns the JSON as-is; isTileJSONSpecification then throws (no tiles[]),
		// which guessStyle catches → blank style instead of propagating.
		const style = await guessStyle('https://tiles.example.com/tiles.json', {
			fetch: vi.fn(() => Promise.resolve(jsonResponse({ not: 'a tilejson' }))),
		});
		expect(style).toStrictEqual({ version: 8, sources: {}, layers: [] });
	});
});

// ── Input validation (throws BEFORE the try/catch fallback) ─────────────────────

describe('guessStyle() — url validation', () => {
	// guessStyle documents that it never throws: a bad argument, an unreachable host or a malformed
	// document each yield a blank — but valid — style (B9).
	const blank = { version: 8, sources: {}, layers: [] };

	it('falls back to a blank style for an empty string url', async () => {
		await expect(guessStyle('')).resolves.toStrictEqual(blank);
	});

	it('falls back to a blank style for a non-string url', async () => {
		await expect(guessStyle(undefined as unknown as string)).resolves.toStrictEqual(blank);
	});

	it('falls back to a blank style when the download fails', async () => {
		const failing = (() => {
			throw new Error('network down');
		}) as unknown as typeof fetch;
		await expect(guessStyle('https://tiles.example.com/tiles.json', { fetch: failing })).resolves.toStrictEqual(blank);
	});

	it('falls back to a blank style for an unknown option key, without downloading anything', async () => {
		const fetch = vi.fn(() => Promise.resolve(jsonResponse({ tiles: ['https://t/{z}/{x}/{y}'] })));
		await expect(
			guessStyle('https://tiles.example.com/tiles.json', { fetch, bse: 'x' } as never)
		).resolves.toStrictEqual(blank);
		expect(fetch).not.toHaveBeenCalled();
	});
});

// ── TileJSON objects ─────────────────────────────────────────────────────────────
// A tile server already holds its tileset's TileJSON (from the container's metadata), so it passes
// the object instead of a URL. Nothing may be downloaded, and the caller's object must stay as it was.

describe('guessStyle() — TileJSON object', () => {
	const BASE = 'https://tiles.example.org';
	const shortbread = (): TileJSONSpecification =>
		({
			tilejson: '3.0.0',
			tiles: ['/tiles/osm/{z}/{x}/{y}'],
			minzoom: 0,
			maxzoom: 14,
			attribution: '© OpenStreetMap contributors',
			vector_layers: ['streets', 'water_polygons', 'place_labels', 'land'].map((id) => ({ id, fields: {} })),
		}) as TileJSONSpecification;
	const noFetch = () => vi.fn(() => Promise.resolve(jsonResponse({})));
	type Source = { type: string; tiles?: string[]; url?: string };
	const sourcesOf = (style: StyleSpecification) => Object.values(style.sources) as unknown as Source[];

	it('builds the full OSM style for a Shortbread object without downloading anything', async () => {
		const fetch = noFetch();
		const style = await guessStyle(shortbread(), { urls: { base: BASE }, fetch });
		expect(fetch).not.toHaveBeenCalled();
		expect(style.layers.length).toBeGreaterThan(100);
		const vector = sourcesOf(style).find((s) => s.type === 'vector');
		expect(vector?.url).toBeUndefined();
		expect(vector?.tiles).toStrictEqual([`${BASE}/tiles/osm/{z}/{x}/{y}`]);
	});

	it('does not modify the object it is given', async () => {
		const input = shortbread();
		const before = JSON.stringify(input);
		await guessStyle(input, { urls: { base: BASE } });
		expect(JSON.stringify(input)).toBe(before);
	});

	it('builds the inspector style for an unknown vector object', async () => {
		const input = { tilejson: '3.0.0', tiles: ['/v/{z}/{x}/{y}'], vector_layers: [{ id: 'roads', fields: {} }] };
		const style = await guessStyle(input as TileJSONSpecification, { urls: { base: BASE }, fetch: noFetch() });
		expect(layerTypes(style)).toStrictEqual(expect.arrayContaining(['fill', 'line', 'symbol']));
		expect(sourcesOf(style)[0].tiles).toStrictEqual([`${BASE}/v/{z}/{x}/{y}`]);
	});

	it('builds a raster style for a raster object', async () => {
		const input = { tilejson: '3.0.0', tiles: ['/r/{z}/{x}/{y}.png'] };
		const style = await guessStyle(input as TileJSONSpecification, { urls: { base: BASE }, fetch: noFetch() });
		expect(layerTypes(style)).toContain('raster');
		expect(sourcesOf(style).find((s) => s.type === 'raster')?.tiles).toStrictEqual([`${BASE}/r/{z}/{x}/{y}.png`]);
	});

	it('uses satellite() for a raster object named satellite, with the source inlined', async () => {
		const fetch = noFetch();
		const input = { tilejson: '3.0.0', name: 'satellite', tiles: ['/s/{z}/{x}/{y}.jpg'] };
		const style = await guessStyle(input as TileJSONSpecification, { urls: { base: BASE }, fetch });
		expect(fetch).not.toHaveBeenCalled();
		const raster = sourcesOf(style).find((s) => s.type === 'raster');
		expect(raster?.url).toBeUndefined();
		expect(raster?.tiles).toStrictEqual([`${BASE}/s/{z}/{x}/{y}.jpg`]);
	});

	it.each([
		['a malformed object', { not: 'a tilejson' }],
		['null', null],
		['an array', []],
		['a number', 42],
	])('falls back to a blank style for %s', async (_label, input) => {
		await expect(guessStyle(input as never)).resolves.toStrictEqual({ version: 8, sources: {}, layers: [] });
	});
});

// ── urls: glyphs and sprites ─────────────────────────────────────────────────────
// `urls` has the same shape as for osm() and satellite(), so a tile server can point the guessed style
// at its own fonts and icons — for every kind of tileset that needs them.

describe('guessStyle() — urls', () => {
	const BASE = 'https://tiles.example.org';
	const urls = {
		base: BASE,
		glyphsPattern: '/fonts/{fontstack}/{range}.pbf',
		sprite: [{ id: 'base', url: '/icons/base' }],
	};
	const blank = { version: 8, sources: {}, layers: [] };

	it('passes glyphs and sprites through to the Shortbread style', async () => {
		const tj = {
			tilejson: '3.0.0',
			tiles: ['/tiles/osm/{z}/{x}/{y}'],
			vector_layers: ['streets', 'water_polygons', 'place_labels'].map((id) => ({ id, fields: {} })),
		};
		const style = await guessStyle(tj as TileJSONSpecification, { urls });
		expect(style.glyphs).toBe(`${BASE}/fonts/{fontstack}/{range}.pbf`);
		expect(JSON.stringify(style.sprite)).toContain(`${BASE}/icons/base`);
	});

	it('passes glyphs through to the satellite style', async () => {
		const tj = { tilejson: '3.0.0', name: 'satellite', tiles: ['/s/{z}/{x}/{y}.jpg'] };
		const style = await guessStyle(tj as TileJSONSpecification, { urls });
		expect(style.glyphs).toBe(`${BASE}/fonts/{fontstack}/{range}.pbf`);
	});

	it('gives the inspector style glyphs and a font the glyph server has', async () => {
		const tj = { tilejson: '3.0.0', tiles: ['/v/{z}/{x}/{y}'], vector_layers: [{ id: 'roads', fields: {} }] };
		const style = await guessStyle(tj as TileJSONSpecification, { urls });
		expect(style.glyphs).toBe(`${BASE}/fonts/{fontstack}/{range}.pbf`);
		const label = style.layers.find((l) => l.type === 'symbol') as { layout: Record<string, unknown> };
		expect(label.layout['text-font']).toStrictEqual(['noto_sans_regular']);
	});

	it('treats fetch inside urls, and base outside it, as unknown keys: blank style', async () => {
		await expect(guessStyle('https://x.org/tiles.json', { urls: { fetch: vi.fn() } } as never)).resolves.toStrictEqual(
			blank
		);
	});

	it('treats the pre-urls top-level base as an unknown key: blank style', async () => {
		const tj = { tilejson: '3.0.0', tiles: ['https://x.org/r/{z}/{x}/{y}.png'] };
		await expect(guessStyle(tj as TileJSONSpecification, { base: BASE } as never)).resolves.toStrictEqual(blank);
	});
});

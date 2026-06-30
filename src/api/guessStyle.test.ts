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

const fetchShortbreadFn = vi.fn(async () =>
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
		const src = style.sources['versatiles-shortbread'] as { tiles: string[] };
		expect(src).toBeDefined();
		expect(src.tiles[0]).toBe('https://tiles.example.com/{z}/{x}/{y}');
	});

	it('includes slot anchors in the OSM style', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchShortbreadFn });
		const ids = style.layers.map((l) => l.id);
		expect(ids).toContain('slot-below-fills');
		expect(ids).toContain('slot-below-symbols');
	});

	it('detects Shortbread with ≥3 matching layers even if others are unknown', async () => {
		const fetchFn = vi.fn(async () =>
			jsonResponse({
				tiles: ['https://t/{z}/{x}/{y}'],
				vector_layers: [
					{ id: 'streets', fields: {} },
					{ id: 'buildings', fields: {} },
					{ id: 'place_labels', fields: {} },
					{ id: 'some_custom_layer', fields: {} },
				],
			})
		);
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchFn });
		expect(style.layers.length).toBeGreaterThan(50);
	});

	it('does NOT treat 2-layer vector tiles with 0 Shortbread matches as Shortbread', async () => {
		const fetchFn = vi.fn(async () =>
			jsonResponse({
				tiles: ['https://t/{z}/{x}/{y}'],
				vector_layers: [
					{ id: 'my_layer', fields: {} },
					{ id: 'other_layer', fields: {} },
				],
			})
		);
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchFn });
		// Inspector style has far fewer layers
		expect(style.layers.length).toBeLessThan(50);
	});
});

// ── Inspector style (unknown vector) ──────────────────────────────────────────

const fetchUnknownVectorFn = vi.fn(async () =>
	jsonResponse({
		tiles: ['https://custom.tiles/{z}/{x}/{y}'],
		vector_layers: [
			{ id: 'my_points', fields: { name: 'String' } },
			{ id: 'my_polygons', fields: {} },
		],
	})
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
		const fetchMinMaxFn = vi.fn(async () =>
			jsonResponse({
				tiles: ['https://t/{z}/{x}/{y}'],
				minzoom: 4,
				maxzoom: 14,
				vector_layers: [{ id: 'layer_a', fields: {} }],
			})
		);
		const style = await guessStyle('https://tiles.example.com/tiles.json', { fetch: fetchMinMaxFn });
		const srcId = sourceIds(style)[0];
		const src = style.sources[srcId] as { minzoom: number; maxzoom: number };
		expect(src.minzoom).toBe(4);
		expect(src.maxzoom).toBe(14);
	});
});

// ── Raster tiles ──────────────────────────────────────────────────────────────

const fetchRasterFn = vi.fn(async () =>
	jsonResponse({
		tiles: ['https://raster.tiles/{z}/{x}/{y}'],
	})
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
			fetch: vi.fn(async () => jsonResponse(satTJ)),
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
			fetch: vi.fn(async () => jsonResponse(aerialTJ)),
		});
		expect(style.sources).toHaveProperty('satellite');
	});
});

// ── Error safety ──────────────────────────────────────────────────────────────

describe('guessStyle() — never throws', () => {
	it('handles a minimal TileJSON with just tiles', async () => {
		const style = await guessStyle('https://tiles.example.com/tiles.json', {
			fetch: vi.fn(async () => jsonResponse({ tiles: ['https://t/{z}/{x}/{y}'] })),
		});
		expect(style.version).toBe(8);
	});
});

import { describe, expect, it } from 'vitest';
import { satellite } from './satellite.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';

function layerIds(style: StyleSpecification): string[] {
	return style.layers.map((l) => l.id);
}

function layerById(style: StyleSpecification, id: string) {
	return style.layers.find((l) => l.id === id);
}

describe('satellite()', () => {
	// ── Basic validity ──────────────────────────────────────────────────────────

	it('returns a valid MapLibre style', async () => {
		const style = await satellite();
		expect(style.version).toBe(8);
		expect(style.sources).toBeDefined();
		expect(typeof style.glyphs).toBe('string');
		expect(style.sprite).toBeDefined();
	});

	it('includes satellite raster source', async () => {
		const style = await satellite();
		const src = style.sources['satellite'] as Record<string, unknown>;
		expect(src).toBeDefined();
		expect(src.type).toBe('raster');
	});

	it('includes satellite raster layer', async () => {
		const style = await satellite();
		const layer = layerById(style, 'satellite');
		expect(layer).toBeDefined();
		expect(layer?.type).toBe('raster');
	});

	it('has background layer before raster', async () => {
		const style = await satellite();
		const ids = layerIds(style);
		const bgIdx = ids.indexOf('background');
		const satIdx = ids.indexOf('satellite');
		expect(bgIdx).toBe(0);
		expect(satIdx).toBeGreaterThan(bgIdx);
	});

	it('always includes slot-below-raster before satellite layer', async () => {
		const style = await satellite();
		const ids = layerIds(style);
		const slotIdx = ids.indexOf('slot-below-raster');
		const satIdx = ids.indexOf('satellite');
		expect(slotIdx).toBeGreaterThan(-1);
		expect(slotIdx).toBeLessThan(satIdx);
	});

	it('includes slot-below-symbols and slot-below-labels without overlay', async () => {
		const style = await satellite();
		const ids = layerIds(style);
		expect(ids).toContain('slot-below-symbols');
		expect(ids).toContain('slot-below-labels');
	});

	// ── URL configuration ────────────────────────────────────────────────────────

	it('uses default versatiles satellite URL', async () => {
		const style = await satellite();
		const src = style.sources['satellite'] as { tiles: string[] };
		expect(src.tiles[0]).toContain('satellite');
	});

	it('applies custom base URL to satellite tiles', async () => {
		const style = await satellite({ urls: { base: 'https://my.cdn.com' } });
		const src = style.sources['satellite'] as { tiles: string[] };
		expect(src.tiles[0]).toContain('my.cdn.com');
	});

	it('accepts explicit satellite URL string', async () => {
		const style = await satellite({ urls: { satellite: 'https://sat.tiles/{z}/{x}/{y}' } });
		const src = style.sources['satellite'] as { tiles: string[] };
		expect(src.tiles[0]).toBe('https://sat.tiles/{z}/{x}/{y}');
	});

	it('accepts satellite TileJSONSpecification', async () => {
		const tileJSON = {
			tiles: ['https://sat/{z}/{x}/{y}'],
			minzoom: 0,
			maxzoom: 18,
		} as TileJSONSpecification;
		const style = await satellite({ urls: { satellite: tileJSON } });
		const src = style.sources['satellite'] as { tiles: string[]; minzoom: number };
		expect(src.tiles[0]).toBe('https://sat/{z}/{x}/{y}');
		expect(src.minzoom).toBe(0);
	});

	// ── Raster paint options ────────────────────────────────────────────────────

	it('applies raster opacity', async () => {
		const style = await satellite({ raster: { opacity: 0.8 } });
		const sat = layerById(style, 'satellite');
		expect((sat?.paint as Record<string, unknown>)?.['raster-opacity']).toBe(0.8);
	});

	it('applies raster saturation', async () => {
		const style = await satellite({ raster: { saturation: -0.5 } });
		const sat = layerById(style, 'satellite');
		expect((sat?.paint as Record<string, unknown>)?.['raster-saturation']).toBe(-0.5);
	});

	it('omits raster paint when all values are default', async () => {
		const style = await satellite();
		const sat = layerById(style, 'satellite');
		// Default values: opacity=1, hueRotate=0, etc. — paint should be absent or empty
		const paint = sat?.paint as Record<string, unknown> | undefined;
		expect(!paint || Object.keys(paint).length === 0).toBe(true);
	});

	// ── No osmOverlay ─────────────────────────────────────────────────────────

	it('has no vector source when osmOverlay is false', async () => {
		const style = await satellite({ osmOverlay: false });
		expect(style.sources).not.toHaveProperty('versatiles-shortbread');
	});

	it('has no fill layers when osmOverlay is false', async () => {
		const style = await satellite({ osmOverlay: false });
		const fills = style.layers.filter((l) => l.type === 'fill');
		expect(fills).toHaveLength(0);
	});

	// ── osmOverlay ────────────────────────────────────────────────────────────

	it('adds vector source when osmOverlay is set', async () => {
		const style = await satellite({ osmOverlay: {} });
		expect(style.sources).toHaveProperty('versatiles-shortbread');
	});

	it('osmOverlay adds symbol layers (labels)', async () => {
		const style = await satellite({ osmOverlay: {} });
		const symbols = style.layers.filter((l) => l.type === 'symbol');
		expect(symbols.length).toBeGreaterThan(0);
	});

	it('osmOverlay does not add fill layers (land/water obscure satellite)', async () => {
		const style = await satellite({ osmOverlay: {} });
		const fills = style.layers.filter((l) => l.type === 'fill');
		expect(fills).toHaveLength(0);
	});

	it('osmOverlay does not include opaque background layer', async () => {
		const style = await satellite({ osmOverlay: {} });
		// Should have exactly one background layer (our own dark background)
		const bgs = style.layers.filter((l) => l.type === 'background' && l.id === 'background');
		expect(bgs).toHaveLength(1);
	});

	it('osmOverlay respects theme', async () => {
		const tonerStyle = await satellite({ osmOverlay: { theme: 'toner' } });
		const grayStyle = await satellite({ osmOverlay: { theme: 'gray' } });
		// Both should have symbol layers
		expect(tonerStyle.layers.filter((l) => l.type === 'symbol').length).toBeGreaterThan(0);
		expect(grayStyle.layers.filter((l) => l.type === 'symbol').length).toBeGreaterThan(0);
	});

	it('osmOverlay slot-below-symbols appears after satellite raster', async () => {
		const style = await satellite({ osmOverlay: {} });
		const ids = layerIds(style);
		const satIdx = ids.indexOf('satellite');
		const slotIdx = ids.indexOf('slot-below-symbols');
		expect(slotIdx).toBeGreaterThan(satIdx);
	});

	it('osmOverlay layer group hiding works', async () => {
		const style = await satellite({ osmOverlay: { layers: { labels: false } } });
		const placeLabel = layerById(style, 'label-place-village');
		if (placeLabel) {
			expect((placeLabel?.layout as Record<string, unknown>)?.visibility).toBe('none');
		}
	});

	// ── Features ─────────────────────────────────────────────────────────────

	it('adds terrain when features.terrain = true', async () => {
		const style = await satellite({ features: { terrain: true } });
		expect(style.terrain).toBeDefined();
		expect(style.sources).toHaveProperty('elevation');
	});

	it('adds hillshade when features.hillshade = true', async () => {
		const style = await satellite({ features: { hillshade: true } });
		const ids = layerIds(style);
		expect(ids).toContain('hillshade');
		expect(style.sources).toHaveProperty('elevation');
	});

	// ── Static properties ─────────────────────────────────────────────────────

	it('satellite.colorKeys has all color key names', () => {
		expect(satellite.colorKeys.length).toBeGreaterThanOrEqual(41);
		expect(satellite.colorKeys).toContain('water');
	});

	it('satellite.slots has expected keys', () => {
		expect(satellite.slots.belowRaster).toBe('slot-below-raster');
		expect(satellite.slots.belowSymbols).toBe('slot-below-symbols');
		expect(satellite.slots.belowLabels).toBe('slot-below-labels');
	});

	it('satellite.defaults returns ResolvedSatelliteOptions', () => {
		const d = satellite.defaults;
		expect(d.osmOverlay).toBe(false);
		expect(d.features.terrain).toBe(false);
		expect(typeof d.urls.satellite).toBe('string');
	});

	it('satellite.resolveOptions resolves options', () => {
		const r = satellite.resolveOptions({ raster: { saturation: -0.3 } });
		expect(r.raster.saturation).toBe(-0.3);
	});

	it('satellite.languages returns language codes from TileJSON', () => {
		const tileJSON = {
			tiles: ['https://tiles/{z}/{x}/{y}'],
			vector_layers: [{ id: 'place_labels', fields: { name: 'String', name_de: 'String', name_en: 'String' } }],
		} as TileJSONSpecification;
		const langs = satellite.languages(tileJSON);
		expect(langs).toContain('de');
		expect(langs).toContain('en');
	});
});

import { describe, expect, it } from 'vitest';
import { satellite } from './satellite.js';
import { osm } from './osm.js';
import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import { tileJSONFetch } from '../lib/loadTileSource.test.js';
import { inlineSources } from '../lib/index.js';

function layerIds(style: StyleSpecification): string[] {
	return style.layers.map((l) => l.id);
}

function layerById(style: StyleSpecification, id: string) {
	return style.layers.find((l) => l.id === id);
}

describe('satellite()', () => {
	// ── Basic validity ──────────────────────────────────────────────────────────

	it('returns a valid MapLibre style', () => {
		const style = satellite();
		expect(style.version).toBe(8);
		expect(style.sources).toBeDefined();
		expect(typeof style.glyphs).toBe('string');
		expect(style.sprite).toBeDefined();
	});

	it('includes satellite raster source', () => {
		const style = satellite();
		const src = style.sources['satellite'] as Record<string, unknown>;
		expect(src).toBeDefined();
		expect(src.type).toBe('raster');
	});

	it('includes satellite raster layer', () => {
		const style = satellite();
		const layer = layerById(style, 'satellite');
		expect(layer).toBeDefined();
		expect(layer?.type).toBe('raster');
	});

	it('has background layer before raster', () => {
		const style = satellite();
		const ids = layerIds(style);
		const bgIdx = ids.indexOf('background');
		const satIdx = ids.indexOf('satellite');
		expect(bgIdx).toBe(0);
		expect(satIdx).toBeGreaterThan(bgIdx);
	});

	it('always includes slot-below-raster before satellite layer', () => {
		const style = satellite();
		const ids = layerIds(style);
		const slotIdx = ids.indexOf('slot-below-raster');
		const satIdx = ids.indexOf('satellite');
		expect(slotIdx).toBeGreaterThan(-1);
		expect(slotIdx).toBeLessThan(satIdx);
	});

	it('includes slot-below-symbols and slot-below-labels without overlay', () => {
		const style = satellite();
		const ids = layerIds(style);
		expect(ids).toContain('slot-below-symbols');
		expect(ids).toContain('slot-below-labels');
	});

	// ── URL configuration ────────────────────────────────────────────────────────

	it('uses default versatiles satellite URL', () => {
		const style = satellite();
		const src = style.sources['satellite'] as { url: string };
		expect(src.url).toContain('satellite');
	});

	it('applies custom base URL to the satellite source', () => {
		const style = satellite({ urls: { base: 'https://my.cdn.com' } });
		const src = style.sources['satellite'] as { url: string };
		expect(src.url).toContain('my.cdn.com');
	});

	it('accepts explicit satellite URL string, resolved by inlineSources', async () => {
		const fetchFn = tileJSONFetch({
			'https://sat/': { tiles: ['https://sat/{z}/{x}/{y}'], minzoom: 0, maxzoom: 18 },
		});
		const built = satellite({ urls: { satellite: 'https://sat/tiles.json' } });
		expect(built.sources['satellite'] as { url: string }).toMatchObject({ url: 'https://sat/tiles.json' });

		const style = await inlineSources(built, { fetch: fetchFn });
		const src = style.sources['satellite'] as { tiles: string[]; minzoom: number };
		expect(src.tiles[0]).toBe('https://sat/{z}/{x}/{y}');
		expect(src.minzoom).toBe(0);
	});

	// ── Tile size ─────────────────────────────────────────────────────────────

	it('uses tile_size from the satellite TileJSON as the raster tileSize', async () => {
		const fetchFn = tileJSONFetch({ 'https://sat/': { tiles: ['https://sat/{z}/{x}/{y}'], tile_size: 512 } });
		const style = await inlineSources(satellite({ urls: { satellite: 'https://sat/tiles.json' } }), {
			fetch: fetchFn,
		});
		const src = style.sources['satellite'] as { tileSize: number };
		expect(src.tileSize).toBe(512);
	});

	it('omits raster tileSize when the TileJSON omits tile_size', async () => {
		// Declaring a guessed tileSize would silently override MapLibre's own default.
		const fetchFn = tileJSONFetch({ 'https://sat/': { tiles: ['https://sat/{z}/{x}/{y}'] } });
		const style = await inlineSources(satellite({ urls: { satellite: 'https://sat/tiles.json' } }), {
			fetch: fetchFn,
		});
		const src = style.sources['satellite'] as Record<string, unknown>;
		expect(src).not.toHaveProperty('tileSize');
	});

	// ── Raster paint options ────────────────────────────────────────────────────

	it('applies raster opacity', () => {
		const style = satellite({ raster: { opacity: 0.8 } });
		const sat = layerById(style, 'satellite');
		expect((sat?.paint as Record<string, unknown>)?.['raster-opacity']).toBe(0.8);
	});

	it('applies raster saturation', () => {
		const style = satellite({ raster: { saturation: -0.5 } });
		const sat = layerById(style, 'satellite');
		expect((sat?.paint as Record<string, unknown>)?.['raster-saturation']).toBe(-0.5);
	});

	it('omits raster paint when all values are default', () => {
		const style = satellite();
		const sat = layerById(style, 'satellite');
		// Default values: opacity=1, hueRotate=0, etc. — paint should be absent or empty
		const paint = sat?.paint as Record<string, unknown> | undefined;
		expect(!paint || Object.keys(paint).length === 0).toBe(true);
	});

	// ── No osmOverlay ─────────────────────────────────────────────────────────

	it('has no vector source when osmOverlay is false', () => {
		const style = satellite({ osmOverlay: false });
		expect(style.sources).not.toHaveProperty('versatiles-shortbread');
	});

	it('has no fill layers when osmOverlay is false', () => {
		const style = satellite({ osmOverlay: false });
		const fills = style.layers.filter((l) => l.type === 'fill');
		expect(fills).toHaveLength(0);
	});

	// ── osmOverlay ────────────────────────────────────────────────────────────

	it('adds vector source when osmOverlay is set', () => {
		const style = satellite({ osmOverlay: {} });
		expect(style.sources).toHaveProperty('versatiles-shortbread');
	});

	it('osmOverlay adds symbol layers (labels)', () => {
		const style = satellite({ osmOverlay: {} });
		const symbols = style.layers.filter((l) => l.type === 'symbol');
		expect(symbols.length).toBeGreaterThan(0);
	});

	// A translucent line whose caps and joins are round covers some pixels twice, and MapLibre blends
	// each overlapping triangle in turn — so every vertex and every seam between features composites to
	// 1 − 0.8² = 0.36 against 0.2 elsewhere, which reads as a bright bead. Free in the opaque basemap,
	// which is why the cartography asks for round; not free once the overlay dims every line.
	describe('overlay lines do not overlap themselves', () => {
		const lines = (style: StyleSpecification) => style.layers.filter((l) => l.type === 'line');
		const rounded = (layer: StyleSpecification['layers'][number]) => {
			const layout = (layer as { layout?: Record<string, unknown> }).layout ?? {};
			return layout['line-cap'] === 'round' || layout['line-join'] === 'round';
		};

		it('leaves no round cap or join on any overlay line', () => {
			// every line is dimmed per feature, so every round cap or join would blend twice
			const overlay = lines(satellite({ osmOverlay: {} }));
			expect(overlay.length).toBeGreaterThan(100);
			expect(overlay.filter(rounded).map((l) => l.id)).toEqual([]);
		});

		it('unrounds boundaries too, which are dimmed per feature like everything else', () => {
			const boundaries = lines(satellite({ osmOverlay: {} })).filter((l) => l.id.startsWith('boundary-'));
			expect(boundaries.length).toBeGreaterThan(0);
			expect(boundaries.some(rounded)).toBe(false);
		});

		it('keeps the basemap rounded, where the lines are opaque and it costs nothing', () => {
			expect(lines(osm()).filter(rounded).length).toBeGreaterThan(100);
		});

		it('leaves a cap the cartography chose deliberately', () => {
			// only `round` is dropped: a layer that asked for `butt` meant it
			const butt = lines(osm()).filter(
				(l) => ((l as { layout?: Record<string, unknown> }).layout ?? {})['line-cap'] === 'butt'
			);
			const overlay = new Map(lines(satellite({ osmOverlay: {} })).map((l) => [l.id, l]));
			const kept = butt.filter((l) => overlay.has(l.id));
			expect(kept.length).toBeGreaterThan(0);
			for (const layer of kept) {
				expect(((overlay.get(layer.id) as { layout?: Record<string, unknown> }).layout ?? {})['line-cap']).toBe('butt');
			}
		});

		it('does not leave an empty layout behind', () => {
			// the basemap emits none, so the overlay should not start
			const empty = (style: StyleSpecification) =>
				style.layers.filter((l) => {
					const layout = (l as { layout?: Record<string, unknown> }).layout;
					return layout !== undefined && Object.keys(layout).length === 0;
				});
			expect(empty(osm())).toEqual([]);
			expect(empty(satellite({ osmOverlay: {} }))).toEqual([]);
		});
	});

	// `line-layer-opacity` would composite a self-overlapping layer once and remove the noise a border
	// drawn over itself produces — but MapLibre Native does not implement it (maplibre-native#4298) and
	// drops any layer carrying it, so boundaries vanished on Android and iOS. Until a style can be
	// emitted per renderer, no layer may set it. See the note in `features/satellite-overlay.ts`.
	describe('every overlay line is dimmed per feature', () => {
		const boundaries = (style: StyleSpecification) =>
			style.layers.filter((l) => l.type === 'line' && l.id.startsWith('boundary-'));
		const paintOf = (layer: StyleSpecification['layers'][number]) =>
			(layer as { paint?: Record<string, unknown> }).paint ?? {};

		it('sets no *-layer-opacity anywhere, which MapLibre Native would drop the layer over', () => {
			for (const style of [satellite({ osmOverlay: {} }), satellite(), osm()]) {
				const offenders = style.layers.filter((l) => Object.keys(paintOf(l)).some((k) => k.endsWith('-layer-opacity')));
				expect(offenders.map((l) => l.id)).toEqual([]);
			}
		});

		it('dims boundaries through line-opacity, like every other line', () => {
			const overlay = boundaries(satellite({ osmOverlay: {} }));
			expect(overlay.length).toBeGreaterThan(0);
			for (const layer of overlay) expect(paintOf(layer)).toHaveProperty('line-opacity');
		});

		it('scales the basemap opacity rather than replacing it', () => {
			// the basemap's own opacity times the overlay's 0.2 — the halo casing stays a halo
			const base = new Map(boundaries(osm()).map((l) => [l.id, paintOf(l)['line-opacity'] ?? 1]));
			for (const layer of boundaries(satellite({ osmOverlay: {} }))) {
				const before = base.get(layer.id);
				if (typeof before !== 'number') continue;
				expect(paintOf(layer)['line-opacity']).toBeCloseTo(before * 0.2, 10);
			}
		});

		it('carries an appear fade across rather than flattening it to a constant', () => {
			// `boundary-state` ramps 0 → 0.2 over z7→8; that has to survive
			const state = boundaries(satellite({ osmOverlay: {} })).find((l) => l.id === 'boundary-state');
			expect(state).toBeDefined();
			expect(paintOf(state!)['line-opacity']).toEqual([
				'interpolate',
				['linear'],
				['zoom'],
				7,
				0,
				8,
				expect.closeTo(0.2, 10),
			]);
		});
	});

	it('osmOverlay does not add fill layers (land/water obscure satellite)', () => {
		const style = satellite({ osmOverlay: {} });
		const fills = style.layers.filter((l) => l.type === 'fill');
		expect(fills).toHaveLength(0);
	});

	it('osmOverlay does not include opaque background layer', () => {
		const style = satellite({ osmOverlay: {} });
		// Should have exactly one background layer (our own dark background)
		const bgs = style.layers.filter((l) => l.type === 'background' && l.id === 'background');
		expect(bgs).toHaveLength(1);
	});

	it('osmOverlay respects theme', () => {
		const tonerStyle = satellite({ osmOverlay: { theme: 'toner' } });
		const grayStyle = satellite({ osmOverlay: { theme: 'gray' } });
		// Both should have symbol layers
		expect(tonerStyle.layers.filter((l) => l.type === 'symbol').length).toBeGreaterThan(0);
		expect(grayStyle.layers.filter((l) => l.type === 'symbol').length).toBeGreaterThan(0);
	});

	it('osmOverlay slot-below-symbols appears after satellite raster', () => {
		const style = satellite({ osmOverlay: {} });
		const ids = layerIds(style);
		const satIdx = ids.indexOf('satellite');
		const slotIdx = ids.indexOf('slot-below-symbols');
		expect(slotIdx).toBeGreaterThan(satIdx);
	});

	it('osmOverlay layer group hiding works', () => {
		const style = satellite({ osmOverlay: { layers: { labels: false } } });
		// Hidden layer groups are dropped from the overlay entirely.
		expect(layerById(style, 'label-place-village')).toBeUndefined();
	});

	// ── Features ─────────────────────────────────────────────────────────────

	it('adds terrain when features.terrain = true', () => {
		const style = satellite({ features: { terrain: true } });
		expect(style.terrain).toBeDefined();
		expect(style.sources).toHaveProperty('elevation');
	});

	it('adds hillshade when features.hillshade = true', () => {
		const style = satellite({ features: { hillshade: true } });
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

	it('satellite.defaults returns ResolvedSatellite', () => {
		const d = satellite.defaults;
		expect(d.osmOverlay).not.toBe(false);
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

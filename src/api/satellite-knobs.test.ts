import { describe, expect, it, vi } from 'vitest';
import { satellite } from './satellite.js';
import type { SatelliteOptions } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';

// Exhaustive behavioural coverage of every satellite() option ("knob"): raster paint
// adjustments, the OSM overlay (and the OSM knobs it forwards), terrain/hillshade/sun,
// URL configuration, and the static helpers. Relies on the global `fetch` stub from
// vitest.setup.ts.

const build = (options?: SatelliteOptions): Promise<StyleSpecification> => satellite(options);

const layer = (s: StyleSpecification, id: string) => s.layers.find((l) => l.id === id);
const paint = (s: StyleSpecification, id: string): Record<string, unknown> =>
	(layer(s, id)?.paint ?? {}) as Record<string, unknown>;
const hasFills = (s: StyleSpecification): boolean => s.layers.some((l) => l.type === 'fill');

// ── raster paint (all six knobs) ─────────────────────────────────────────────────

describe('satellite() knob: raster', () => {
	it('all raster adjustments are written to the satellite layer paint', async () => {
		const s = await build({
			raster: { opacity: 0.7, hueRotate: 45, brightnessMin: 0.1, brightnessMax: 0.9, saturation: -0.3, contrast: 0.4 },
		});
		expect(paint(s, 'satellite')).toStrictEqual({
			'raster-opacity': 0.7,
			'raster-hue-rotate': 45,
			'raster-brightness-min': 0.1,
			'raster-brightness-max': 0.9,
			'raster-saturation': -0.3,
			'raster-contrast': 0.4,
		});
	});

	it.each([
		['opacity', { opacity: 0.5 }, 'raster-opacity', 0.5],
		['hueRotate', { hueRotate: 90 }, 'raster-hue-rotate', 90],
		['brightnessMin', { brightnessMin: 0.2 }, 'raster-brightness-min', 0.2],
		['brightnessMax', { brightnessMax: 0.8 }, 'raster-brightness-max', 0.8],
		['saturation', { saturation: -0.5 }, 'raster-saturation', -0.5],
		['contrast', { contrast: 0.6 }, 'raster-contrast', 0.6],
	] as [string, SatelliteOptions['raster'], string, number][])('raster.%s → %s', async (_name, raster, key, value) => {
		expect(paint(await build({ raster }), 'satellite')[key]).toBe(value);
	});

	it('omits raster paint entirely when every value is default', async () => {
		const p = layer(await build(), 'satellite')?.paint;
		expect(!p || Object.keys(p).length === 0).toBe(true);
	});
});

// ── osmOverlay ───────────────────────────────────────────────────────────────────

describe('satellite() knob: osmOverlay', () => {
	it('is disabled by default (no vector source, no overlay symbols)', async () => {
		const s = await build();
		expect(s.sources).not.toHaveProperty('versatiles-shortbread');
		expect(s.layers.some((l) => l.type === 'symbol')).toBe(false);
	});

	it('osmOverlay:false keeps the style raster-only but still exposes slot anchors', async () => {
		const s = await build({ osmOverlay: false });
		expect(s.sources).not.toHaveProperty('versatiles-shortbread');
		expect(layer(s, 'slot-below-symbols')).toBeDefined();
		expect(layer(s, 'slot-below-labels')).toBeDefined();
	});

	it('osmOverlay:{} adds the vector source and label symbols on top of the raster', async () => {
		const s = await build({ osmOverlay: {} });
		expect(s.sources).toHaveProperty('versatiles-shortbread');
		expect(s.layers.some((l) => l.type === 'symbol')).toBe(true);
	});

	it('the overlay never contributes fill layers (they would hide the imagery)', async () => {
		expect(hasFills(await build({ osmOverlay: {} }))).toBe(false);
	});

	it('the overlay keeps exactly one (dark) background, not the OSM opaque one', async () => {
		const s = await build({ osmOverlay: {} });
		const bgs = s.layers.filter((l) => l.type === 'background' && l.id === 'background');
		expect(bgs).toHaveLength(1);
		expect((bgs[0].paint as Record<string, unknown>)['background-color']).toBe('#000');
	});

	it('forwards the theme knob to the overlay', async () => {
		const toner = await build({ osmOverlay: { theme: 'toner' } });
		const gray = await build({ osmOverlay: { theme: 'gray' } });
		const shield = (s: StyleSpecification) =>
			(layer(s, 'label-place-village')?.paint as Record<string, unknown>)['text-color'];
		expect(shield(toner)).not.toBe(shield(gray));
	});

	it('forwards the text.language knob to the overlay', async () => {
		const s = await build({ osmOverlay: { text: { language: 'de' } } });
		const field = (layer(s, 'label-place-village')?.layout as Record<string, unknown>)['text-field'];
		expect(field).toStrictEqual(['coalesce', ['get', 'name_de'], ['get', 'name']]);
	});

	it('forwards the layers knob to the overlay (hidden groups are dropped)', async () => {
		const s = await build({ osmOverlay: { layers: { labels: false } } });
		expect(layer(s, 'label-place-village')).toBeUndefined();
	});

	it('the overlay symbols sit above the satellite raster', async () => {
		const s = await build({ osmOverlay: {} });
		const idsList = s.layers.map((l) => l.id);
		expect(idsList.indexOf('slot-below-symbols')).toBeGreaterThan(idsList.indexOf('satellite'));
	});
});

// ── features: terrain / hillshade / sun ──────────────────────────────────────────

describe('satellite() knob: features', () => {
	it('terrain:true enables terrain with an elevation source', async () => {
		const s = await build({ features: { terrain: true } });
		expect(s.terrain).toEqual({ source: 'elevation', exaggeration: 1 });
		expect(s.sources).toHaveProperty('elevation');
	});

	it('terrain exaggeration flows through', async () => {
		expect((await build({ features: { terrain: { exaggeration: 3 } } })).terrain?.exaggeration).toBe(3);
	});

	it('hillshade:true adds a hillshade layer + elevation source', async () => {
		const s = await build({ features: { hillshade: true } });
		expect(layer(s, 'hillshade')).toBeDefined();
		expect(s.sources).toHaveProperty('elevation');
	});

	it('sun drives the hillshade illumination and style.light', async () => {
		const s = await build({ features: { hillshade: true }, sun: { direction: 120, altitude: 20 } });
		const p = paint(s, 'hillshade');
		expect(p['hillshade-illumination-direction']).toBe(120);
		expect(p['hillshade-illumination-altitude']).toBe(20);
		expect((s.light?.position as number[])?.[1]).toBe(120);
	});

	it('no style.light without hillshade', async () => {
		expect((await build({ sun: { direction: 120 } })).light).toBeUndefined();
	});
});

// ── URL configuration ────────────────────────────────────────────────────────────

describe('satellite() knob: urls', () => {
	it('base rewrites the satellite tile host', async () => {
		const s = await build({ urls: { base: 'https://my.cdn.example' } });
		expect((s.sources['satellite'] as { tiles: string[] }).tiles[0]).toContain('my.cdn.example');
	});

	it('an explicit satellite TileJSON is fetched, and its tile_size becomes tileSize', async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(JSON.stringify({ tiles: ['https://sat/{z}/{x}/{y}'], tile_size: 512, minzoom: 0, maxzoom: 18 }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
		);
		const s = await build({ urls: { satellite: 'https://sat/tiles.json', fetch: fetchFn } });
		const src = s.sources['satellite'] as { tiles: string[]; tileSize: number; minzoom: number };
		expect(src.tiles[0]).toBe('https://sat/{z}/{x}/{y}');
		expect(src.tileSize).toBe(512);
		expect(src.minzoom).toBe(0);
	});

	it('defaults raster tileSize to 256 when the TileJSON omits tile_size', async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(JSON.stringify({ tiles: ['https://sat/{z}/{x}/{y}'] }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
		);
		const s = await build({ urls: { satellite: 'https://sat/tiles.json', fetch: fetchFn } });
		expect((s.sources['satellite'] as { tileSize: number }).tileSize).toBe(256);
	});
});

// ── static helpers ───────────────────────────────────────────────────────────────

describe('satellite() static properties', () => {
	it('satellite.colorKeys mirrors the osm color keys', () => {
		expect(satellite.colorKeys).toHaveLength(44);
	});

	it('satellite.slots exposes the raster/symbol/label anchors', () => {
		expect(satellite.slots).toStrictEqual({
			belowRaster: 'slot-below-raster',
			belowSymbols: 'slot-below-symbols',
			belowLabels: 'slot-below-labels',
		});
	});

	it('satellite.defaults is a fully-resolved ResolvedSatellite (overlay off)', () => {
		const d = satellite.defaults;
		expect(d.osmOverlay).toBe(false);
		expect(d.features.terrain).toBe(false);
		expect(d.raster.opacity).toBe(1);
	});

	it('satellite.resolveOptions resolves raw options', () => {
		expect(satellite.resolveOptions({ raster: { saturation: -0.3 } }).raster.saturation).toBe(-0.3);
	});

	it('satellite.languages extracts name_* codes from a TileJSON', () => {
		const langs = satellite.languages({
			tiles: ['https://t/{z}/{x}/{y}'],
			vector_layers: [{ id: 'p', fields: { name: 'String', name_de: 'String', name_fr: 'String' } }],
		} as never);
		expect(langs).toEqual(['de', 'fr']);
	});
});

// ── known gap: sky resolves but is not applied ───────────────────────────────────

describe('satellite() knobs that are parsed but not applied', () => {
	it('sky is resolved from options', () => {
		expect(satellite.resolveOptions({ sky: { skyColor: '#010203' } }).sky.skyColor).toBe('#010203');
	});

	it.todo('sky should be emitted as style.sky (currently not applied)');
});

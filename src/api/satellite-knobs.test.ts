import { describe, expect, it, vi } from 'vitest';
import { satellite } from './satellite.js';
import type { SatelliteOptions } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';
import { inlineSources } from '../lib/index.js';
import { osm } from './osm.js';
import { Color } from '../color/index.js';

// Exhaustive behavioural coverage of every satellite() option ("knob"): raster paint
// adjustments, the OSM overlay (and the OSM knobs it forwards), terrain/hillshade/sun,
// URL configuration, and the static helpers. Relies on the global `fetch` stub from
// vitest.setup.ts.

const build = (options?: SatelliteOptions): StyleSpecification => satellite(options);

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
	it('is enabled by default (vector source + overlay symbols)', async () => {
		// A bare satellite() gives a usable map, as in v5; only `osmOverlay: false` turns it off.
		const s = await build();
		expect(s.sources).toHaveProperty('versatiles-shortbread');
		expect(s.layers.some((l) => l.type === 'symbol')).toBe(true);
	});

	it('the default differs from an explicitly disabled overlay', async () => {
		// The two were byte-identical while `undefined` was treated as `false`.
		expect(JSON.stringify(await build())).not.toBe(JSON.stringify(await build({ osmOverlay: false })));
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
		// Label colours are fixed white-on-black for imagery regardless of palette (A2), so the
		// theme is observed on a road colour, which still varies.
		const roadColor = (s: StyleSpecification) =>
			(layer(s, 'street-motorway')?.paint as Record<string, unknown>)['line-color'];
		expect(roadColor(await build({ osmOverlay: { theme: 'toner' } }))).not.toBe(
			roadColor(await build({ osmOverlay: { theme: 'gray' } }))
		);
	});

	it('applies the imagery treatment to labels regardless of palette', async () => {
		for (const theme of ['gray', 'toner', 'colorful'] as const) {
			const paint = layer(await build({ osmOverlay: { theme } }), 'label-place-village')?.paint as Record<
				string,
				unknown
			>;
			const hex = (v: unknown) =>
				Color.parse(v as string)
					.asHex()
					.toLowerCase();
			expect(hex(paint['text-color']), `${theme} label colour`).toBe('#ffffff');
			expect(hex(paint['text-halo-color']), `${theme} halo colour`).toBe('#000000');
			expect(paint['text-halo-width']).toBe(1);
			expect(paint['text-halo-blur']).toBe(0);
		}
	});

	it('lightens water labels too, in a water blue rather than plain white', async () => {
		// Lake and river names are the one label the overlay does not whiten. They used to be missed
		// entirely and kept the basemap's dark slate, which sat at 2.9:1 on the forced black halo.
		for (const theme of ['gray', 'toner', 'colorful'] as const) {
			for (const id of ['label-water-area-major', 'label-water-river']) {
				const paint = layer(await build({ osmOverlay: { theme } }), id)?.paint as Record<string, unknown>;
				expect(
					Color.parse(paint['text-color'] as string)
						.asHex()
						.toLowerCase(),
					`${theme} ${id}`
				).toBe('#8fc1ed');
				expect(
					Color.parse(paint['text-halo-color'] as string)
						.asHex()
						.toLowerCase()
				).toBe('#000000');
			}
		}
	});

	it('lets an explicit water-label colour override the imagery default', async () => {
		const s = await build({ osmOverlay: { colors: { labelWater: '#00ff00' } } });
		const c = (layer(s, 'label-water-river')?.paint as Record<string, unknown>)['text-color'];
		expect(
			Color.parse(c as string)
				.asHex()
				.toLowerCase()
		).toBe('#00ff00');
	});

	it('lets an explicit label colour override the imagery default', async () => {
		const s = await build({ osmOverlay: { colors: { label: '#ff0000' } } });
		const c = (layer(s, 'label-place-village')?.paint as Record<string, unknown>)['text-color'];
		expect(
			Color.parse(c as string)
				.asHex()
				.toLowerCase()
		).toBe('#ff0000');
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
	it('base rewrites the satellite source host', () => {
		const s = build({ urls: { base: 'https://my.cdn.example' } });
		expect((s.sources['satellite'] as { url: string }).url).toContain('my.cdn.example');
	});

	it('an explicit satellite TileJSON is fetched, and its tile_size becomes tileSize', async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(JSON.stringify({ tiles: ['https://sat/{z}/{x}/{y}'], tile_size: 512, minzoom: 0, maxzoom: 18 }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
		);
		const s = await inlineSources(build({ urls: { satellite: 'https://sat/tiles.json' } }), {
			fetch: fetchFn,
		});
		const src = s.sources['satellite'] as { tiles: string[]; tileSize: number; minzoom: number };
		expect(src.tiles[0]).toBe('https://sat/{z}/{x}/{y}');
		expect(src.tileSize).toBe(512);
		expect(src.minzoom).toBe(0);
	});

	it('omits raster tileSize when the TileJSON omits tile_size (after inlining)', async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(JSON.stringify({ tiles: ['https://sat/{z}/{x}/{y}'] }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
		);
		const s = await inlineSources(build({ urls: { satellite: 'https://sat/tiles.json' } }), {
			fetch: fetchFn,
		});
		expect(s.sources['satellite'] as Record<string, unknown>).not.toHaveProperty('tileSize');
	});
});

// ── static helpers ───────────────────────────────────────────────────────────────

describe('satellite() static properties', () => {
	it('satellite.colorKeys mirrors the osm color keys', () => {
		expect(satellite.colorKeys).toHaveLength(45);
	});

	it('satellite.slots exposes the raster/symbol/label anchors', () => {
		expect(satellite.slots).toStrictEqual({
			belowRaster: 'slot-below-raster',
			belowSymbols: 'slot-below-symbols',
			belowLabels: 'slot-below-labels',
		});
	});

	it('satellite.defaults is a fully-resolved ResolvedSatellite (overlay on)', () => {
		const d = satellite.defaults;
		expect(d.osmOverlay).not.toBe(false);
		expect((d.osmOverlay as { theme: unknown }).theme).toBeDefined();
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

// ── sky ──────────────────────────────────────────────────────────────────────────

describe('satellite() knob: sky', () => {
	it('takes sky and horizon from the overlay palette, like osm()', async () => {
		// The default overlay palette is `gray`; before this the satellite sky was hardcoded sky-blue
		// whatever the overlay looked like, which is the defect #126 fixed for osm() but not here.
		const gray = osm.colors('gray');
		expect((await build()).sky).toStrictEqual({
			'sky-color': gray.water,
			'horizon-color': gray.background,
			'sky-horizon-blend': 0.5,
			'horizon-fog-blend': 0.5,
			'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 2, 0.8, 5, 0],
		});
	});

	it('follows an explicit overlay theme', async () => {
		const dark = osm.colors('colorful-dark');
		const s = await build({ osmOverlay: { theme: 'colorful-dark' } });
		expect(s.sky).toMatchObject({ 'sky-color': dark.water, 'horizon-color': dark.background });
	});

	it('keeps the generic sky blue for bare imagery, which has no palette', async () => {
		const s = await build({ osmOverlay: false });
		expect(s.sky).toMatchObject({ 'sky-color': '#87CEEB', 'horizon-color': '#ffffff' });
	});

	it('maps sky options onto style-spec properties', async () => {
		const s = await build({ sky: { skyColor: '#010203', atmosphereBlend: 0.7 } });
		expect(s.sky).toMatchObject({ 'sky-color': '#010203', 'atmosphere-blend': 0.7 });
	});
});

// `osmOverlay` takes the same `boolean | object` shape as features.terrain / features.hillshade:
// `true` means "on with defaults", not "not configured".
describe('satellite() knob: osmOverlay accepts a boolean', () => {
	it('true is identical to the default and to an empty object', () => {
		const bare = JSON.stringify(satellite());
		expect(JSON.stringify(satellite({ osmOverlay: true }))).toBe(bare);
		expect(JSON.stringify(satellite({ osmOverlay: {} }))).toBe(bare);
	});

	it('false disables the overlay', () => {
		expect(satellite({ osmOverlay: false }).sources).not.toHaveProperty('versatiles-shortbread');
	});

	it('an object still configures it', () => {
		const toner = satellite({ osmOverlay: { theme: 'toner' } });
		expect(JSON.stringify(toner)).not.toBe(JSON.stringify(satellite({ osmOverlay: true })));
	});
});

// v5 built the satellite overlay from `graybeard`; `gray` is its measured successor and the least
// saturated palette, so it stays out of the imagery's way. osm() keeps `colorful` (A3).
describe('satellite() knob: overlay palette default', () => {
	it('defaults the overlay to gray, not colorful', () => {
		const overlay = satellite.defaults.osmOverlay;
		expect(overlay).not.toBe(false);
		expect((overlay as { theme: string }).theme).toBe('gray');
	});

	it('does not change osm()’s own default', () => {
		expect(osm.resolveOptions().theme).toBe('colorful');
	});

	it('an explicit overlay theme still wins', () => {
		const r = satellite.resolveOptions({ osmOverlay: { theme: 'toner' } });
		expect((r.osmOverlay as { theme: string }).theme).toBe('toner');
	});

	it('rejects the removed { darkMode } object, suggesting the dark gray theme', () => {
		expect(() => satellite.resolveOptions({ osmOverlay: { theme: { darkMode: true } as never } })).toThrow(
			'satellite.osmOverlay.theme: expected a theme name, not an object — use "gray-dark".'
		);
	});
});

describe('satellite() knob: projection', () => {
	it('defaults to globe and is overridable', () => {
		expect((satellite() as { projection?: unknown }).projection).toStrictEqual({ type: 'globe' });
		expect((satellite({ projection: 'mercator' }) as { projection?: unknown }).projection).toStrictEqual({
			type: 'mercator',
		});
	});
});

// Same guarantee as osm(): resolved options no longer pin the sky, so turning the overlay off on top
// of `satellite.resolveOptions()` gives bare imagery its generic sky rather than the overlay's.
describe('satellite() resolved options round-trip without pinning the sky', () => {
	it('lets the sky follow the overlay toggle on top of resolved defaults', async () => {
		const s = await build({ ...satellite.resolveOptions(), osmOverlay: false });
		expect(s.sky).toMatchObject({ 'sky-color': '#87CEEB', 'horizon-color': '#ffffff' });
	});
});

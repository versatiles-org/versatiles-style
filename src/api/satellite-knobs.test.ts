import { describe, expect, it } from 'vitest';
import { satellite } from './satellite.js';
import type { SatelliteOptions } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';
import { inlineSources } from '../lib/index.js';
import { tileJSONFetch } from '../lib/loadTileSource.test.js';
import { osm } from './osm.js';
import { Color } from '../color/index.js';
import { PALETTES } from '../themes/index.js';

// Exhaustive behavioural coverage of every satellite() option ("knob"): raster paint
// adjustments, the OSM overlay (and the OSM knobs it forwards), terrain/hillshade/sun,
// URL configuration, and the static helpers. Relies on the global `fetch` stub from
// vitest.setup.ts.

const build = (options?: SatelliteOptions): StyleSpecification => satellite(options);

const layer = (s: StyleSpecification, id: string) => s.layers.find((l) => l.id === id);
const paint = (s: StyleSpecification, id: string): Record<string, unknown> =>
	(layer(s, id)?.paint ?? {}) as Record<string, unknown>;
const hasFills = (s: StyleSpecification): boolean => s.layers.some((l) => l.type === 'fill');

// The overlay's label treatment is asserted as a rule rather than as fixed hex — see
// `overlayLabelColors` in `options/osm-overlay.ts`. These mirror its thresholds.
const LABEL_LIGHTNESS = 0.92;
const HALO_LIGHTNESS = 0.15;
const WATER_LIGHTNESS = 0.85;
/**
 * The derivation sets lightness in OKLCh but emits 8-bit hex, so a value comes back a hair under the
 * threshold it was set to (`colorful`'s label lands on 0.9194). The rule is the threshold; this is the
 * width of the rounding, not slack for a colour that genuinely misses.
 */
const QUANTISATION = 0.002;
const oklch = (v: unknown) => Color.parse(v as string).to('oklch').coords;
const lightness = (v: unknown): number => oklch(v)[0];
/** 0 for a grey; a hue with no chroma reports `NaN`, which no comparison here should see. */
const chroma = (v: unknown): number => oklch(v)[1];
const alpha = (v: unknown): number => Color.parse(v as string).alpha;

// ── raster paint (all six knobs) ─────────────────────────────────────────────────

describe('satellite() knob: raster', () => {
	it('all raster adjustments are written to the satellite layer paint', () => {
		const s = build({
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
	] as [string, SatelliteOptions['raster'], string, number][])('raster.%s → %s', (_name, raster, key, value) => {
		expect(paint(build({ raster }), 'satellite')[key]).toBe(value);
	});

	it('omits raster paint entirely when every value is default', () => {
		const p = layer(build(), 'satellite')?.paint;
		expect(!p || Object.keys(p).length === 0).toBe(true);
	});
});

// ── osmOverlay ───────────────────────────────────────────────────────────────────

describe('satellite() knob: osmOverlay', () => {
	it('is enabled by default (vector source + overlay symbols)', () => {
		// A bare satellite() gives a usable map, as in v5; only `osmOverlay: false` turns it off.
		const s = build();
		expect(s.sources).toHaveProperty('versatiles-shortbread');
		expect(s.layers.some((l) => l.type === 'symbol')).toBe(true);
	});

	it('the default differs from an explicitly disabled overlay', () => {
		// The two were byte-identical while `undefined` was treated as `false`.
		expect(JSON.stringify(build())).not.toBe(JSON.stringify(build({ osmOverlay: false })));
	});

	it('osmOverlay:false keeps the style raster-only but still exposes slot anchors', () => {
		const s = build({ osmOverlay: false });
		expect(s.sources).not.toHaveProperty('versatiles-shortbread');
		expect(layer(s, 'slot-below-symbols')).toBeDefined();
		expect(layer(s, 'slot-below-labels')).toBeDefined();
	});

	it('osmOverlay:{} adds the vector source and label symbols on top of the raster', () => {
		const s = build({ osmOverlay: {} });
		expect(s.sources).toHaveProperty('versatiles-shortbread');
		expect(s.layers.some((l) => l.type === 'symbol')).toBe(true);
	});

	it('the overlay never contributes fill layers (they would hide the imagery)', () => {
		expect(hasFills(build({ osmOverlay: {} }))).toBe(false);
	});

	it('the overlay keeps exactly one (dark) background, not the OSM opaque one', () => {
		const s = build({ osmOverlay: {} });
		const bgs = s.layers.filter((l) => l.type === 'background' && l.id === 'background');
		expect(bgs).toHaveLength(1);
		expect((bgs[0].paint as Record<string, unknown>)['background-color']).toBe('#000');
	});

	it('forwards the theme knob to the overlay', () => {
		// Label colours follow the palette only in hue and chroma — every theme puts them at the same
		// lightness — so the theme is observed on a road colour, which varies outright.
		const roadColor = (s: StyleSpecification) =>
			(layer(s, 'street-motorway')?.paint as Record<string, unknown>)['line-color'];
		expect(roadColor(build({ osmOverlay: { theme: 'toner' } }))).not.toBe(
			roadColor(build({ osmOverlay: { theme: 'gray' } }))
		);
	});

	it('applies the imagery treatment to labels regardless of palette', () => {
		// The treatment is a rule, not a set of fixed colours: light text on a dark halo, with hue and
		// chroma left to the theme. Pinning literal hex here is what let a hardcoded water blue sit in
		// `gray` unnoticed, so assert the property that has to hold for every palette instead.
		//
		// The two lightness bounds are what carry the legibility: holding text at >= 0.92 and halo at
		// <= 0.15 puts every palette between 15.4:1 and 21.0:1 on the halo (water labels, at the lower
		// WATER_LIGHTNESS, between 12.6:1 and 15.6:1).
		for (const theme of PALETTES) {
			const paint = layer(build({ osmOverlay: { theme } }), 'label-place-village')?.paint as Record<string, unknown>;
			expect(lightness(paint['text-color']), `${theme} label lightness`).toBeGreaterThanOrEqual(
				LABEL_LIGHTNESS - QUANTISATION
			);
			expect(lightness(paint['text-halo-color']), `${theme} halo lightness`).toBeLessThanOrEqual(
				HALO_LIGHTNESS + QUANTISATION
			);
			expect(alpha(paint['text-color']), `${theme} label alpha`).toBe(1);
			expect(paint['text-halo-width']).toBe(1);
			expect(paint['text-halo-blur'] ?? 0).toBe(0); // 0 is MapLibre's default, so it is not written
		}
	});

	it('keeps an achromatic palette achromatic', () => {
		// `gray` is chroma 0 across all 45 of its colours. A label the theme cannot account for — the
		// hardcoded `#8FC1ED` water blue this replaced — makes the overlay the only coloured thing on
		// an explicitly colourless map.
		for (const theme of ['gray', 'gray-dark'] as const) {
			for (const id of ['label-place-village', 'label-water-river', 'poi-amenity']) {
				const paint = layer(build({ osmOverlay: { theme } }), id)?.paint as Record<string, unknown>;
				expect(chroma(paint['text-color']), `${theme} ${id}`).toBeCloseTo(0, 5);
			}
		}
	});

	it('lightens water labels too, keeping the theme water hue where it has one', () => {
		// Lake and river names are the one label the overlay does not simply lighten: they take their
		// hue from the theme's `water` polygon colour, because over imagery the label is alone and has
		// to carry the "this is water" cue the polygon carries on the basemap. They used to be missed
		// entirely and kept the basemap's dark slate, which sat at ~3:1 on the overlay's halo.
		for (const theme of PALETTES) {
			for (const id of ['label-water-area-major', 'label-water-river']) {
				const paint = layer(build({ osmOverlay: { theme } }), id)?.paint as Record<string, unknown>;
				expect(lightness(paint['text-color']), `${theme} ${id}`).toBeGreaterThanOrEqual(WATER_LIGHTNESS - QUANTISATION);
			}
		}
		// …and where the theme does have a water hue, the label keeps it rather than going plain white.
		const blue = layer(build({ osmOverlay: { theme: 'colorful' } }), 'label-water-river')?.paint as Record<
			string,
			unknown
		>;
		expect(chroma(blue['text-color'])).toBeGreaterThan(0.02);
	});

	it('lets an explicit water-label colour override the imagery default', () => {
		const s = build({ osmOverlay: { colors: { labelWater: '#00ff00' } } });
		const c = (layer(s, 'label-water-river')?.paint as Record<string, unknown>)['text-color'];
		expect(
			Color.parse(c as string)
				.asHex()
				.toLowerCase()
		).toBe('#00ff00');
	});

	it('lets an explicit label colour override the imagery default', () => {
		const s = build({ osmOverlay: { colors: { label: '#ff0000' } } });
		const c = (layer(s, 'label-place-village')?.paint as Record<string, unknown>)['text-color'];
		expect(
			Color.parse(c as string)
				.asHex()
				.toLowerCase()
		).toBe('#ff0000');
	});

	it('forwards the text.language knob to the overlay', () => {
		const s = build({ osmOverlay: { text: { language: 'de' } } });
		const field = (layer(s, 'label-place-village')?.layout as Record<string, unknown>)['text-field'];
		expect(field).toStrictEqual(['coalesce', ['get', 'name_de'], ['get', 'name']]);
	});

	it('sets every overlay label in bold, and keeps the others bold when one topic sets a font', () => {
		const font = (s: StyleSpecification, id: string) =>
			((layer(s, id)?.layout as Record<string, unknown>)['text-font'] as string[])[0];
		expect(font(build(), 'label-place-village')).toBe('noto_sans_bold');
		const s = build({ osmOverlay: { text: { water: { font: 'my_italic' } } } });
		expect(font(s, 'label-water-river')).toBe('my_italic');
		expect(font(s, 'label-place-village')).toBe('noto_sans_bold');
	});

	it('lets a topic change the overlay halo, keeping the imagery halo elsewhere', () => {
		const s = build({ osmOverlay: { text: { places: { haloWidth: 3, haloBlur: 2 } } } });
		expect(paint(s, 'label-place-village')).toMatchObject({ 'text-halo-width': 3, 'text-halo-blur': 2 });
		expect(paint(s, 'label-street-residential')['text-halo-width']).toBe(1);
		expect(paint(s, 'label-street-residential')['text-halo-blur'] ?? 0).toBe(0);
		// the halo colour is still the overlay's own, derived from the theme
		expect(lightness(paint(s, 'label-place-village')['text-halo-color'])).toBeLessThanOrEqual(
			HALO_LIGHTNESS + QUANTISATION
		);
	});

	it('keeps house numbers without a halo, as on the basemap', () => {
		const s = build();
		expect(layer(s, 'label-address-housenumber')).toBeDefined();
		expect(paint(s, 'label-address-housenumber')['text-halo-width']).toBeUndefined();
		expect(paint(s, 'label-address-housenumber')['text-halo-blur']).toBeUndefined();
	});

	it('forwards the layers knob to the overlay (hidden groups are dropped)', () => {
		const s = build({ osmOverlay: { layers: { labels: false } } });
		expect(layer(s, 'label-place-village')).toBeUndefined();
	});

	it('the overlay symbols sit above the satellite raster', () => {
		const s = build({ osmOverlay: {} });
		const idsList = s.layers.map((l) => l.id);
		expect(idsList.indexOf('slot-below-symbols')).toBeGreaterThan(idsList.indexOf('satellite'));
	});
});

// ── features: terrain / hillshade / sun ──────────────────────────────────────────

describe('satellite() knob: features', () => {
	it('terrain:true enables terrain with an elevation source', () => {
		const s = build({ features: { terrain: true } });
		expect(s.terrain).toEqual({ source: 'elevation', exaggeration: 1 });
		expect(s.sources).toHaveProperty('elevation');
	});

	it('terrain exaggeration flows through', () => {
		expect(build({ features: { terrain: { exaggeration: 3 } } }).terrain?.exaggeration).toBe(3);
	});

	it('hillshade:true adds a hillshade layer + elevation source', () => {
		const s = build({ features: { hillshade: true } });
		expect(layer(s, 'hillshade')).toBeDefined();
		expect(s.sources).toHaveProperty('elevation');
	});

	it('sun drives the hillshade illumination and style.light', () => {
		const s = build({ features: { hillshade: true }, sun: { direction: 120, altitude: 20 } });
		const p = paint(s, 'hillshade');
		expect(p['hillshade-illumination-direction']).toBe(120);
		expect(p['hillshade-illumination-altitude']).toBe(20);
		expect((s.light?.position as number[])?.[1]).toBe(120);
	});

	it('sun configures style.light even without hillshade', () => {
		expect(build({ sun: { direction: 120 } }).light).toStrictEqual({
			anchor: 'viewport',
			position: [1.15, 120, 30],
			color: 'rgb(255,255,255)',
			intensity: 0.5,
		});
	});
});

// ── URL configuration ────────────────────────────────────────────────────────────

describe('satellite() knob: urls', () => {
	it('base rewrites the satellite source host', () => {
		const s = build({ urls: { base: 'https://my.cdn.example' } });
		expect((s.sources['satellite'] as { url: string }).url).toContain('my.cdn.example');
	});

	it('an explicit satellite TileJSON is fetched, and its tile_size becomes tileSize', async () => {
		const fetchFn = tileJSONFetch({
			'https://sat/': { tiles: ['https://sat/{z}/{x}/{y}'], tile_size: 512, minzoom: 0, maxzoom: 18 },
		});
		const s = await inlineSources(build({ urls: { satellite: 'https://sat/tiles.json' } }), {
			fetch: fetchFn,
		});
		const src = s.sources['satellite'] as { tiles: string[]; tileSize: number; minzoom: number };
		expect(src.tiles[0]).toBe('https://sat/{z}/{x}/{y}');
		expect(src.tileSize).toBe(512);
		expect(src.minzoom).toBe(0);
	});

	it('omits raster tileSize when the TileJSON omits tile_size (after inlining)', async () => {
		const fetchFn = tileJSONFetch({ 'https://sat/': { tiles: ['https://sat/{z}/{x}/{y}'] } });
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

/** The sky values every style writes, whatever the palette. */
const SKY_STYLE_DEFAULTS = {
	'horizon-color': 'rgb(255,255,255)',
	'fog-color': 'rgb(255,255,255)',
	'sky-horizon-blend': 0.8,
	'horizon-fog-blend': 0.8,
	'fog-ground-blend': 0.5,
	'atmosphere-blend': 0,
};

describe('satellite() knob: sky', () => {
	it('takes the sky colour from the overlay palette, like osm()', () => {
		// The default overlay palette is `gray`; before this the satellite sky was hardcoded sky-blue
		// whatever the overlay looked like, which is the defect #126 fixed for osm() but not here.
		const gray = osm.colors('gray');
		expect(build().sky).toStrictEqual({ 'sky-color': Color.parse(gray.water).asString(), ...SKY_STYLE_DEFAULTS });
	});

	it('follows an explicit overlay theme', () => {
		const dark = osm.colors('colorful-dark');
		const s = build({ osmOverlay: { theme: 'colorful-dark' } });
		expect(s.sky).toMatchObject({ 'sky-color': Color.parse(dark.water).asString() });
	});

	it('keeps the generic sky blue for bare imagery, which has no palette', () => {
		// no `sky-color` at all, so MapLibre's own sky blue applies
		const s = build({ osmOverlay: false });
		expect(s.sky).toStrictEqual(SKY_STYLE_DEFAULTS);
	});

	it('maps sky options onto style-spec properties', () => {
		const s = build({ sky: { skyColor: '#010203', atmosphereBlend: 0.7 } });
		expect(s.sky).toMatchObject({ 'sky-color': 'rgb(1,2,3)', 'atmosphere-blend': 0.7 });
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
	it('lets the sky follow the overlay toggle on top of resolved defaults', () => {
		const s = build({ ...satellite.resolveOptions(), osmOverlay: false });
		expect(s.sky).toStrictEqual(SKY_STYLE_DEFAULTS);
	});
});

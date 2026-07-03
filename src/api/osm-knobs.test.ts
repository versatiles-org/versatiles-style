import { describe, expect, it, vi } from 'vitest';
import { osm } from './osm.js';
import type { OsmOptions } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';

// Exhaustive behavioural coverage of every osm() option ("knob"). Where a resolve-level
// test already exists (options/resolve.test.ts, options/layer-groups.test.ts), this file
// instead asserts that the knob actually changes the *generated MapLibre style* — i.e. that
// the option is wired all the way through to the output, not just parsed.
//
// Tests rely on the global `fetch` stub from vitest.setup.ts (canned Shortbread TileJSON).

const build = (options?: OsmOptions): Promise<StyleSpecification> => osm(options);

const ids = (s: StyleSpecification): string[] => s.layers.map((l) => l.id);
const layer = (s: StyleSpecification, id: string) => s.layers.find((l) => l.id === id);
const paint = (s: StyleSpecification, id: string): Record<string, unknown> =>
	(layer(s, id)?.paint ?? {}) as Record<string, unknown>;
const layout = (s: StyleSpecification, id: string): Record<string, unknown> =>
	(layer(s, id)?.layout ?? {}) as Record<string, unknown>;
const bgColor = (s: StyleSpecification): unknown => paint(s, 'background')['background-color'];

// ── theme ──────────────────────────────────────────────────────────────────────

describe('osm() knob: theme', () => {
	it('every palette produces a distinct background color', async () => {
		const styles = await Promise.all(osm.palettes.map((p) => build({ theme: p })));
		const backgrounds = styles.map(bgColor);
		expect(new Set(backgrounds).size).toBe(osm.palettes.length);
	});

	it('darkMode flips the background between light and dark', async () => {
		const light = await build({ theme: { palette: 'colorful', darkMode: false } });
		const dark = await build({ theme: { palette: 'colorful', darkMode: true } });
		expect(bgColor(light)).not.toBe(bgColor(dark));
	});

	it("darkMode:'auto' resolves to light in a non-browser (node) environment", async () => {
		const auto = await build({ theme: { palette: 'colorful', darkMode: 'auto' } });
		const light = await build({ theme: { palette: 'colorful', darkMode: false } });
		expect(bgColor(auto)).toBe(bgColor(light));
	});

	it('palette string shorthand equals the explicit object form', async () => {
		const short = await build({ theme: 'toner' });
		const long = await build({ theme: { palette: 'toner', darkMode: false } });
		expect(bgColor(short)).toBe(bgColor(long));
	});
});

// ── colors (every one of the 44 keys) ───────────────────────────────────────────

describe('osm() knob: colors', () => {
	it.each(osm.colorKeys)('colors.%s is wired into the output', async (key) => {
		const base = JSON.stringify((await build()).layers);
		const overridden = JSON.stringify((await build({ colors: { [key]: '#abcdef' } })).layers);
		expect(overridden).not.toBe(base);
	});

	it('a color override lands on its target layer (water → water-ocean)', async () => {
		const s = await build({ colors: { water: '#0000ff' } });
		expect(String(paint(s, 'water-ocean')['fill-color'])).toContain('0,0,255');
	});
});

// ── text ─────────────────────────────────────────────────────────────────────────

describe('osm() knob: text', () => {
	it("defaults to the local name field (['get','name'])", async () => {
		expect(layout(await build(), 'label-place-village')['text-field']).toStrictEqual(['get', 'name']);
	});

	it('language uses a coalesce over name_<lang> and name by default (non-strict)', async () => {
		const s = await build({ text: { language: 'de' } });
		expect(layout(s, 'label-place-village')['text-field']).toStrictEqual([
			'coalesce',
			['get', 'name_de'],
			['get', 'name'],
		]);
	});

	it('languageStrict:true drops the fallback and uses name_<lang> directly', async () => {
		const s = await build({ text: { language: 'de', languageStrict: true } });
		expect(layout(s, 'label-place-village')['text-field']).toStrictEqual(['get', 'name_de']);
	});

	it('fontNormal defaults to noto_sans_regular', async () => {
		expect(layout(await build(), 'label-place-village')['text-font']).toStrictEqual(['noto_sans_regular']);
	});

	it('fontNormal / fontBold override the emitted text-font', async () => {
		const s = await build({ text: { fontNormal: 'my_regular', fontBold: 'my_bold' } });
		// label-place-village renders with the normal font; the motorway shield uses bold.
		expect(layout(s, 'label-place-village')['text-font']).toStrictEqual(['my_regular']);
		expect(layout(s, 'label-motorway-shield')['text-font']).toStrictEqual(['my_bold']);
	});
});

// ── layout.scale ─────────────────────────────────────────────────────────────────

describe('osm() knob: layout.scale', () => {
	it('scale.labels multiplies symbol text-size', async () => {
		const base = layout(await build(), 'label-place-village')['text-size'];
		const scaled = layout(await build({ layout: { scale: { labels: 2 } } }), 'label-place-village')['text-size'];
		if (typeof base === 'number') expect(scaled).toBeCloseTo(base * 2);
		else expect(scaled).not.toStrictEqual(base);
	});

	it('scale.icons multiplies icon-size on icon layers', async () => {
		const base = layout(await build(), 'poi-amenity')['icon-size'] as unknown[];
		const scaled = layout(await build({ layout: { scale: { icons: 2 } } }), 'poi-amenity')['icon-size'] as unknown[];
		// icon-size is an ['interpolate', …, z, v, z, v] ramp; every value doubles.
		const values = (arr: unknown[]) => arr.filter((_, i) => i >= 4 && i % 2 === 0) as number[];
		expect(values(scaled)).toStrictEqual(values(base).map((v) => v * 2));
	});

	it('a scalar scale applies to both labels and icons', async () => {
		const s = await build({ layout: { scale: 1.5 } });
		const baseText = layout(await build(), 'label-place-village')['text-size'];
		const scaledText = layout(s, 'label-place-village')['text-size'];
		if (typeof baseText === 'number') expect(scaledText).toBeCloseTo(baseText * 1.5);
		else expect(scaledText).not.toStrictEqual(baseText);
	});
});

// ── features.terrain ─────────────────────────────────────────────────────────────

describe('osm() knob: features.terrain', () => {
	it('terrain:true enables 3D terrain with a raster-dem elevation source', async () => {
		const s = await build({ features: { terrain: true } });
		expect(s.terrain).toEqual({ source: 'elevation', exaggeration: 1 });
		expect(s.sources).toHaveProperty('elevation');
	});

	it('terrain exaggeration flows into style.terrain', async () => {
		const s = await build({ features: { terrain: { exaggeration: 2.5 } } });
		expect(s.terrain?.exaggeration).toBe(2.5);
	});

	it('no terrain by default', async () => {
		expect((await build()).terrain).toBeUndefined();
	});
});

// ── features.hillshade (+ sun) ───────────────────────────────────────────────────

describe('osm() knob: features.hillshade', () => {
	it('hillshade:true adds a hillshade layer + elevation source', async () => {
		const s = await build({ features: { hillshade: true } });
		expect(ids(s)).toContain('hillshade');
		expect(s.sources).toHaveProperty('elevation');
	});

	it('hillshade exaggeration / anchor flow into the layer paint', async () => {
		const s = await build({ features: { hillshade: { exaggeration: 0.42, anchor: 'viewport' } } });
		const p = paint(s, 'hillshade');
		expect(p['hillshade-exaggeration']).toBe(0.42);
		expect(p['hillshade-illumination-anchor']).toBe('viewport');
	});

	it('hillshade custom colors change the emitted paint colors', async () => {
		const def = paint(await build({ features: { hillshade: true } }), 'hillshade');
		const custom = paint(
			await build({
				features: { hillshade: { shadowColor: '#123456', highlightColor: '#654321', accentColor: '#abcdef' } },
			}),
			'hillshade'
		);
		expect(custom['hillshade-shadow-color']).not.toBe(def['hillshade-shadow-color']);
		expect(custom['hillshade-highlight-color']).not.toBe(def['hillshade-highlight-color']);
		expect(custom['hillshade-accent-color']).not.toBe(def['hillshade-accent-color']);
	});
});

describe('osm() knob: sun', () => {
	it('sun direction / altitude drive the hillshade illumination', async () => {
		const s = await build({ features: { hillshade: true }, sun: { direction: 123, altitude: 27 } });
		const p = paint(s, 'hillshade');
		expect(p['hillshade-illumination-direction']).toBe(123);
		expect(p['hillshade-illumination-altitude']).toBe(27);
	});

	it('sun configures style.light for hillshade (position, color, intensity)', async () => {
		const s = await build({
			features: { hillshade: true },
			sun: { direction: 100, altitude: 30, color: '#ff0000', intensity: 0.9 },
		});
		expect(s.light).toEqual({ anchor: 'map', position: [1.15, 100, 60], color: '#ff0000', intensity: 0.9 });
	});

	it('extruded buildings sync style.light even without hillshade', async () => {
		const s = await build({ features: { buildings: 'extruded', hillshade: false }, sun: { direction: 200 } });
		expect((s.light?.position as number[])?.[1]).toBe(200);
	});

	it('no style.light without hillshade or extruded buildings', async () => {
		expect((await build({ features: { hillshade: false } })).light).toBeUndefined();
	});
});

// ── features.buildings ───────────────────────────────────────────────────────────

describe('osm() knob: features.buildings', () => {
	it('flat (default) renders footprint fills, not extrusions', async () => {
		const s = await build({ features: { buildings: 'flat' } });
		expect(layer(s, 'building')).toBeDefined();
		expect(layer(s, 'building-3d')).toBeUndefined();
	});

	it('extruded swaps footprints for a 3D building layer on top', async () => {
		const s = await build({ features: { buildings: 'extruded' } });
		expect(layer(s, 'building')).toBeUndefined();
		expect(layer(s, 'building-3d')).toBeDefined();
		expect(ids(s)[ids(s).length - 1]).toBe('building-3d');
	});
});

// ── features.landcover ───────────────────────────────────────────────────────────

describe('osm() knob: features.landcover', () => {
	it('landcover removes the low-zoom fade on landcover-backed fills', async () => {
		const off = paint(await build(), 'land-forest')['fill-opacity'];
		const on = paint(await build({ features: { landcover: true } }), 'land-forest')['fill-opacity'];
		// default is a zoom ramp; landcover pins the fully-faded-in constant.
		expect(Array.isArray(off)).toBe(true);
		expect(on).toBe(1);
	});

	it('landcover is off by default', async () => {
		expect(Array.isArray(paint(await build(), 'land-forest')['fill-opacity'])).toBe(true);
	});
});

// ── recolor (every transform) ────────────────────────────────────────────────────

describe('osm() knob: recolor', () => {
	const RECOLORS: [string, OsmOptions['recolor']][] = [
		['invertBrightness', { invertBrightness: true }],
		['rotateHue', { rotateHue: 120 }],
		['saturate', { saturate: -1 }],
		['gamma', { gamma: 0.4 }],
		['contrast', { contrast: 2 }],
		['brightness', { brightness: 0.5 }],
		['tint', { tint: { color: '#00ff00', amount: 1 } }],
		['blend', { blend: { color: '#00ff00', amount: 1 } }],
	];

	it.each(RECOLORS)('recolor.%s changes output colors', async (_name, recolor) => {
		const base = bgColor(await build());
		expect(bgColor(await build({ recolor }))).not.toBe(base);
	});

	it('the default (identity) recolor leaves palette colors unchanged', async () => {
		expect(bgColor(await build({ recolor: {} }))).toBe(bgColor(await build()));
	});
});

// ── urls ─────────────────────────────────────────────────────────────────────────

describe('osm() knob: urls', () => {
	it('base rewrites osm tiles, glyphs and sprite hosts', async () => {
		const s = await build({ urls: { base: 'https://my.cdn.example' } });
		const src = s.sources['versatiles-shortbread'] as { tiles: string[] };
		expect(src.tiles[0]).toContain('my.cdn.example');
		expect(String(s.glyphs)).toContain('my.cdn.example');
	});

	it('explicit osm URL is used verbatim', async () => {
		const s = await build({ urls: { osm: 'https://custom.tiles/tiles.json' } });
		const src = s.sources['versatiles-shortbread'] as { tiles: string[] };
		expect(src.tiles[0]).toBe('https://custom.tiles/{z}/{x}/{y}');
	});

	it('explicit glyphsPattern is used verbatim', async () => {
		const s = await build({ urls: { glyphsPattern: 'https://g.example/{fontstack}/{range}.pbf' } });
		expect(s.glyphs).toBe('https://g.example/{fontstack}/{range}.pbf');
	});

	it('custom elevation URL is fetched and embedded when terrain is on', async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(JSON.stringify({ tiles: ['https://dem/{z}/{x}/{y}'], minzoom: 0, maxzoom: 12 }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
		);
		const s = await build({
			features: { terrain: true },
			urls: { elevation: 'https://dem/tiles.json', fetch: fetchFn },
		});
		const src = s.sources['elevation'] as { tiles: string[] };
		expect(src.tiles[0]).toBe('https://dem/{z}/{x}/{y}');
		expect(fetchFn).toHaveBeenCalled();
	});

	it('sprite as a string is passed through unchanged', async () => {
		const s = await build({ urls: { sprite: 'https://cdn.example/sprites/basics' } });
		expect(s.sprite).toBe('https://cdn.example/sprites/basics');
	});

	it('sprite as an array resolves relative URLs against base', async () => {
		const s = await build({ urls: { base: 'https://b.example', sprite: [{ id: 'a', url: '/s/a' }] } });
		expect(s.sprite).toStrictEqual([{ id: 'a', url: 'https://b.example/s/a' }]);
	});

	it('a custom fetch is used to download TileJSON', async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(JSON.stringify({ tiles: ['https://x/{z}/{x}/{y}'], minzoom: 0, maxzoom: 14 }), {
					status: 200,
					headers: { 'content-type': 'application/json' },
				})
		);
		await build({ urls: { fetch: fetchFn } });
		expect(fetchFn).toHaveBeenCalled();
	});
});

// ── layers (layer-group visibility / opacity), output-level gating ───────────────

describe('osm() knob: layers (group gating)', () => {
	// [option, an id that must disappear, an id that must remain] — verified empirically.
	const CASES: [OsmOptions['layers'], string, string][] = [
		[{ land: false }, 'land-forest', 'water-ocean'],
		[{ land: { forest: false } }, 'land-forest', 'land-grass'],
		[{ water: false }, 'water-ocean', 'land-forest'],
		[{ water: { piers: false } }, 'water-pier', 'water-ocean'],
		[{ roads: false }, 'street-motorway', 'water-ocean'],
		[{ roads: { motorways: false } }, 'street-motorway', 'street-residential'],
		[{ roads: { streets: { residential: false } } }, 'street-residential', 'street-motorway'],
		[{ roads: { paths: false } }, 'way-path', 'way-footway'],
		[{ roads: { footway: false } }, 'way-footway', 'way-path'],
		[{ roads: { steps: false } }, 'way-steps', 'way-path'],
		[{ transit: { rail: false } }, 'transport-rail', 'aerialway-gondola'],
		[{ transit: { aerialways: false } }, 'aerialway-gondola', 'transport-rail'],
		[{ transit: { ferries: false } }, 'transport-ferry', 'transport-rail'],
		[{ transit: { stops: false } }, 'symbol-transit-bus', 'poi-amenity'],
		[{ buildings: false }, 'building', 'water-ocean'],
		[{ sites: false }, 'site-hospital', 'water-ocean'],
		[{ airport: false }, 'airport-runway', 'water-ocean'],
		[{ pois: false }, 'poi-amenity', 'label-place-village'],
		[{ boundaries: { country: false } }, 'boundary-country', 'boundary-state'],
		[{ boundaries: { state: false } }, 'boundary-state', 'boundary-country'],
		[{ markings: false }, 'marking-oneway', 'poi-amenity'],
		[{ labels: false }, 'label-place-village', 'water-ocean'],
		[{ labels: { places: false } }, 'label-place-village', 'label-street-residential'],
		[{ labels: { streets: false } }, 'label-street-residential', 'label-place-village'],
		[{ labels: { states: false } }, 'label-boundary-state', 'label-place-village'],
		[{ labels: { countries: false } }, 'label-boundary-country-small', 'label-place-village'],
		[{ labels: { addresses: false } }, 'label-address-housenumber', 'label-place-village'],
	];

	it.each(CASES)('%o hides %s but keeps %s', async (layers, hidden, kept) => {
		const s = await build({ layers });
		expect(layer(s, hidden), `${hidden} should be hidden`).toBeUndefined();
		expect(layer(s, kept), `${kept} should remain`).toBeDefined();
	});

	it('icons alias hides every icon group (pois, markings, transit stops) at once', async () => {
		const s = await build({ layers: { icons: false } });
		expect(layer(s, 'poi-amenity')).toBeUndefined();
		expect(layer(s, 'marking-oneway')).toBeUndefined();
		expect(layer(s, 'symbol-transit-bus')).toBeUndefined();
		expect(layer(s, 'label-place-village')).toBeDefined(); // non-icon labels stay
	});

	it('a specific group overrides the icons alias', async () => {
		const s = await build({ layers: { icons: false, pois: true } });
		expect(layer(s, 'poi-amenity')).toBeDefined();
		expect(layer(s, 'marking-oneway')).toBeUndefined();
	});

	it('a fractional group opacity is baked into the layer, scaling its fade target', async () => {
		const s = await build({ layers: { land: { forest: 0.5 } } });
		// land-forest fades 0→1 over z7→8; dimming by 0.5 scales the target to 0.5.
		expect(paint(s, 'land-forest')['fill-opacity']).toStrictEqual(['interpolate', ['linear'], ['zoom'], 7, 0, 8, 0.5]);
	});

	it('buildings opacity merges with the existing z14→15 fade', async () => {
		const s = await build({ layers: { buildings: 0.5 } });
		expect(paint(s, 'building')['fill-opacity']).toStrictEqual(['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.5]);
	});
});

// ── static helpers on the osm() function object ──────────────────────────────────

describe('osm() static properties', () => {
	it('osm.palettes lists all five palettes', () => {
		expect(osm.palettes).toEqual(['colorful', 'natural', 'muted', 'gray', 'toner']);
	});

	it('osm.colorKeys has 44 unique keys', () => {
		expect(osm.colorKeys).toHaveLength(44);
		expect(new Set(osm.colorKeys).size).toBe(44);
	});

	it('osm.slots exposes the four stable beforeId anchors', () => {
		expect(osm.slots).toMatchObject({
			belowFills: 'slot-below-fills',
			belowStreets: 'slot-below-streets',
			belowSymbols: 'slot-below-symbols',
			belowLabels: 'slot-below-labels',
		});
	});

	it('osm.defaults is a fully-resolved ResolvedOsm', () => {
		const d = osm.defaults;
		expect(d.theme).toEqual({ palette: 'colorful', darkMode: false });
		expect(d.features.terrain).toBe(false);
		expect(d.layers.buildings).toBe(true);
	});

	it('osm.colors returns a palette color set', () => {
		expect(typeof osm.colors('toner', false).background).toBe('string');
	});

	it('osm.resolveOptions resolves raw options', () => {
		expect(osm.resolveOptions({ theme: 'gray' }).theme.palette).toBe('gray');
	});

	it('osm.languages extracts name_* language codes from a TileJSON', () => {
		const langs = osm.languages({
			tiles: ['https://t/{z}/{x}/{y}'],
			vector_layers: [{ id: 'p', fields: { name: 'String', name_de: 'String', name_en: 'String' } }],
		} as never);
		expect(langs).toEqual(['de', 'en']);
	});
});

// ── known gaps: knobs that resolve but are not (yet) applied to the output ────────

describe('osm() knobs that are parsed but not applied to the style', () => {
	// These options are accepted and fully resolved, but osm() never writes them into the
	// generated MapLibre style (no `style.sky`, and layout.spacing is ignored by applyScale).
	// Documented as todos so the gap is visible; see also resolve.test.ts which covers parsing.

	it('sky is resolved from options', () => {
		expect(osm.resolveOptions({ sky: { skyColor: '#010203' } }).sky.skyColor).toBe('#010203');
	});

	it.todo('sky should be emitted as style.sky (currently not applied)');

	it('layout.spacing is resolved from options', () => {
		expect(osm.resolveOptions({ layout: { spacing: 2 } }).layout.spacing).toStrictEqual({ labels: 2, icons: 2 });
	});

	it.todo('layout.spacing should scale symbol-spacing (currently not applied)');
});

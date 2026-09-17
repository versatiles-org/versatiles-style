import { describe, expect, it, vi } from 'vitest';
import { osm } from '../index.js';
import { TEXT_TOPICS, type LabelStyle, type OsmOptions } from '../options/index.js';
import type { StyleSpecification } from '../types/index.js';
import { inlineSources } from '../lib/index.js';
import { tileJSONFetch } from '../lib/loadTileSource.test.js';
import { Color } from '../color/index.js';

// Exhaustive behavioural coverage of every osm() option ("knob"). Where a resolve-level
// test already exists (options/resolve.test.ts, options/layer-groups.test.ts), this file
// instead asserts that the knob actually changes the *generated MapLibre style* — i.e. that
// the option is wired all the way through to the output, not just parsed.
//
// Tests rely on the global `fetch` stub from vitest.setup.ts (canned Shortbread TileJSON).

const build = (options?: OsmOptions): StyleSpecification => osm(options);

const ids = (s: StyleSpecification): string[] => s.layers.map((l) => l.id);
const layer = (s: StyleSpecification, id: string) => s.layers.find((l) => l.id === id);
const paint = (s: StyleSpecification, id: string): Record<string, unknown> =>
	(layer(s, id)?.paint ?? {}) as Record<string, unknown>;
const layout = (s: StyleSpecification, id: string): Record<string, unknown> =>
	(layer(s, id)?.layout ?? {}) as Record<string, unknown>;
const bgColor = (s: StyleSpecification): unknown => paint(s, 'background')['background-color'];

// ── theme ──────────────────────────────────────────────────────────────────────

describe('osm() knob: theme', () => {
	it('every palette produces a distinct background color', () => {
		const styles = osm.palettes.map((p) => build({ theme: p }));
		const backgrounds = styles.map(bgColor);
		expect(new Set(backgrounds).size).toBe(osm.palettes.length);
	});

	it('a -dark theme flips the background between light and dark', () => {
		const light = build({ theme: 'colorful' });
		const dark = build({ theme: 'colorful-dark' });
		expect(bgColor(light)).not.toBe(bgColor(dark));
	});

	it('rejects the removed { palette, darkMode } object, naming the theme it meant', () => {
		expect(() => build({ theme: { palette: 'toner', darkMode: true } } as never)).toThrow(
			'osm.theme: expected a theme name, not an object — use "toner-dark".'
		);
	});
});

// ── colors (every one of the 44 keys) ───────────────────────────────────────────

describe('osm() knob: colors', () => {
	it.each(osm.colorKeys)('colors.%s is wired into the output', (key) => {
		const base = JSON.stringify(build().layers);
		const overridden = JSON.stringify(build({ colors: { [key]: '#abcdef' } }).layers);
		expect(overridden).not.toBe(base);
	});

	it('a color override lands on its target layer (water → water-ocean)', () => {
		const s = build({ colors: { water: '#0000ff' } });
		expect(String(paint(s, 'water-ocean')['fill-color'])).toContain('0,0,255');
	});
});

// ── text ─────────────────────────────────────────────────────────────────────────

describe('osm() knob: text', () => {
	it("defaults to the local name field (['get','name'])", () => {
		expect(layout(build(), 'label-place-village')['text-field']).toStrictEqual(['get', 'name']);
	});

	it('language uses a coalesce over name_<lang> and name by default (non-strict)', () => {
		const s = build({ text: { language: 'de' } });
		expect(layout(s, 'label-place-village')['text-field']).toStrictEqual([
			'coalesce',
			['get', 'name_de'],
			['get', 'name'],
		]);
	});

	it('languageStrict:true drops the fallback and uses name_<lang> directly', () => {
		const s = build({ text: { language: 'de', languageStrict: true } });
		expect(layout(s, 'label-place-village')['text-field']).toStrictEqual(['get', 'name_de']);
	});

	describe("language: 'user'", () => {
		const withBrowserLanguage = <T>(language: string | undefined, run: () => T): T => {
			vi.stubGlobal('navigator', language === undefined ? undefined : { language });
			try {
				return run();
			} finally {
				vi.unstubAllGlobals();
			}
		};

		it('builds with the browser language', () => {
			const s = withBrowserLanguage('fr-CH', () => build({ text: { language: 'user' } }));
			expect(layout(s, 'label-place-village')['text-field']).toStrictEqual([
				'coalesce',
				['get', 'name_fr'],
				['get', 'name'],
			]);
		});

		it('falls back to the local name without a browser', () => {
			const s = withBrowserLanguage(undefined, () => build({ text: { language: 'user' } }));
			expect(layout(s, 'label-place-village')['text-field']).toStrictEqual(['get', 'name']);
		});

		it("stays 'user' in resolved and minimised options, whatever the browser language", () => {
			withBrowserLanguage('fr-CH', () => {
				expect(osm.resolveOptions({ text: { language: 'user' } }).text.language).toBe('user');
				expect(osm.minimizeOptions(osm.resolveOptions({ text: { language: 'user' } }))).toEqual({
					text: { language: 'user' },
				});
				expect(osm.toCode({ text: { language: 'user' } })).toContain('"user"');
			});
		});
	});

	const font = (s: StyleSpecification, id: string) => (layout(s, id)['text-font'] as string[])[0];

	it('fonts default to Noto Sans, bold for motorway refs and POI names', () => {
		const s = build();
		expect(font(s, 'label-place-village')).toBe('noto_sans_regular');
		expect(font(s, 'label-motorway-exit')).toBe('noto_sans_regular');
		expect(font(s, 'label-motorway-shield')).toBe('noto_sans_bold');
		expect(font(s, 'poi-amenity')).toBe('noto_sans_bold');
	});

	it('text.font sets every text layer', () => {
		const s = build({ text: { font: 'my_face' } });
		const faces = new Set(s.layers.map((l) => (layout(s, l.id)['text-font'] as string[] | undefined)?.[0]));
		faces.delete(undefined);
		expect([...faces]).toEqual(['my_face']);
	});

	it('a group sets its layers, a topic only its own, the nearest node wins', () => {
		const s = build({
			text: { water: { font: 'water_face' }, places: { font: 'place_face', cities: { font: 'city_face' } } },
		});
		expect(font(s, 'label-water-area-large')).toBe('water_face');
		expect(font(s, 'label-water-river')).toBe('water_face');
		expect(font(s, 'label-place-city')).toBe('city_face');
		expect(font(s, 'label-place-village')).toBe('place_face');
		expect(font(s, 'label-place-suburb')).toBe('place_face');
		expect(font(s, 'label-street-residential')).toBe('noto_sans_regular');
		expect(font(s, 'poi-amenity')).toBe('noto_sans_bold');
	});

	it('pois.transit sets the transit stop names', () => {
		const s = build({ text: { pois: { transit: { font: 'stop_face' } } } });
		expect(font(s, 'symbol-transit-bus')).toBe('stop_face');
		expect(font(s, 'poi-amenity')).toBe('noto_sans_bold');
	});

	it('hamlets are a topic of their own', () => {
		const s = build({ text: { places: { villages: { transform: 'lowercase' } } } });
		expect(layout(s, 'label-place-village')['text-transform']).toBe('lowercase');
		expect(layout(s, 'label-place-hamlet')['text-transform']).toBe('uppercase');
	});

	it('rejects a misspelled topic', () => {
		expect(() => build({ text: { water: { river: {} } } as never })).toThrow('unknown option');
	});

	// Every property of every topic changes exactly the layers `textGroups` lists for that topic.
	const CHANGED: { [K in keyof LabelStyle]-?: LabelStyle[K] } = {
		font: 'other_face',
		scale: 2,
		spacing: 2,
		maxWidth: 5,
		lineHeight: 2,
		letterSpacing: 0.2,
		transform: 'lowercase',
		haloWidth: 3,
		haloBlur: 3,
	};
	const base = build();
	const topicLayers = (topic: string): string[] =>
		topic.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], osm.textGroups) as string[];
	const changedLayers = (s: StyleSpecification) =>
		s.layers.filter((l, i) => JSON.stringify(l) !== JSON.stringify(base.layers[i])).map((l) => l.id);
	const topics = TEXT_TOPICS.flatMap((topic) =>
		Object.entries(CHANGED).map(([key, value]) => [topic, key, value] as [string, string, unknown])
	);

	it.each(topics)('text.%s.%s changes exactly the layers of its topic', (topic, key, value) => {
		const node = topic
			.split('.')
			.reduceRight<Record<string, unknown>>((inner, part) => ({ [part]: inner }), { [key]: value });
		const s = build({ text: node as OsmOptions['text'] });
		expect(changedLayers(s).sort()).toStrictEqual([...topicLayers(topic)].sort());
	});
});

// ── text.scale, text.spacing, icon ─────────────────────────────────────────────

describe('osm() knob: text.scale and icon.scale', () => {
	it('text.scale multiplies symbol text-size', () => {
		const base = layout(build(), 'label-place-village')['text-size'];
		const scaled = layout(build({ text: { scale: 2 } }), 'label-place-village')['text-size'];
		if (typeof base === 'number') expect(scaled).toBeCloseTo(base * 2);
		else expect(scaled).not.toStrictEqual(base);
	});

	it('icon.scale multiplies icon-size on icon layers, and leaves text-size alone', () => {
		const base = layout(build(), 'poi-amenity');
		const scaled = layout(build({ icon: { scale: 2 } }), 'poi-amenity');
		// icon-size is an ['interpolate', …, z, v, z, v] ramp; every value doubles.
		const values = (arr: unknown) => (arr as unknown[]).filter((_, i) => i >= 4 && i % 2 === 0) as number[];
		expect(values(scaled['icon-size'])).toStrictEqual(values(base['icon-size']).map((v) => v * 2));
		expect(scaled['text-size']).toStrictEqual(base['text-size']);
	});
});

describe('osm() knob: text.spacing and icon.spacing', () => {
	it('icon.spacing multiplies symbol-spacing on icon (marking) layers', () => {
		const base = layout(build(), 'marking-oneway')['symbol-spacing'] as number;
		const spaced = layout(build({ icon: { spacing: 2 } }), 'marking-oneway')['symbol-spacing'];
		expect(spaced).toBe(base * 2);
	});

	it('text.spacing sets symbol-spacing on line-placed label layers (from the 250px default)', () => {
		// street name labels are line-placed and carry no explicit symbol-spacing → default 250.
		const spaced = layout(build({ text: { spacing: 3 } }), 'label-street-residential');
		expect(spaced['symbol-spacing']).toBe(250 * 3);
	});

	it('text.spacing does not touch icon (marking) spacing', () => {
		const s = build({ text: { spacing: 3 } });
		expect(layout(s, 'marking-oneway')['symbol-spacing']).toBe(175); // unchanged default
	});

	it('default spacing leaves collision padding unset', () => {
		expect(layout(build(), 'label-place-city')).not.toHaveProperty('text-padding');
		expect(layout(build(), 'poi-amenity')).not.toHaveProperty('icon-padding');
	});

	it('text.spacing widens the collision padding of point labels (from the 2px default)', () => {
		const s = build({ text: { spacing: 2 } });
		expect(layout(s, 'label-place-city')['text-padding']).toBe(16);
		expect(layout(s, 'label-place-city')).not.toHaveProperty('symbol-spacing');
	});

	it('a point layer with text and icon takes the text spacing for its text, the icon spacing for its icon', () => {
		const s = build({ text: { spacing: 2 }, icon: { spacing: 3 } });
		expect(layout(s, 'poi-amenity')['text-padding']).toBe(16);
		expect(layout(s, 'poi-amenity')['icon-padding']).toBe(30);
	});

	it('spacing below 1 shrinks point padding, clamped at 0', () => {
		expect(layout(build({ text: { spacing: 0.5 } }), 'label-place-city')['text-padding']).toBe(0);
		// label-boundary-country-large sets text-padding: 0 itself
		expect(layout(build({ text: { spacing: 2 } }), 'label-boundary-country-large')['text-padding']).toBe(14);
	});
});

// ── text.pitchAlignment ────────────────────────────────────────────────────────

describe('osm() knob: text.pitchAlignment', () => {
	it("'map' (the default) leaves line labels to MapLibre, which lays them on the map", () => {
		const s = build({ text: { pitchAlignment: 'map' } });
		expect(s).toStrictEqual(build());
		expect(layout(s, 'label-street-residential')).not.toHaveProperty('text-pitch-alignment');
	});

	it("'viewport' stands line labels up, and leaves point labels and line icons alone", () => {
		const s = build({ text: { pitchAlignment: 'viewport' } });
		expect(layout(s, 'label-street-residential')['text-pitch-alignment']).toBe('viewport');
		expect(layout(s, 'label-water-river')['text-pitch-alignment']).toBe('viewport');
		expect(layout(s, 'label-place-city')).not.toHaveProperty('text-pitch-alignment');
		expect(layout(s, 'marking-oneway')).not.toHaveProperty('text-pitch-alignment');
	});

	it('rejects an unknown value, and a pitch alignment below the root', () => {
		expect(() => build({ text: { pitchAlignment: 'auto' as never } })).toThrow(
			'osm.text.pitchAlignment: unknown value "auto". Valid values: map, viewport.'
		);
		expect(() => build({ text: { streets: { pitchAlignment: 'viewport' } } as never })).toThrow(
			'unknown option "text.streets.pitchAlignment"'
		);
	});
});

// ── features.terrain ─────────────────────────────────────────────────────────────

describe('osm() knob: features.terrain', () => {
	it('terrain:true enables 3D terrain with a raster-dem elevation source', () => {
		const s = build({ features: { terrain: true } });
		expect(s.terrain).toEqual({ source: 'elevation', exaggeration: 1 });
		expect(s.sources).toHaveProperty('elevation');
	});

	it('terrain exaggeration flows into style.terrain', () => {
		const s = build({ features: { terrain: { exaggeration: 2.5 } } });
		expect(s.terrain?.exaggeration).toBe(2.5);
	});

	it('no terrain by default', () => {
		expect(build().terrain).toBeUndefined();
	});
});

// ── features.hillshade (+ sun) ───────────────────────────────────────────────────

describe('osm() knob: features.hillshade', () => {
	it('hillshade:true adds a hillshade layer + elevation source', () => {
		const s = build({ features: { hillshade: true } });
		expect(ids(s)).toContain('hillshade');
		expect(s.sources).toHaveProperty('elevation');
	});

	it('hillshade exaggeration / anchor flow into the layer paint', () => {
		const s = build({ features: { hillshade: { exaggeration: 0.42, anchor: 'viewport' } } });
		const p = paint(s, 'hillshade');
		expect(p['hillshade-exaggeration']).toBe(0.42);
		expect(p['hillshade-illumination-anchor']).toBe('viewport');
	});

	it('hillshade custom colors change the emitted paint colors', () => {
		const def = paint(build({ features: { hillshade: true } }), 'hillshade');
		const custom = paint(
			build({
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
	it('sun direction / altitude drive the hillshade illumination', () => {
		const s = build({ features: { hillshade: true }, sun: { direction: 123, altitude: 27 } });
		const p = paint(s, 'hillshade');
		expect(p['hillshade-illumination-direction']).toBe(123);
		expect(p['hillshade-illumination-altitude']).toBe(27);
	});

	it('sun configures style.light for hillshade (position, color, intensity)', () => {
		const s = build({
			features: { hillshade: true },
			sun: { direction: 100, altitude: 30, color: '#ff0000', intensity: 0.9 },
		});
		expect(s.light).toEqual({ anchor: 'viewport', position: [1.15, 100, 60], color: 'rgb(255,0,0)', intensity: 0.9 });
	});

	it('extruded buildings sync style.light even without hillshade', () => {
		const s = build({ features: { buildings: 'extruded', hillshade: false }, sun: { direction: 200 } });
		expect((s.light?.position as number[])?.[1]).toBe(200);
	});

	it('no style.light without hillshade or extruded buildings', () => {
		expect(build({ features: { hillshade: false } }).light).toBeUndefined();
	});
});

// ── features.buildings ───────────────────────────────────────────────────────────

describe('osm() knob: features.buildings', () => {
	it('flat (default) renders footprint fills, not extrusions', () => {
		const s = build({ features: { buildings: 'flat' } });
		expect(layer(s, 'building')).toBeDefined();
		expect(layer(s, 'building-3d')).toBeUndefined();
	});

	it('extruded swaps footprints for a 3D building layer on top', () => {
		const s = build({ features: { buildings: 'extruded' } });
		expect(layer(s, 'building')).toBeUndefined();
		expect(layer(s, 'building-3d')).toBeDefined();
		expect(ids(s)[ids(s).length - 1]).toBe('building-3d');
	});
});

// ── features.landcover ───────────────────────────────────────────────────────────

describe('osm() knob: features.landcover', () => {
	it('landcover removes the low-zoom fade on landcover-backed fills', () => {
		const off = paint(build(), 'land-forest')['fill-opacity'];
		const on = paint(build({ features: { landcover: true } }), 'land-forest')['fill-opacity'];
		// default is a zoom ramp; landcover pins the fully-faded-in constant.
		expect(Array.isArray(off)).toBe(true);
		expect(on).toBe(1);
	});

	it('landcover is off by default', () => {
		expect(Array.isArray(paint(build(), 'land-forest')['fill-opacity'])).toBe(true);
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

	it.each(RECOLORS)('recolor.%s changes output colors', (_name, recolor) => {
		const base = bgColor(build());
		expect(bgColor(build({ recolor }))).not.toBe(base);
	});

	it('the default (identity) recolor leaves palette colors unchanged', () => {
		expect(bgColor(build({ recolor: {} }))).toBe(bgColor(build()));
	});
});

// ── urls ─────────────────────────────────────────────────────────────────────────

describe('osm() knob: urls', () => {
	it('base rewrites the osm source, glyphs and sprite hosts', () => {
		const s = build({ urls: { base: 'https://my.cdn.example' } });
		const src = s.sources['versatiles-shortbread'] as { url: string };
		expect(src.url).toContain('my.cdn.example');
		expect(String(s.glyphs)).toContain('my.cdn.example');
	});

	it('explicit osm URL is used verbatim', () => {
		const s = build({ urls: { osm: 'https://custom.tiles/tiles.json' } });
		const src = s.sources['versatiles-shortbread'] as { url: string };
		expect(src.url).toBe('https://custom.tiles/tiles.json');
	});

	it('explicit glyphsPattern is used verbatim', () => {
		const s = build({ urls: { glyphsPattern: 'https://g.example/{fontstack}/{range}.pbf' } });
		expect(s.glyphs).toBe('https://g.example/{fontstack}/{range}.pbf');
	});

	it('custom elevation URL is referenced, and inlineSources embeds it', async () => {
		const fetchFn = tileJSONFetch({ 'https://dem/': { tiles: ['https://dem/{z}/{x}/{y}'], minzoom: 0, maxzoom: 12 } });
		const s = build({
			features: { terrain: true },
			urls: { elevation: 'https://dem/tiles.json' },
		});
		// Building performs no I/O: the source carries a reference.
		expect(s.sources['elevation'] as { url: string }).toMatchObject({ url: 'https://dem/tiles.json' });
		expect(fetchFn).not.toHaveBeenCalled();

		// inlineSources resolves it into a self-contained source.
		const inlined = await inlineSources(s, { fetch: fetchFn });
		const src = inlined.sources['elevation'] as { tiles: string[]; maxzoom: number };
		expect(src.tiles[0]).toBe('https://dem/{z}/{x}/{y}');
		expect(src.maxzoom).toBe(12);
		expect(src).not.toHaveProperty('url');
		expect(fetchFn).toHaveBeenCalled();
	});

	it('sprite as a string is passed through unchanged', () => {
		const s = build({ urls: { sprite: 'https://cdn.example/sprites/base' } });
		expect(s.sprite).toBe('https://cdn.example/sprites/base');
	});

	it('sprite as an array resolves relative URLs against base', () => {
		const s = build({ urls: { base: 'https://b.example', sprite: [{ id: 'a', url: '/s/a' }] } });
		expect(s.sprite).toStrictEqual([{ id: 'a', url: 'https://b.example/s/a' }]);
	});

	it('building performs no I/O, so a custom fetch belongs to inlineSources, not to urls', async () => {
		const fetchFn = tileJSONFetch();
		expect(() => build({ urls: { fetch: fetchFn } } as never)).toThrow('osm: unknown option "urls.fetch"');

		const s = build();
		expect(fetchFn).not.toHaveBeenCalled();
		await inlineSources(s, { fetch: fetchFn });
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
		[{ roads: { motorways: false } }, 'street-motorway', 'street-minor'],
		[{ roads: { streets: { residential: false } } }, 'street-minor', 'street-motorway'],
		[{ roads: { paths: false } }, 'way-path', 'way-footway'],
		[{ roads: { footway: false } }, 'way-footway', 'way-path'],
		[{ roads: { steps: false } }, 'way-steps', 'way-path'],
		[{ transit: { rail: false } }, 'transport-rail', 'aerialway'],
		[{ transit: { aerialways: false } }, 'aerialway', 'transport-rail'],
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
		[{ labels: { places: { cities: false } } }, 'label-place-town', 'label-place-village'],
		[{ labels: { places: { villages: false } } }, 'label-place-village', 'label-place-hamlet'],
		[{ labels: { places: { hamlets: false } } }, 'label-place-hamlet', 'label-place-village'],
		[{ labels: { places: { districts: false } } }, 'label-place-suburb', 'label-place-city'],
		[{ labels: { streets: false } }, 'label-street-residential', 'label-place-village'],
		[{ labels: { streets: { names: false } } }, 'label-street-residential', 'label-motorway-shield'],
		[{ labels: { streets: { refs: false } } }, 'label-motorway-shield', 'label-motorway-exit'],
		[{ labels: { streets: { exits: false } } }, 'label-motorway-exit', 'label-motorway-shield'],
		[{ labels: { boundaries: false } }, 'label-boundary-state', 'label-place-village'],
		[{ labels: { boundaries: { states: false } } }, 'label-boundary-state', 'label-boundary-country-small'],
		[{ labels: { boundaries: { countries: false } } }, 'label-boundary-country-small', 'label-boundary-state'],
		[{ labels: { water: { lakes: false } } }, 'label-water-area-large', 'label-water-river'],
		[{ labels: { water: { rivers: false } } }, 'label-water-stream', 'label-water-area-large'],
		[{ labels: { addresses: false } }, 'label-address-housenumber', 'label-place-village'],
	];

	it.each(CASES)('%o hides %s but keeps %s', (layers, hidden, kept) => {
		const s = build({ layers });
		expect(layer(s, hidden), `${hidden} should be hidden`).toBeUndefined();
		expect(layer(s, kept), `${kept} should remain`).toBeDefined();
	});

	it('icons alias hides every icon group (pois, markings, transit stops) at once', () => {
		const s = build({ layers: { icons: false } });
		expect(layer(s, 'poi-amenity')).toBeUndefined();
		expect(layer(s, 'marking-oneway')).toBeUndefined();
		expect(layer(s, 'symbol-transit-bus')).toBeUndefined();
		expect(layer(s, 'label-place-village')).toBeDefined(); // non-icon labels stay
	});

	it('a specific group overrides the icons alias', () => {
		const s = build({ layers: { icons: false, pois: true } });
		expect(layer(s, 'poi-amenity')).toBeDefined();
		expect(layer(s, 'marking-oneway')).toBeUndefined();
	});

	it('a fractional group opacity is baked into the layer, scaling its fade target', () => {
		const s = build({ layers: { land: { forest: 0.5 } } });
		// land-forest fades 0→1 over z7→8; dimming by 0.5 scales the target to 0.5.
		expect(paint(s, 'land-forest')['fill-opacity']).toStrictEqual(['interpolate', ['linear'], ['zoom'], 7, 0, 8, 0.5]);
	});

	it('buildings opacity merges with the existing z14→15 fade', () => {
		const s = build({ layers: { buildings: 0.5 } });
		expect(paint(s, 'building')['fill-opacity']).toStrictEqual(['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.5]);
	});
});

// ── static helpers on the osm() function object ──────────────────────────────────

describe('osm() static properties', () => {
	it('osm.palettes lists all ten themes', () => {
		expect(osm.palettes).toEqual([
			'colorful',
			'colorful-dark',
			'natural',
			'natural-dark',
			'muted',
			'muted-dark',
			'gray',
			'gray-dark',
			'toner',
			'toner-dark',
		]);
	});

	it('osm.colorKeys has 45 unique keys', () => {
		expect(osm.colorKeys).toHaveLength(45);
		expect(new Set(osm.colorKeys).size).toBe(45);
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
		expect(d.theme).toBe('colorful');
		expect(d.features.terrain).toBe(false);
		expect(d.layers.buildings).toBe(true);
	});

	it('osm.colors returns a palette color set', () => {
		expect(typeof osm.colors('toner').background).toBe('string');
	});

	it('osm.resolveOptions resolves raw options', () => {
		expect(osm.resolveOptions({ theme: 'gray' }).theme).toBe('gray');
	});

	it('osm.languages extracts name_* language codes from a TileJSON', () => {
		const langs = osm.languages({
			tiles: ['https://t/{z}/{x}/{y}'],
			vector_layers: [{ id: 'p', fields: { name: 'String', name_de: 'String', name_en: 'String' } }],
		} as never);
		expect(langs).toEqual(['de', 'en']);
	});
});

// ── sky ────────────────────────────────────────────────────────────────────────

describe('osm() knob: sky', () => {
	it('emits a style.sky populated from the resolved defaults', () => {
		// The sky colour comes from the palette; every other value is palette-independent.
		const colors = osm.colors('colorful');
		expect(build().sky).toStrictEqual({
			'sky-color': Color.parse(colors.water).asString(),
			'horizon-color': 'rgb(255,255,255)',
			'fog-color': 'rgb(255,255,255)',
			'sky-horizon-blend': 0.8,
			'horizon-fog-blend': 0.8,
			'fog-ground-blend': 0.5,
			'atmosphere-blend': 0,
		});
	});

	it('resolves every sky default but the palette-derived sky colour', () => {
		expect(osm.resolveOptions().sky).toStrictEqual({
			fogColor: '#ffffff',
			horizonColor: '#ffffff',
			atmosphereBlend: 0,
			fogGroundBlend: 0.5,
			horizonFogBlend: 0.8,
			skyHorizonBlend: 0.8,
		});
		expect(osm.minimizeOptions(osm.resolveOptions({ sky: { fogGroundBlend: 0.2 } }))).toEqual({
			sky: { fogGroundBlend: 0.2 },
		});
	});

	it('maps every sky option onto its style-spec property', () => {
		const s = build({
			sky: {
				skyColor: '#010203',
				horizonColor: '#0a0b0c',
				fogColor: '#0d0e0f',
				skyHorizonBlend: 0.1,
				horizonFogBlend: 0.2,
				fogGroundBlend: 0.3,
				atmosphereBlend: 0.7,
			},
		});
		expect(s.sky).toStrictEqual({
			'sky-color': 'rgb(1,2,3)',
			'horizon-color': 'rgb(10,11,12)',
			'fog-color': 'rgb(13,14,15)',
			'sky-horizon-blend': 0.1,
			'horizon-fog-blend': 0.2,
			'fog-ground-blend': 0.3,
			'atmosphere-blend': 0.7,
		});
	});
});

// The v5→v6 migration table in API_DESIGN.md pointed the language rows at `labels`, which is the
// *visibility* group — `osm({ labels: { language: 'de' } })` silently did nothing. Guard the
// option the table now documents (F3).
describe('osm() knob: text.language (migration table)', () => {
	const labelField = (s: ReturnType<typeof build>) =>
		(s.layers.find((l) => l.id === 'label-place-city') as { layout?: Record<string, unknown> } | undefined)?.layout?.[
			'text-field'
		];

	it("'local' uses the native name", () => {
		expect(labelField(build({ text: { language: 'local' } }))).toStrictEqual(['get', 'name']);
	});

	it('a language code falls back to the native name', () => {
		expect(labelField(build({ text: { language: 'de' } }))).toStrictEqual([
			'coalesce',
			['get', 'name_de'],
			['get', 'name'],
		]);
	});

	it('languageStrict drops the fallback', () => {
		expect(labelField(build({ text: { language: 'de', languageStrict: true } }))).toStrictEqual(['get', 'name_de']);
	});
});

// `sky` takes the same `boolean | object` shape as features.terrain / features.hillshade.
// MapLibre only draws the sky when pitched or in globe projection, so a flat map should be able
// to drop the block entirely (issue #126).
describe('osm() knob: sky accepts a boolean', () => {
	it('is on by default', () => {
		expect(build().sky).toBeDefined();
	});

	it('true is identical to the default', () => {
		expect(JSON.stringify(build({ sky: true }))).toBe(JSON.stringify(build()));
	});

	it('false omits the sky block entirely', () => {
		const style = build({ sky: false });
		expect(style.sky).toBeUndefined();
		expect(Object.keys(style)).not.toContain('sky');
	});

	it('an object still overrides individual values', () => {
		expect(build({ sky: { skyColor: '#123456' } }).sky).toMatchObject({ 'sky-color': 'rgb(18,52,86)' });
	});

	it('resolves to false, which stays off when resolved options are fed back in', () => {
		const resolved = osm.resolveOptions({ sky: false });
		expect(resolved.sky).toBe(false);
		expect(osm.resolveOptions().sky).not.toBe(false);
		expect(osm(resolved)).not.toHaveProperty('sky');
		expect(osm.minimizeOptions(resolved)).toEqual({ sky: false });
	});
});

// Every theme used to get the same `#87CEEB`, which put a bright blue sky above a dark map in dark
// mode and above a monochrome one in `toner` (issue #126). The defaults are now derived from the
// palette: the sky colour from its `water`.
describe('osm() sky defaults follow the palette', () => {
	const sky = (theme: unknown) => build({ theme } as never).sky as Record<string, string>;

	it('takes the palette water colour for the sky and background for the horizon', () => {
		for (const palette of osm.palettes) {
			const colors = osm.colors(palette);
			const s = sky(palette);
			// compared as colours, not as strings: every colour in a style is written as sRGB now,
			// while the palette keeps its hex
			expect(Color.parse(s['sky-color']).asHex(), palette).toBe(Color.parse(colors.water).asHex());
		}
	});

	it('gives every palette a distinct sky', () => {
		const skies = osm.palettes.map((p) => sky(p)['sky-color']);
		expect(new Set(skies).size).toBe(skies.length);
	});

	it('darkens the sky in a dark theme', () => {
		const light = Color.parse(sky('colorful')['sky-color']).hsl;
		const dark = Color.parse(sky('colorful-dark')['sky-color']).hsl;
		expect(dark.l).toBeLessThan(light.l);
	});

	it('an explicit sky colour still wins', () => {
		expect((build({ sky: { skyColor: '#123456' } }).sky as Record<string, string>)['sky-color']).toBe('rgb(18,52,86)');
	});
});

// Web Mercator's area distortion is worst at exactly the low zooms where the whole world is
// visible; globe is correct there and MapLibre returns to Mercator as you zoom in (issue #129).
describe('osm() knob: projection', () => {
	it('defaults to globe', () => {
		expect((build() as { projection?: unknown }).projection).toStrictEqual({ type: 'globe' });
	});

	it('can be set back to mercator', () => {
		expect((build({ projection: 'mercator' }) as { projection?: unknown }).projection).toStrictEqual({
			type: 'mercator',
		});
	});

	it('resolves so callers can read it back', () => {
		expect(osm.resolveOptions().projection).toBe('globe');
		expect(osm.resolveOptions({ projection: 'vertical-perspective' }).projection).toBe('vertical-perspective');
	});
});

// Resolved options used to carry the sky already derived from the palette, so feeding them back in
// pinned it: edit `colors.water` on top of `osm.resolveOptions()` and the sky stayed put. They now
// leave the two colours unset and `osm()` derives them when it builds.
describe('osm() resolved options round-trip without pinning the sky', () => {
	it('leaves the palette-derived sky colour out of resolved options', () => {
		const sky = osm.resolveOptions().sky;
		expect(sky).not.toBe(false);
		expect(sky).not.toHaveProperty('skyColor');
	});

	it('lets the sky follow a colour edit made on top of resolved defaults', () => {
		const resolved = osm.resolveOptions({ theme: 'muted' });
		const style = osm({ ...resolved, colors: { ...resolved.colors, water: '#123456' } });
		expect(style.sky).toMatchObject({ 'sky-color': 'rgb(18,52,86)' });
	});

	it('rebuilds the identical style from resolved defaults', () => {
		for (const theme of ['colorful', 'gray-dark'] as const)
			expect(JSON.stringify(osm(osm.resolveOptions({ theme })))).toBe(JSON.stringify(osm({ theme })));
	});
});

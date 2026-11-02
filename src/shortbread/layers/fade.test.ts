import { beforeAll, describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../api/index.js';
import { omt } from '../../omt/index.js';
import { protomaps } from '../../protomaps/index.js';
import { hardBounds } from '../../../scripts/zoom-compare/measure.js';

// ── The zoom-behaviour rule ────────────────────────────────────────────────────────
//
// Every zoom-dependent property of a layer is **declared once and derived everywhere else**.
// Both zoom bugs this suite exists to catch came from breaking that:
//
//   • #124 — the Shortbread appearance zooms lived in three hand-maintained copies (`appear:`,
//     `LAND_FILLS`, `LANDCOVER_DEFADE`); they drifted, and `land-sand`/`land-rock` ended up
//     the wrong way round. Now one table, everything derived from it.
//   • `minzoom` — written by hand next to a transition declared elsewhere, so the two drifted and a
//     layer ended up gated a zoom level away from the fade it was meant to match: either hidden
//     while its own ramp said it was drawing, or processed while it was still invisible. Now
//     derived from the transition.
//
// The invariants below are the machine-checkable form of that rule.
//
// **The one deliberate exception is this file.** The schema zooms in the tables here are typed out
// by hand on purpose, so the test can *disagree* with the implementation — deriving them from the
// source would make every assertion tautological. Do not "deduplicate" them.
//
// Specification under test (independent of the implementation):
//
// Every element fades in by OPACITY over the zoom `z0` at which it appears in Shortbread tiles
// (https://shortbread-tiles.org/schema/1.0/):
//   • invisible        — opacity 0          at z0
//   • half transparent — opacity target/2   at z0 + 0.5
//   • fully shown       — opacity target     at z0 + 1
// `z0` is taken from the schema below — NOT read back from the style — so a fade wired to the wrong
// zoom fails here. `target` is the element's own resolved opacity (1 for roads/buildings, but e.g.
// 0.1 for forest, 0.3 for danger areas), read from the layer.
//
// `features.landcover` adds fills of its own under these, reading another layer, and changes none of
// them (src/features/landcover.test.ts).

let style: StyleSpecification; // default colorful
let landcoverStyle: StyleSpecification; // colorful + features.landcover

beforeAll(() => {
	[style, landcoverStyle] = [osm(), osm({ features: { landcover: true } })];
});

const OPACITY_PROPS: Record<string, string[]> = {
	fill: ['fill-opacity'],
	line: ['line-opacity'],
	symbol: ['text-opacity', 'icon-opacity'],
	'fill-extrusion': ['fill-extrusion-opacity'],
};

// Evaluate a linear `[z0, v0, z1, v1, …]` stop list at a zoom, clamped at the ends.
function evalLinearStops(stops: number[], zoom: number): number {
	const n = stops.length;
	if (zoom <= stops[0]) return stops[1];
	if (zoom >= stops[n - 2]) return stops[n - 1];
	for (let i = 0; i < n - 2; i += 2) {
		if (zoom >= stops[i] && zoom <= stops[i + 2]) {
			const t = (zoom - stops[i]) / (stops[i + 2] - stops[i]);
			return stops[i + 1] + (stops[i + 3] - stops[i + 1]) * t;
		}
	}
	return stops[n - 1];
}

function paintOf(s: StyleSpecification, layerId: string): Record<string, unknown> | null {
	const layer = s.layers.find((l) => l.id === layerId);
	if (!layer) return null;
	return (layer as { paint?: Record<string, unknown> }).paint ?? {};
}

// The opacity fade-in (a linear interpolate ramping from 0) on a layer, or null if it has none.
function opacityFade(s: StyleSpecification, layerId: string): { prop: string; stops: number[] } | null {
	const layer = s.layers.find((l) => l.id === layerId);
	if (!layer) return null;
	const paint = (layer as { paint?: Record<string, unknown> }).paint ?? {};
	for (const prop of OPACITY_PROPS[layer.type] ?? []) {
		const value = paint[prop];
		if (!Array.isArray(value) || value[0] !== 'interpolate' || (value[1] as unknown[])[0] !== 'linear') continue;
		const stops = value.slice(3) as number[];
		if (stops[1] === 0) return { prop, stops };
	}
	return null;
}

// Assert a layer fades 0 → its own target over exactly z0 → z0+1.
function expectFadeInAt(s: StyleSpecification, layerId: string, z0: number): void {
	const fade = opacityFade(s, layerId);
	expect(fade, `${layerId} must fade in by opacity`).not.toBeNull();
	const stops = fade!.stops;
	const target = Math.max(...stops.filter((_, i) => i % 2 === 1));
	const at = (zoom: number): number => evalLinearStops(stops, zoom);
	expect(at(z0), `${layerId} must be invisible at z${z0}`).toBe(0);
	expect(at(z0 + 0.5), `${layerId} must be at half its target at z${z0 + 0.5}`).toBeCloseTo(target / 2, 3);
	expect(at(z0 + 1), `${layerId} must reach its target at z${z0 + 1}`).toBeCloseTo(target, 3);
}

// ── Roads ───────────────────────────────────────────────────────────────────────
// Shortbread `streets` schema minzoom per kind. `outline` marks the road types drawn with a casing
// (`:outline`). Path-class ways (footway/steps/path/cycleway) also grow from 0 width as they fade in, so
// they're verified separately below rather than here.
const ROAD_TYPES: { id: string; z: number; outline: boolean }[] = [
	{ id: 'street-motorway', z: 5, outline: true },
	{ id: 'street-trunk', z: 6, outline: true },
	{ id: 'street-primary', z: 8, outline: true },
	{ id: 'street-secondary', z: 9, outline: true },
	{ id: 'street-tertiary', z: 10, outline: true },
	// residential + unclassified draw from one class layer, as do busway + bus_guideway
	// (see STREET_CLASSES in layers/roads.ts).
	{ id: 'street-minor', z: 12, outline: true },
	{ id: 'street-bus', z: 12, outline: true },
	{ id: 'street-livingstreet', z: 13, outline: true },
	{ id: 'street-pedestrian', z: 13, outline: true },
	{ id: 'street-service', z: 13, outline: true },
	{ id: 'street-track', z: 13, outline: true },
];

describe('roads fade in at their Shortbread streets minzoom', () => {
	for (const { id, z, outline } of ROAD_TYPES) {
		for (const layerId of outline ? [id, `${id}:outline`] : [id]) {
			it(`${layerId} over z${z}–${z + 1}`, () => expectFadeInAt(style, layerId, z));
		}
	}
});

// Path-class ways grow from 0 width at z13 and fade in over the same zoom: width alone pops in, because a line
// draws at nearly full strength at any width above 0. They are a single dashed line: no casing layer is emitted.
describe('path-class ways appear by growing from 0 width and fading in at z13', () => {
	for (const layerId of ['way-footway', 'way-steps', 'way-path', 'way-cycleway']) {
		it(`${layerId} fades in and starts at 0 width at z13`, () => {
			expectFadeInAt(style, layerId, 13);
			const width = paintOf(style, layerId)?.['line-width'];
			expect(Array.isArray(width), `${layerId} must have a zoom width ramp`).toBe(true);
			const stops = (width as unknown[]).slice(3) as number[]; // z0, w0, …
			expect(stops[0], `${layerId} width ramp must start at z13`).toBe(13);
			expect(stops[1], `${layerId} must start at 0 width`).toBe(0);
		});

		it(`${layerId} is dashed, with butt caps so the dash renders, and has no casing`, () => {
			const layer = style.layers.find((l) => l.id === layerId) as { paint?: object; layout?: object } | undefined;
			expect((layer?.paint as Record<string, unknown>)['line-dasharray']).toBeDefined();
			expect((layer?.layout as Record<string, unknown>)?.['line-cap'] ?? 'butt').toBe('butt');
			expect(style.layers.some((l) => l.id === `${layerId}:outline`)).toBe(false);
		});
	}
});

// ── Boundaries ──────────────────────────────────────────────────────────────────
// admin-level 4 (states) appears at z7. Maritime borders are admin-2 (data from z0) but, like OSM
// Bright, colorful only draws them from z4 — so that's where they fade. (Country/disputed admin-2
// borders exist from z0 and are always drawn, so they don't fade.)
const BOUNDARIES: { id: string; z: number }[] = [
	{ id: 'boundary-state', z: 7 },
	{ id: 'boundary-country-maritime', z: 4 },
];

describe('boundaries fade in at their appearance zoom', () => {
	for (const { id, z } of BOUNDARIES) {
		it(`${id} over z${z}–${z + 1}`, () => expectFadeInAt(style, id, z));
	}
});

// ── Rail tracks ─────────────────────────────────────────────────────────────────
// Rail is drawn as a solid casing (`:outline`) with a dashed "tie" line (the fill) on top, and the
// two join the map at different zooms: the casing is a hairline long before the ties are wide
// enough to read as ties. Which mechanism does the appearing follows from the width curve — a
// casing that is already 1 px wide at low zoom can only appear by opacity, while a line whose width
// grows from 0 appears by that growth (the group below).
//
// No rail is drawn before z10. Service tracks enter the tiles there, and `service` with them (the
// `early_attributes` experiment), so z10 is the first zoom where a yard can be told from a main line,
// and the main line's casing joins the map there. Everything else joins later.
const RAIL_FADES: { id: string; z: number }[] = [
	{ id: 'transport-rail:outline', z: 10 },
	{ id: 'transport-rail', z: 14 },
	{ id: 'transport-subway:outline', z: 11 },
	{ id: 'transport-subway', z: 14 },
	// Width alone doesn't make these appear smoothly: a yard would pop in at the first width above 0.
	{ id: 'transport-rail-service:outline', z: 12 },
	{ id: 'transport-rail-service', z: 15 },
];

describe('rail tracks fade in at the zoom their kind joins the map', () => {
	for (const { id, z } of RAIL_FADES) {
		it(`${id} over z${z}–${z + 1}`, () => expectFadeInAt(style, id, z));
	}

	it('no rail layer is drawn before z10, where `service` first distinguishes yards', () => {
		const early = style.layers
			.filter((l) => /^(tunnel-|bridge-)?transport-/.test(l.id) && !l.id.startsWith('transport-ferry'))
			.filter((l) => ((l as { minzoom?: number }).minzoom ?? 0) < 10)
			.map((l) => `${l.id}: minzoom ${(l as { minzoom?: number }).minzoom ?? 0}`);
		expect(early).toEqual([]);
	});

	it('only the main-line casing joins at z10', () => {
		const atTen = style.layers
			.filter((l) => /^(tunnel-|bridge-)?transport-/.test(l.id) && !l.id.startsWith('transport-ferry'))
			.filter((l) => (l as { minzoom?: number }).minzoom === 10)
			.map((l) => l.id)
			.sort();
		expect(atTen).toEqual(['bridge-transport-rail:outline', 'transport-rail:outline', 'tunnel-transport-rail:outline']);
	});

	// Measured in tiles: `class: rail` has no `service` at z7–12, and Protomaps' rail only starts at z11.
	it.each([
		['omt', () => omt()],
		['protomaps', () => protomaps({ urls: { protomaps: 'https://example.org/tiles.json' } })],
	] as [string, () => StyleSpecification][])('%s keeps rail at z11', (_, build) => {
		expectFadeInAt(build(), 'transport-rail:outline', 11);
	});

	// Measured too: OpenMapTiles marks service tracks only from z14, Protomaps has most of them only from z13. A
	// casing that had already grown by then would pop in, or show a yard in fragments.
	it.each([
		['omt', () => omt()],
		['protomaps', () => protomaps({ urls: { protomaps: 'https://example.org/tiles.json' } })],
	] as [string, () => StyleSpecification][])('%s keeps service tracks at z14', (_, build) => {
		const width = paintOf(build(), 'transport-rail-service:outline')?.['line-width'] as unknown[];
		expect(width.slice(3, 7)).toEqual([14, 0, 15, 1]);
	});

	it('Shortbread grows them as hairlines from z12, so a yard does not close up', () => {
		const width = paintOf(style, 'transport-rail-service:outline')?.['line-width'] as unknown[];
		expect(width.slice(3, 11)).toEqual([12, 0, 13, 0.2, 14, 0.4, 15, 1]);
	});
});

// The tram family grows from 0 width too, and fades in over the same zoom, as any line must.
const RAIL_WIDTH_GROWN: { id: string; z: number }[] = [
	// tram, narrowgauge, funicular and monorail share one style and are emitted as a single
	// layer (see `transport-minorrail` in layers/roads.ts).
	{ id: 'transport-minorrail', z: 13 },
	{ id: 'transport-minorrail:outline', z: 15 },
];

describe('tram-family tracks appear by growing from 0 width and fading in', () => {
	for (const { id, z } of RAIL_WIDTH_GROWN) {
		it(`${id} grows from 0 width and fades in at z${z}`, () => {
			expectFadeInAt(style, id, z);
			const width = paintOf(style, id)?.['line-width'];
			expect(Array.isArray(width), `${id} must have a zoom width ramp`).toBe(true);
			const stops = (width as unknown[]).slice(3) as number[]; // z0, w0, …
			expect(stops[0], `${id} width ramp must start at z${z}`).toBe(z);
			expect(stops[1], `${id} must start at 0 width`).toBe(0);
		});
	}
});

// ── Land cover & landuse fills ────────────────────────────────────────────────────
// Shortbread `land` schema minzoom per kind.
const LAND_FILLS: { id: string; z: number }[] = [
	{ id: 'land-forest', z: 7 },
	{ id: 'land-commercial', z: 10 },
	{ id: 'land-industrial', z: 10 },
	{ id: 'land-residential', z: 10 },
	{ id: 'land-agriculture', z: 10 },
	{ id: 'land-waste', z: 10 },
	{ id: 'land-sand', z: 10 },
	{ id: 'land-park', z: 11 },
	{ id: 'land-garden', z: 11 },
	{ id: 'land-leisure', z: 11 },
	{ id: 'land-rock', z: 11 },
	{ id: 'land-grass', z: 11 },
	{ id: 'land-vegetation', z: 11 },
	{ id: 'land-wetland', z: 11 },
	{ id: 'land-burial', z: 13 },
];

describe('land fills fade in at their Shortbread land minzoom', () => {
	for (const { id, z } of LAND_FILLS) {
		it(`${id} over z${z}–${z + 1}`, () => expectFadeInAt(style, id, z));
	}
});

// ── water_polygons fills ──────────────────────────────────────────────────────────
// Shortbread serves `water_polygons` from z4 (https://shortbread-tiles.org/schema/1.0/#layer-water_polygons).
// `land-glacier` belongs here despite its `land-` id: it reads `water_polygons`, not `land`.
// Painting these from z0 leaks what a tileset with the older, merged land cover carries — issue #124.
const WATER_POLYGON_FILLS: { id: string; z: number }[] = [
	{ id: 'water-area', z: 4 },
	{ id: 'water-area-river', z: 4 },
	{ id: 'water-area-small', z: 4 },
	{ id: 'land-glacier', z: 4 },
];

describe('water_polygons fills fade in at Shortbread z4', () => {
	for (const { id, z } of WATER_POLYGON_FILLS) {
		it(`${id} over z${z}–${z + 1}`, () => expectFadeInAt(style, id, z));
	}
});

// ── Completeness ──────────────────────────────────────────────────────────────────
// The tables above are hand-written from the Shortbread schema on purpose — reading the zooms back
// from the style would make the tests tautological. That leaves one gap: a NEW fill could be added
// and simply never appear in a table. This closes it.
describe('every land / water_polygons fill is covered by a table above', () => {
	it('no fill escapes the schema tables', () => {
		const tabled = new Set([...LAND_FILLS, ...WATER_POLYGON_FILLS].map((f) => f.id));
		const missing = style.layers
			.filter((l) => l.type === 'fill')
			.filter((l) => ['land', 'water_polygons'].includes((l as { 'source-layer'?: string })['source-layer'] ?? ''))
			.map((l) => l.id)
			.filter((id) => !tabled.has(id));
		expect(missing, `untabled fills — add them to LAND_FILLS or WATER_POLYGON_FILLS`).toEqual([]);
	});
});

// ── Buildings & sites (all at Shortbread z14) ─────────────────────────────────────
describe('buildings fade in at Shortbread z14', () => {
	for (const id of ['building', 'building:outline']) {
		it(`${id} over z14–15`, () => expectFadeInAt(style, id, 14));
	}
});

// A `building:part` lies inside its building: for extrusions only, or it doubles a translucent fill.
describe('building parts', () => {
	const NOT_A_PART = ['!=', ['get', 'part'], true];
	const filterOf = (s: StyleSpecification, id: string) =>
		(s.layers.find((l) => l.id === id) as { filter?: unknown })?.filter;

	it.each(['building', 'building:outline'])('%s leaves them out', (id) => {
		expect(filterOf(style, id)).toEqual(NOT_A_PART);
	});

	it('building-3d keeps them', () => {
		expect(filterOf(osm({ features: { buildings: 'extruded' } }), 'building-3d')).toEqual([
			'!=',
			['get', 'hide_3d'],
			true,
		]);
	});

	it.each([
		['omt', () => omt()],
		['protomaps', () => protomaps({ urls: { protomaps: 'https://example.org/tiles.json' } })],
	] as [string, () => StyleSpecification][])('%s has no such field to filter on', (_, build) => {
		expect(filterOf(build(), 'building')).toBeUndefined();
	});
});

// Layer IDs, not raw kinds: university/college/school share the `siteEducation` colour and are
// drawn by one layer, as are parking + bicycleparking (see SITES in layers/sites.ts).
const SITE_KINDS = ['dangerarea', 'sportscentre', 'education', 'hospital', 'prison', 'parking', 'construction'];

describe('sites fade in at Shortbread z14', () => {
	for (const kind of SITE_KINDS) {
		it(`site-${kind} over z14–15`, () => expectFadeInAt(style, `site-${kind}`, 14));
	}
});

// ── Ferries (Shortbread z10) ──────────────────────────────────────────────────────
describe('ferries fade in at Shortbread z10', () => {
	it('transport-ferry over z10–11', () => expectFadeInAt(style, 'transport-ferry', 10));
});

// ── Backstop: every remaining fade must still be a clean ramp ──────────────────────
// Whatever else fades (bicycle overlays, pedestrian zones, markings, links …) must also ramp
// linearly 0 → its target over exactly one zoom — invisible at z, half at z+0.5, target at z+1.
describe('every opacity fade-in ramps 0 → its target linearly over one zoom', () => {
	it('is invisible at z, half at z+0.5, and at its target by z+1', () => {
		const problems: string[] = [];
		let checked = 0;
		for (const layer of style.layers) {
			const paint = (layer as { paint?: Record<string, unknown> }).paint ?? {};
			for (const prop of OPACITY_PROPS[layer.type] ?? []) {
				const value = paint[prop];
				if (!Array.isArray(value) || value[0] !== 'interpolate') continue;
				const stops = value.slice(3) as number[]; // z0, v0, z1, v1, …
				if (stops[1] !== 0) continue; // doesn't start transparent ⇒ not a fade-in
				// POI name labels fade in deliberately fast around z19 (a UI fade, not a Shortbread
				// feature-appearance fade), so they're exempt from the one-zoom timing rule.
				if (layer.id.startsWith('poi-') && prop === 'text-opacity') continue;
				checked++;
				const where = `${layer.id}.${prop}`;
				if ((value[1] as unknown[])[0] !== 'linear') {
					problems.push(`${where}: fade must be linear`);
					continue;
				}
				const z = stops[0];
				const target = Math.max(...stops.filter((_, i) => i % 2 === 1));
				const at = (zoom: number): number => evalLinearStops(stops, zoom);
				if (at(z) !== 0) problems.push(`${where}: ${at(z)} ≠ 0 at z${z}`);
				if (Math.abs(at(z + 0.5) - target / 2) > 0.01)
					problems.push(`${where}: ${at(z + 0.5).toFixed(3)} ≠ ${target / 2} (half) at z${z + 0.5}`);
				if (Math.abs(at(z + 1) - target) > 0.001)
					problems.push(`${where}: ${at(z + 1).toFixed(3)} ≠ ${target} (target) at z${z + 1}`);
			}
		}
		expect(checked, 'expected to find many opacity fade-ins to verify').toBeGreaterThan(30);
		expect(problems, `\n${problems.join('\n')}\n`).toEqual([]);
	});
});

// ── minzoom is derived, not hand-written ──────────────────────────────────────────
// `minzoom` carries no cartographic meaning: what a layer looks like is its transition (an opacity
// ramp, or a width ramp growing from 0). `minzoom` only stops MapLibre processing a layer that
// draws nothing, so it is computed from the transition and clamped to the deepest real tile.
// Hand-written values drift: `transport-tram` was gated at z13 and its casing at z15 while both
// faded over z14 → 15, so rail rendered without a casing for a whole zoom level.
const SOURCE_MAXZOOM = 14; // VersaTiles tiles are generated for z0–14; above that is overzoomed.

describe('minzoom matches where each layer starts appearing', () => {
	const rampStart = (value: unknown): number | undefined => {
		if (!Array.isArray(value) || value[0] !== 'interpolate') return undefined;
		const stops = value.slice(3) as number[];
		return stops[1] === 0 ? stops[0] : undefined;
	};

	/** The zoom a layer first draws something: the latest of its from-zero ramps. */
	const appearZoom = (layer: StyleSpecification['layers'][number]): number | undefined => {
		const paint = (layer as { paint?: Record<string, unknown> }).paint ?? {};
		const starts = [...(OPACITY_PROPS[layer.type] ?? []), 'line-width']
			.map((prop) => rampStart(paint[prop]))
			.filter((z): z is number => z !== undefined);
		return starts.length > 0 ? Math.max(...starts) : undefined;
	};

	it('every transitioning layer is gated exactly where it appears', () => {
		const wrong = style.layers
			.map((l) => ({ id: l.id, appear: appearZoom(l), min: (l as { minzoom?: number }).minzoom }))
			.filter((r) => r.appear !== undefined)
			.filter((r) => r.min !== Math.min(r.appear!, SOURCE_MAXZOOM))
			.map((r) => `${r.id}: minzoom ${r.min} but appears at z${r.appear}`);
		expect(wrong).toEqual([]);
	});

	it('gates never exceed the deepest real tile', () => {
		// Above z14 the tiles are overzoomed from z14, so a later gate defers work without gaining data.
		const tooDeep = style.layers
			.filter((l) => appearZoom(l) !== undefined)
			.filter((l) => ((l as { minzoom?: number }).minzoom ?? 0) > SOURCE_MAXZOOM)
			.map((l) => l.id);
		expect(tooDeep).toEqual([]);
	});
});

// ── Nothing pops in or out at a zoom bound (issue #146) ───────────────────────────
// A layer reaches a `minzoom` or `maxzoom` through a ramp from or to 0, or it appears all at once. What is
// measured across those bounds is in `npm run zoom-compare`.
describe('no line or fill starts or ends at a zoom bound while visible', () => {
	const builders: [string, () => StyleSpecification][] = [
		['osm', () => osm()],
		['osm, extruded', () => osm({ features: { buildings: 'extruded' } })],
		['omt', () => omt()],
		['protomaps', () => protomaps({ urls: { protomaps: 'https://example.org/tiles.json' } })],
	];

	it.each(builders)('%s', (_, build) => {
		expect(hardBounds(build()).filter((bound) => bound.type !== 'symbol')).toEqual([]);
	});
});

// Symbols are the exception, for now. `minzoom` is how these appear (see the note on it in `dsl/build.ts`), and
// MapLibre fades symbols in over time as placement changes, which no static comparison sees. A ramp isn't
// the obvious fix: whether a label at opacity 0 still blocks others in collision is unmeasured. Listed by id so
// a new symbol has to be added here on purpose. Not a claim that these look right.
const SYMBOLS_APPEARING_AT_ONCE = [
	'label-address-housenumber',
	'label-boundary-country-large',
	'label-boundary-country-medium',
	'label-boundary-country-small',
	'label-boundary-state',
	'label-motorway-exit',
	'label-motorway-shield',
	'label-place-capital',
	'label-place-city',
	'label-place-hamlet',
	'label-place-neighbourhood',
	'label-place-quarter',
	'label-place-statecapital',
	'label-place-suburb',
	'label-place-town',
	'label-place-village',
	'label-street-livingstreet',
	'label-street-pedestrian',
	'label-street-pedestrian-zone',
	'label-street-primary',
	'label-street-residential',
	'label-street-secondary',
	'label-street-tertiary',
	'label-street-track',
	'label-street-trunk',
	'label-street-unclassified',
	'label-water-river',
	'label-water-stream',
	'symbol-transit-airfield',
	'symbol-transit-airport',
	'symbol-transit-bus',
	'symbol-transit-station',
	'symbol-transit-tram',
];
// The same labels stop at a `maxzoom` while visible: boundary labels make way for the smaller ones.
const SYMBOLS_ENDING_AT_ONCE = [
	'label-boundary-country-large',
	'label-boundary-country-medium',
	'label-boundary-country-small',
	'label-boundary-state',
];

describe('the symbols with a hard zoom bound are the listed ones', () => {
	const symbols = (bound: 'minzoom' | 'maxzoom') =>
		hardBounds(style)
			.filter((found) => found.type === 'symbol' && found.bound === bound)
			.map((found) => found.id)
			.sort();

	it('at a minzoom', () => expect(symbols('minzoom')).toEqual(SYMBOLS_APPEARING_AT_ONCE));
	it('at a maxzoom', () => expect(symbols('maxzoom')).toEqual(SYMBOLS_ENDING_AT_ONCE));
});

// ── Zoom-range sanity ─────────────────────────────────────────────────────────────
// Cheap invariants that are currently clean; they exist so they stay that way. Each describes a
// layer that would silently render wrongly — or never render — rather than fail loudly.
describe('zoom ranges are internally consistent', () => {
	const styles = (): [string, StyleSpecification][] => [
		['default', style],
		['landcover', landcoverStyle],
	];

	it('no layer has a maxzoom at or below its minzoom (it would never render)', () => {
		for (const [name, s] of styles()) {
			const broken = s.layers
				.map((l) => l as { id: string; minzoom?: number; maxzoom?: number })
				.filter((l) => l.minzoom !== undefined && l.maxzoom !== undefined && l.maxzoom <= l.minzoom)
				.map((l) => `${l.id} [${l.minzoom}, ${l.maxzoom}]`);
			expect(broken, `${name}: layers with an empty zoom range`).toEqual([]);
		}
	});

	it('a layer with a maxzoom also has a minzoom', () => {
		// A one-sided range is almost always an oversight: the layer is gated at the top but
		// processed all the way down to z0.
		for (const [name, s] of styles()) {
			const oneSided = s.layers
				.map((l) => l as { id: string; minzoom?: number; maxzoom?: number })
				.filter((l) => l.maxzoom !== undefined && l.minzoom === undefined)
				.map((l) => l.id);
			expect(oneSided, `${name}: layers gated at the top but not the bottom`).toEqual([]);
		}
	});

	it('every fade finishes before its layer disappears', () => {
		// A fade that runs past maxzoom means the layer is removed before it ever reaches full
		// opacity — it would flicker in and vanish.
		for (const [name, s] of styles()) {
			const clipped: string[] = [];
			for (const layer of s.layers) {
				const max = (layer as { maxzoom?: number }).maxzoom;
				if (max === undefined) continue;
				const fade = opacityFade(s, layer.id);
				if (fade && fade.stops[0] + 1 > max)
					clipped.push(`${layer.id}: fade ends z${fade.stops[0] + 1} > maxzoom ${max}`);
			}
			expect(clipped, `${name}: fades cut short by maxzoom`).toEqual([]);
		}
	});
});

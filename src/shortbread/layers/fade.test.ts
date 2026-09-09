import { beforeAll, describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../api/index.js';

// ── The zoom-behaviour rule ────────────────────────────────────────────────────────
//
// Every zoom-dependent property of a layer is **declared once and derived everywhere else**.
// Both zoom bugs this suite exists to catch came from breaking that:
//
//   • #124 — the Shortbread appearance zooms lived in three hand-maintained copies (`appear:`,
//     `LAND_FILLS`, `LANDCOVER_DEFADE`); they drifted, and `land-sand`/`land-rock` ended up
//     the wrong way round. Now one table with a `landcover` flag, everything derived from it.
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
// The low-zoom landcover extension (features.landcover) is the exception: it supplies certain land
// kinds from z0, so with it enabled those fills must be visible at EVERY zoom (constant, no fade).

let style: StyleSpecification; // default colorful
let landcoverStyle: StyleSpecification; // colorful + features.landcover

beforeAll(async () => {
	[style, landcoverStyle] = await Promise.all([osm(), osm({ features: { landcover: true } })]);
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
// (`:outline`). Path-class ways (footway/steps/path/cycleway) are the exception to the opacity-fade
// rule: like the old VersaTiles style they appear by GROWING from 0 width at z15 (no opacity fade),
// so they're verified separately below rather than here.
const ROAD_TYPES: { id: string; z: number; outline: boolean }[] = [
	{ id: 'street-motorway', z: 5, outline: true },
	{ id: 'street-trunk', z: 6, outline: true },
	{ id: 'street-primary', z: 8, outline: true },
	{ id: 'street-secondary', z: 9, outline: true },
	{ id: 'street-tertiary', z: 10, outline: true },
	{ id: 'street-unclassified', z: 12, outline: true },
	{ id: 'street-residential', z: 12, outline: true },
	{ id: 'street-busway', z: 12, outline: true },
	{ id: 'street-busguideway', z: 12, outline: true },
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

// Path-class ways appear by width growth (0 at z15), not opacity — so they carry no opacity fade,
// and their fill + casing widths start at 0 at z15.
describe('path-class ways appear by growing from 0 width at z15 (no opacity fade)', () => {
	for (const id of ['way-footway', 'way-steps', 'way-path', 'way-cycleway']) {
		for (const layerId of [id, `${id}:outline`]) {
			it(`${layerId} has no opacity fade and starts at 0 width at z15`, () => {
				expect(opacityFade(style, layerId), `${layerId} must not opacity-fade`).toBeNull();
				const width = paintOf(style, layerId)?.['line-width'];
				expect(Array.isArray(width), `${layerId} must have a zoom width ramp`).toBe(true);
				const stops = (width as unknown[]).slice(3) as number[]; // z0, w0, …
				expect(stops[0], `${layerId} width ramp must start at z15`).toBe(15);
				expect(stops[1], `${layerId} must start at 0 width`).toBe(0);
			});
		}
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
// No rail is drawn before z11. Shortbread ships service tracks from z10 but the `service` attribute
// that identifies them only from z11, so z10 cannot tell a marshalling yard from a main line — see
// `transportStyle`. z11 is therefore the first zoom at which any rail layer may appear.
const RAIL_FADES: { id: string; z: number }[] = [
	{ id: 'transport-rail:outline', z: 11 },
	{ id: 'transport-rail', z: 14 },
	{ id: 'transport-lightrail:outline', z: 11 },
	{ id: 'transport-lightrail', z: 14 },
	{ id: 'transport-subway:outline', z: 11 },
	{ id: 'transport-subway', z: 14 },
];

describe('rail tracks fade in at the zoom their kind joins the map', () => {
	for (const { id, z } of RAIL_FADES) {
		it(`${id} over z${z}–${z + 1}`, () => expectFadeInAt(style, id, z));
	}

	it('no rail layer is drawn before z11, where `service` first distinguishes yards', () => {
		const early = style.layers
			.filter((l) => /^(tunnel-|bridge-)?transport-/.test(l.id) && !l.id.startsWith('transport-ferry'))
			.filter((l) => ((l as { minzoom?: number }).minzoom ?? 0) < 11)
			.map((l) => `${l.id}: minzoom ${(l as { minzoom?: number }).minzoom ?? 0}`);
		expect(early).toEqual([]);
	});
});

// The tram family and every service track appear by width growth instead: their curves already
// start at 0, so that growth IS the transition, and an opacity fade on top would only dim them
// through the zooms where they are the sole thing drawn.
const RAIL_WIDTH_GROWN: { id: string; z: number }[] = [
	{ id: 'transport-tram', z: 13 },
	{ id: 'transport-tram:outline', z: 15 },
	{ id: 'transport-narrowgauge', z: 13 },
	{ id: 'transport-narrowgauge:outline', z: 15 },
	{ id: 'transport-funicular', z: 13 },
	{ id: 'transport-funicular:outline', z: 15 },
	{ id: 'transport-monorail', z: 13 },
	{ id: 'transport-monorail:outline', z: 15 },
	{ id: 'transport-rail-service:outline', z: 14 },
	{ id: 'transport-rail-service', z: 15 },
	{ id: 'transport-lightrail-service:outline', z: 14 },
	{ id: 'transport-lightrail-service', z: 15 },
];

describe('tram-family and service tracks appear by growing from 0 width (no opacity fade)', () => {
	for (const { id, z } of RAIL_WIDTH_GROWN) {
		it(`${id} grows from 0 width at z${z}`, () => {
			expect(opacityFade(style, id), `${id} must not opacity-fade`).toBeNull();
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
// Painting these from z0 leaks the low-zoom landcover extension's data even with
// `features.landcover` off — issue #124.
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

	it('no fill escapes the landcover-mode lists', () => {
		const listed = new Set([...LANDCOVER_COVERED, ...LANDCOVER_UNCOVERED.map((f) => f.id)]);
		const missing = landcoverStyle.layers
			.filter((l) => l.type === 'fill')
			.filter((l) => ['land', 'water_polygons'].includes((l as { 'source-layer'?: string })['source-layer'] ?? ''))
			.map((l) => l.id)
			.filter((id) => !listed.has(id));
		expect(missing, `unlisted fills — add them to LANDCOVER_COVERED or LANDCOVER_UNCOVERED`).toEqual([]);
	});
});

// ── Buildings & sites (all at Shortbread z14) ─────────────────────────────────────
describe('buildings fade in at Shortbread z14', () => {
	for (const id of ['building', 'building:outline']) {
		it(`${id} over z14–15`, () => expectFadeInAt(style, id, 14));
	}
});

const SITE_KINDS = [
	'dangerarea',
	'sportscentre',
	'university',
	'college',
	'school',
	'hospital',
	'prison',
	'parking',
	'bicycleparking',
	'construction',
];

describe('sites fade in at Shortbread z14', () => {
	for (const kind of SITE_KINDS) {
		it(`site-${kind} over z14–15`, () => expectFadeInAt(style, `site-${kind}`, 14));
	}
});

// ── Ferries (Shortbread z10) ──────────────────────────────────────────────────────
describe('ferries fade in at Shortbread z10', () => {
	it('transport-ferry over z10–11', () => expectFadeInAt(style, 'transport-ferry', 10));
});

// ── Low-zoom landcover extension (features.landcover) ──────────────────────────────
// https://docs.versatiles.org/compendium/specification_shortbread_landcover.html
// The extension fills these land kinds from z0, so with it enabled the layers must be VISIBLE AT
// EVERY ZOOM — constant opacity, NOT a fade — at the same target they otherwise reach. Land kinds
// the extension does not cover keep fading in at their normal Shortbread minzoom.
// Which kinds the extension actually supplies, per the ESA WorldCover mapping in the spec.
// `land-sand` is NOT covered — the spec has no ESA class for beach/sand — and `land-rock` IS,
// via "Bare/sparse vegetation → bare_rock". Both were the wrong way round (issue #124, defect 3).
const LANDCOVER_COVERED = [
	'land-forest',
	'land-grass',
	'land-vegetation',
	'land-agriculture',
	'land-residential',
	'land-rock',
	'land-wetland',
	// water_polygons kinds supplied at z0–3
	'land-glacier',
	'water-area',
];
const LANDCOVER_UNCOVERED: { id: string; z: number }[] = [
	{ id: 'land-commercial', z: 10 },
	{ id: 'land-industrial', z: 10 },
	{ id: 'land-waste', z: 10 },
	{ id: 'land-sand', z: 10 },
	{ id: 'land-park', z: 11 },
	{ id: 'land-garden', z: 11 },
	{ id: 'land-leisure', z: 11 },
	{ id: 'land-burial', z: 13 },
	// water_polygons kinds the extension does not supply
	{ id: 'water-area-river', z: 4 },
	{ id: 'water-area-small', z: 4 },
];

// The fully-shown opacity of a fill layer: the constant, or the max of its fade.
function targetOpacity(s: StyleSpecification, layerId: string): number {
	const op = paintOf(s, layerId)?.['fill-opacity'];
	if (op === undefined || op === null) return 1;
	if (typeof op === 'number') return op;
	if (Array.isArray(op)) return Math.max(...(op.slice(3) as number[]).filter((_, i) => i % 2 === 1));
	return 1;
}

describe('with features.landcover, covered land kinds are visible at every zoom (no fade)', () => {
	for (const id of LANDCOVER_COVERED) {
		it(`${id} has constant opacity from z0`, () => {
			// Sanity: without the extension this same layer fades in (proven by the default block above).
			expect(opacityFade(style, id), `${id} should fade in by default`).not.toBeNull();

			const layer = landcoverStyle.layers.find((l) => l.id === id);
			expect(layer, `${id} must exist with landcover`).toBeDefined();
			expect((layer as { minzoom?: number }).minzoom ?? 0, `${id} must render from z0`).toBeLessThanOrEqual(0);

			const op = paintOf(landcoverStyle, id)?.['fill-opacity'] ?? 1;
			expect(typeof op, `${id} must have a constant (non-fading) opacity with landcover`).toBe('number');
			expect(op as number, `${id} must stay visible (opacity > 0)`).toBeGreaterThan(0);
			expect(op as number, `${id} keeps its default target opacity`).toBeCloseTo(targetOpacity(style, id), 3);
		});
	}
});

describe('with features.landcover, uncovered land kinds still fade at their Shortbread minzoom', () => {
	for (const { id, z } of LANDCOVER_UNCOVERED) {
		it(`${id} over z${z}–${z + 1}`, () => expectFadeInAt(landcoverStyle, id, z));
	}
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

	it('landcover clears the gate on the fills it reveals', () => {
		for (const id of LANDCOVER_COVERED) {
			const layer = landcoverStyle.layers.find((l) => l.id === id) as { minzoom?: number };
			expect(layer.minzoom ?? 0, `${id} must render from z0 with landcover`).toBeLessThanOrEqual(0);
		}
	});
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

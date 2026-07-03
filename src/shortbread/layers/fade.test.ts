import { beforeAll, describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../api/osm.js';

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
// Shortbread serves rail from z8–10, but its OSM-Bright width curves are ~0 below z14, so colorful
// only starts drawing rail at z14 — and that's where it fades in (base + hatching, every kind).
const RAIL_KINDS = ['rail', 'lightrail', 'subway', 'tram', 'narrowgauge', 'funicular', 'monorail'];
const RAIL_Z = 14;

describe('rail tracks fade in at z14 (their OSM-Bright drawing zoom)', () => {
	for (const kind of RAIL_KINDS) {
		for (const layerId of [`transport-${kind}`, `transport-${kind}:outline`]) {
			it(`${layerId} over z${RAIL_Z}–${RAIL_Z + 1}`, () => expectFadeInAt(style, layerId, RAIL_Z));
		}
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
const LANDCOVER_COVERED = [
	'land-forest',
	'land-grass',
	'land-vegetation',
	'land-agriculture',
	'land-residential',
	'land-sand',
	'land-wetland',
];
const LANDCOVER_UNCOVERED: { id: string; z: number }[] = [
	{ id: 'land-commercial', z: 10 },
	{ id: 'land-industrial', z: 10 },
	{ id: 'land-waste', z: 10 },
	{ id: 'land-park', z: 11 },
	{ id: 'land-garden', z: 11 },
	{ id: 'land-leisure', z: 11 },
	{ id: 'land-rock', z: 11 },
	{ id: 'land-burial', z: 13 },
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

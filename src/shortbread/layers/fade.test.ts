import { beforeAll, describe, expect, it } from 'vitest';
import { normalizePropertyExpression, latest } from '@maplibre/maplibre-gl-style-spec';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../api/osm.js';

// Specification under test (independent of the implementation):
//
// Line layers that fade in must do so by OPACITY over the zoom level `z` at which they appear:
//   • invisible        — line-opacity 0   at z
//   • half transparent — line-opacity 0.5 at z + 0.5
//   • fully opaque      — line-opacity 1   at z + 1
// This holds for each layer's main line AND its casing (`:outline`) where it has one.

let style: StyleSpecification;

beforeAll(async () => {
	style = await osm();
});

// Resolved line-opacity of a layer at a zoom; `null` if the layer is absent. A layer with no
// line-opacity is fully opaque (1) at every zoom.
function lineOpacity(id: string, zoom: number): number | null {
	const layer = style.layers.find((l) => l.id === id);
	if (!layer) return null;
	const value = (layer as { paint?: Record<string, unknown> }).paint?.['line-opacity'] ?? 1;
	const expr = normalizePropertyExpression(
		value as Parameters<typeof normalizePropertyExpression>[0],
		latest.paint_line['line-opacity'] as Parameters<typeof normalizePropertyExpression>[1]
	);
	return expr.evaluate({ zoom } as never, { type: 2, properties: {} } as never) as number;
}

function expectFadeIn(layerId: string, z: number): void {
	expect(lineOpacity(layerId, z), `${layerId} must exist`).not.toBeNull();
	expect(lineOpacity(layerId, z), `${layerId} must be invisible at z${z}`).toBe(0);
	expect(lineOpacity(layerId, z + 0.5), `${layerId} must be half transparent at z${z + 0.5}`).toBeCloseTo(0.5, 2);
	expect(lineOpacity(layerId, z + 1), `${layerId} must be fully opaque at z${z + 1}`).toBe(1);
}

// ── Roads ───────────────────────────────────────────────────────────────────────
// kind → first zoom level `z` (Shortbread `streets` schema minzoom). `outline` marks the road types
// drawn with a casing (`:outline`) layer; path-class ways (footway/steps/path/cycleway) have none.
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
	{ id: 'way-footway', z: 13, outline: false },
	{ id: 'way-steps', z: 13, outline: false },
	{ id: 'way-path', z: 13, outline: false },
	{ id: 'way-cycleway', z: 13, outline: false },
];

describe('roads fade in by opacity at their Shortbread appearance zoom', () => {
	for (const { id, z, outline } of ROAD_TYPES) {
		for (const layerId of outline ? [id, `${id}:outline`] : [id]) {
			it(`${layerId} fades 0 → 0.5 → 1 over z${z}–${z + 1}`, () => expectFadeIn(layerId, z));
		}
	}
});

// ── Boundaries ──────────────────────────────────────────────────────────────────
// Boundaries that appear above z0 fade in over their appearance zoom. (Country/disputed boundaries
// exist from z0 and are always drawn, so they are not faded.)
const BOUNDARIES: { id: string; z: number }[] = [
	{ id: 'boundary-state', z: 7 }, // Shortbread admin level 4 appears at z7
	{ id: 'boundary-country-maritime', z: 4 }, // maritime borders are drawn from z4
];

describe('boundaries fade in by opacity at their appearance zoom', () => {
	for (const { id, z } of BOUNDARIES) {
		it(`${id} fades 0 → 0.5 → 1 over z${z}–${z + 1}`, () => expectFadeIn(id, z));
	}
});

// ── Rail tracks ─────────────────────────────────────────────────────────────────
// Rail tracks fade in over z14 → z15 — the zoom at which OSM Bright starts drawing rail (its width
// curves are ~0 below 14) — for both the base (:outline) and the hatching (fill) of every kind.
const RAIL_KINDS = ['rail', 'lightrail', 'subway', 'tram', 'narrowgauge', 'funicular', 'monorail'];
const RAIL_Z = 14;

describe('rail tracks fade in by opacity at z14', () => {
	for (const kind of RAIL_KINDS) {
		for (const layerId of [`transport-${kind}`, `transport-${kind}:outline`]) {
			it(`${layerId} fades 0 → 0.5 → 1 over z${RAIL_Z}–${RAIL_Z + 1}`, () => expectFadeIn(layerId, RAIL_Z));
		}
	}
});

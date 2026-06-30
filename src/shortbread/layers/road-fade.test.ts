import { beforeAll, describe, expect, it } from 'vitest';
import { normalizePropertyExpression, latest } from '@maplibre/maplibre-gl-style-spec';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../api/osm.js';

// Specification under test (independent of the implementation):
//
// Every road type must fade in by opacity over the zoom level `z` at which its kind first appears
// in Shortbread tiles (https://shortbread-tiles.org/schema/1.0/):
//   • invisible        — line-opacity 0   at z
//   • half transparent — line-opacity 0.5 at z + 0.5
//   • fully opaque     — line-opacity 1   at z + 1
// This must hold for each road type's main line layer AND its related casing (`:outline`) layer.

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

describe('roads fade in by opacity at their Shortbread appearance zoom', () => {
	for (const { id, z, outline } of ROAD_TYPES) {
		for (const layerId of outline ? [id, `${id}:outline`] : [id]) {
			it(`${layerId} fades 0 → 0.5 → 1 over z${z}–${z + 1}`, () => {
				expect(lineOpacity(layerId, z), `${layerId} must exist`).not.toBeNull();
				expect(lineOpacity(layerId, z), `${layerId} must be invisible at z${z}`).toBe(0);
				expect(lineOpacity(layerId, z + 0.5), `${layerId} must be half transparent at z${z + 0.5}`).toBeCloseTo(0.5, 2);
				expect(lineOpacity(layerId, z + 1), `${layerId} must be fully opaque at z${z + 1}`).toBe(1);
			});
		}
	}
});

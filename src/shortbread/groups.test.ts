import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../api/index.js';
import type { LayerGroupOptions } from '../options/index.js';
import { SLOT_IDS } from './groups.js';

// Per-group visibility/opacity is applied by each layer generator via `gate` (build.ts), driven by
// the resolved `layers:` option carried in the context. These end-to-end checks exercise that path
// through the public osm() API: hidden groups drop out, fractional values bake in opacity.

function idsFor(layers?: LayerGroupOptions): Set<string> {
	const style = osm(layers ? { layers } : undefined);
	return new Set(style.layers.map((l) => l.id));
}

const paintOf = (style: StyleSpecification, id: string): Record<string, unknown> =>
	(style.layers.find((l) => l.id === id) as { paint?: Record<string, unknown> })?.paint ?? {};

describe('SLOT_IDS', () => {
	it('references slot layer IDs present in the default style', () => {
		const ids = idsFor();
		for (const id of Object.values(SLOT_IDS)) expect(ids.has(id)).toBe(true);
	});
});

describe('layer visibility gating', () => {
	it('shows every path class by default', () => {
		const ids = idsFor();
		expect(ids.has('way-footway')).toBe(true);
		expect(ids.has('way-steps')).toBe(true);
		expect(ids.has('way-path')).toBe(true);
		expect(ids.has('way-cycleway')).toBe(true);
	});

	it('hides footway and steps when explicitly disabled', () => {
		const ids = idsFor({ roads: { footway: false, steps: false } });
		expect(ids.has('way-footway')).toBe(false);
		expect(ids.has('way-steps')).toBe(false);
		expect(ids.has('way-path')).toBe(true); // sibling path class stays visible
	});

	it('drops every layer of a top-level group set to false', () => {
		const ids = idsFor({ buildings: false });
		expect([...ids].some((id) => id.startsWith('building'))).toBe(false);
	});

	it('drops a nested sub-group while keeping its siblings', () => {
		const full = idsFor();
		// residential + unclassified are one merged layer (see MERGES in layers/index.ts); the
		// `residential` sub-group owns both kinds, so gating it off drops the merged layer.
		expect(full.has('street-minor')).toBe(true);

		const ids = idsFor({ roads: { streets: { residential: false } } });
		expect(ids.has('street-minor')).toBe(false);
		expect(ids.has('tunnel-street-minor')).toBe(false);
		expect(ids.has('street-service')).toBe(true); // sibling street kind
		expect(ids.has('street-motorway')).toBe(true); // sibling road group
	});

	it('cascades a scalar to hide all road layers', () => {
		const ids = idsFor({ roads: false });
		for (const id of ['street-motorway', 'street-minor', 'way-footway', 'bridge-street-motorway'])
			expect(ids.has(id)).toBe(false);
	});

	it('applies a fractional opacity as a constant to a layer with no existing fade', () => {
		// water-ocean (group water.ocean) reads the `ocean` source-layer, which Shortbread serves from
		// z0, so it is drawn at full opacity with no fade → dimming is a plain constant.
		// (water-area is no longer a valid example: it fades in at z4 with water_polygons, see #124.)
		const style = osm({ layers: { water: { ocean: 0.4 } } });
		expect(paintOf(style, 'water-ocean')['fill-opacity']).toBe(0.4);
	});

	it('merges a fractional opacity into the water_polygons fade', () => {
		// water-area fades in over z4→5; dimming by 0.5 must scale the target, not replace the ramp.
		const op = paintOf(osm({ layers: { water: { lakes: 0.5 } } }), 'water-area')['fill-opacity'];
		expect(op).toStrictEqual(['interpolate', ['linear'], ['zoom'], 4, 0, 5, 0.5]);
	});

	it('merges a fractional opacity into an existing fade instead of overwriting it', () => {
		// `building` fades in over z14→15 ({14:0, 15:1}); dimming by 0.5 scales the target to 0.5.
		const op = paintOf(osm({ layers: { buildings: 0.5 } }), 'building')['fill-opacity'];
		expect(Array.isArray(op)).toBe(true);
		expect(op).toStrictEqual(['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.5]);
	});

	it('drops a layer set to 0 rather than emitting it at zero opacity', () => {
		const ids = idsFor({ buildings: 0 });
		expect([...ids].some((id) => id.startsWith('building'))).toBe(false);
	});

	it('keeps layers fully visible when a group is true or 1', () => {
		const ids = idsFor({ buildings: true });
		expect(ids.has('building')).toBe(true);
	});

	// ── icons alias ────────────────────────────────────────────────────────────────

	it('hides POIs, road markings and transit stops via the icons alias', () => {
		const ids = idsFor({ icons: false });
		expect([...ids].some((id) => id.startsWith('poi-'))).toBe(false);
		expect([...ids].some((id) => id.startsWith('marking-'))).toBe(false);
		expect([...ids].some((id) => id.startsWith('symbol-transit-'))).toBe(false);
	});

	it('lets a specific icon group override the icons alias', () => {
		const ids = idsFor({ icons: false, pois: true });
		expect([...ids].some((id) => id.startsWith('poi-'))).toBe(true);
		expect([...ids].some((id) => id.startsWith('marking-'))).toBe(false);
	});
});

// A scalar in place of the whole `layers` object cascades to every group — the same rule that
// already applies at each level below it. Before this, `layers: false` was silently ignored and
// returned a fully-populated style (B5).
describe('top-level layers scalar', () => {
	it('layers: false hides every group — the v6 equivalent of the v5 `empty` style', () => {
		const style = osm({ layers: false });
		const ids = style.layers.map((l) => l.id);
		// Only the background and the four slot anchors survive; they carry no data.
		expect(ids).toStrictEqual([
			'background',
			'slot-below-fills',
			'slot-below-streets',
			'slot-below-symbols',
			'slot-below-labels',
		]);
		expect(Object.keys(style.sources)).toContain('versatiles-shortbread');
	});

	it('layers: true is the same as the default', () => {
		expect(osm({ layers: true }).layers.length).toBe(osm().layers.length);
	});

	it('layers: 0.5 dims every group', () => {
		const style = osm({ layers: 0.5 });
		expect(paintOf(style, 'water-ocean')['fill-opacity']).toBe(0.5);
		expect(paintOf(style, 'building')['fill-opacity']).toStrictEqual([
			'interpolate',
			['linear'],
			['zoom'],
			14,
			0,
			15,
			0.5,
		]);
	});
});

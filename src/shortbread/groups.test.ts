import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../api/osm.js';
import type { LayerGroupOptions } from '../options/index.js';
import { SLOT_IDS } from './groups.js';

// Per-group visibility/opacity is applied by each layer generator via `gate` (build.ts), driven by
// the resolved `layers:` option carried in the context. These end-to-end checks exercise that path
// through the public osm() API: hidden groups drop out, fractional values bake in opacity.

async function idsFor(layers?: LayerGroupOptions): Promise<Set<string>> {
	const style = await osm(layers ? { layers } : undefined);
	return new Set(style.layers.map((l) => l.id));
}

const paintOf = (style: StyleSpecification, id: string): Record<string, unknown> =>
	(style.layers.find((l) => l.id === id) as { paint?: Record<string, unknown> })?.paint ?? {};

describe('SLOT_IDS', () => {
	it('references slot layer IDs present in the default style', async () => {
		const ids = await idsFor();
		for (const id of Object.values(SLOT_IDS)) expect(ids.has(id)).toBe(true);
	});
});

describe('layer visibility gating', () => {
	it('shows every path class by default', async () => {
		const ids = await idsFor();
		expect(ids.has('way-footway')).toBe(true);
		expect(ids.has('way-steps')).toBe(true);
		expect(ids.has('way-path')).toBe(true);
		expect(ids.has('way-cycleway')).toBe(true);
	});

	it('hides footway and steps when explicitly disabled', async () => {
		const ids = await idsFor({ roads: { footway: false, steps: false } });
		expect(ids.has('way-footway')).toBe(false);
		expect(ids.has('way-steps')).toBe(false);
		expect(ids.has('way-path')).toBe(true); // sibling path class stays visible
	});

	it('drops every layer of a top-level group set to false', async () => {
		const ids = await idsFor({ buildings: false });
		expect([...ids].some((id) => id.startsWith('building'))).toBe(false);
	});

	it('drops a nested sub-group while keeping its siblings', async () => {
		const full = await idsFor();
		expect(full.has('street-residential')).toBe(true);

		const ids = await idsFor({ roads: { streets: { residential: false } } });
		expect(ids.has('street-residential')).toBe(false);
		expect(ids.has('tunnel-street-residential')).toBe(false);
		expect(ids.has('street-service')).toBe(true); // sibling street kind
		expect(ids.has('street-motorway')).toBe(true); // sibling road group
	});

	it('cascades a scalar to hide all road layers', async () => {
		const ids = await idsFor({ roads: false });
		for (const id of ['street-motorway', 'street-residential', 'way-footway', 'bridge-street-motorway'])
			expect(ids.has(id)).toBe(false);
	});

	it('applies a fractional opacity as a constant to a layer with no existing fade', async () => {
		// water-area (group water.lakes) is drawn at full opacity with no fade → dimming is a constant.
		const style = await osm({ layers: { water: { lakes: 0.4 } } });
		expect(paintOf(style, 'water-area')['fill-opacity']).toBe(0.4);
	});

	it('merges a fractional opacity into an existing fade instead of overwriting it', async () => {
		// `building` fades in over z14→15 ({14:0, 15:1}); dimming by 0.5 scales the target to 0.5.
		const op = paintOf(await osm({ layers: { buildings: 0.5 } }), 'building')['fill-opacity'];
		expect(Array.isArray(op)).toBe(true);
		expect(op).toStrictEqual(['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.5]);
	});

	it('drops a layer set to 0 rather than emitting it at zero opacity', async () => {
		const ids = await idsFor({ buildings: 0 });
		expect([...ids].some((id) => id.startsWith('building'))).toBe(false);
	});

	it('keeps layers fully visible when a group is true or 1', async () => {
		const ids = await idsFor({ buildings: true });
		expect(ids.has('building')).toBe(true);
	});

	// ── icons alias ────────────────────────────────────────────────────────────────

	it('hides POIs, road markings and transit stops via the icons alias', async () => {
		const ids = await idsFor({ icons: false });
		expect([...ids].some((id) => id.startsWith('poi-'))).toBe(false);
		expect([...ids].some((id) => id.startsWith('marking-'))).toBe(false);
		expect([...ids].some((id) => id.startsWith('symbol-transit-'))).toBe(false);
	});

	it('lets a specific icon group override the icons alias', async () => {
		const ids = await idsFor({ icons: false, pois: true });
		expect([...ids].some((id) => id.startsWith('poi-'))).toBe(true);
		expect([...ids].some((id) => id.startsWith('marking-'))).toBe(false);
	});
});

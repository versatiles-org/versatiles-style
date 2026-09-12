import { describe, expect, it } from 'vitest';
import { OMT_SCHEMA } from './schema.js';

// ── Vendored OpenMapTiles record ──────────────────────────────────────────────
//
// `schema.ts` is generated — `npm run vendor-schema -- omt --write` — so what is worth testing is not
// its contents but its *shape*: a botched or truncated re-vendor must fail here rather than silently
// weaken every conformance check that reads it. `npm run vendor-schema -- omt --check` is the other
// half of the guard, and the half that needs network: it answers whether the record is still current.
//
// There is no style-conformance test here yet, and there should not be: no OpenMapTiles cartography
// exists. `npm run schema-gate -- omt` is what reads this record today (SCHEMA-SUPPORT-PLAN.md §7
// step 2).

describe('OMT_SCHEMA', () => {
	it('carries the full OpenFreeMap layer inventory', () => {
		// The 16 layers of the OpenMapTiles schema as OpenFreeMap serves it. An added or removed layer
		// is a real schema change and should be seen, not absorbed.
		expect(Object.keys(OMT_SCHEMA).sort()).toEqual([
			'aerodrome_label',
			'aeroway',
			'boundary',
			'building',
			'housenumber',
			'landcover',
			'landuse',
			'mountain_peak',
			'park',
			'place',
			'poi',
			'transportation',
			'transportation_name',
			'water',
			'water_name',
			'waterway',
		]);
	});

	it('states a sane zoom range for every layer', () => {
		for (const [id, layer] of Object.entries(OMT_SCHEMA)) {
			expect(layer.minzoom, `${id}.minzoom`).toBeGreaterThanOrEqual(0);
			expect(layer.maxzoom, `${id}.maxzoom`).toBeLessThanOrEqual(14);
			expect(layer.minzoom, `${id} zoom range`).toBeLessThanOrEqual(layer.maxzoom);
		}
	});

	it('lists fields sorted and deduplicated, so a re-vendor produces no spurious diff', () => {
		for (const [id, layer] of Object.entries(OMT_SCHEMA)) {
			expect([...layer.fields], `${id}.fields`).toEqual([...layer.fields].sort());
			expect(new Set(layer.fields).size, `${id}.fields unique`).toBe(layer.fields.length);
		}
	});

	it('carries the fields the gate mapping reasons about', () => {
		// Spot-checks, not an inventory: these are the fields `scripts/config/schema-mapping.ts` cites as
		// evidence, so if a re-vendor loses them the mapping's notes become wrong rather than stale.
		expect(OMT_SCHEMA.transportation.fields).toContain('brunnel');
		expect(OMT_SCHEMA.transportation.fields).toContain('ramp');
		expect(OMT_SCHEMA.transportation.fields).toContain('subclass');
		expect(OMT_SCHEMA.building.fields).toContain('render_height');
		expect(OMT_SCHEMA.boundary.fields).toContain('admin_level');
		expect(OMT_SCHEMA.poi.fields).toContain('subclass');
	});

	it('lacks the fields the gate reports as absent', () => {
		// The other half of that evidence: these absences are what make four groups lose layers and
		// thirty need re-derivation, so they are asserted rather than assumed.
		expect(OMT_SCHEMA.place.fields).not.toContain('population');
		expect(OMT_SCHEMA.transportation.fields).not.toContain('oneway_reverse');
		for (const layer of Object.values(OMT_SCHEMA)) expect(layer.fields).not.toContain('way_area');
		// `transportation` carries no names at all — street labels must come from `transportation_name`.
		expect(OMT_SCHEMA.transportation.fields.filter((f) => /^name([_:]|$)/.test(f))).toEqual([]);
	});
});

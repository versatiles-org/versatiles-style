import { describe, expect, it } from 'vitest';
import { PROTOMAPS_SCHEMA } from './schema.js';

// ── Vendored Protomaps Basemap record ─────────────────────────────────────────
//
// The counterpart of `src/omt/schema.test.ts`. `schema.ts` is generated — `npm run vendor-schema --
// protomaps --write` — so what is worth testing is not its contents but its *shape*: a botched or
// truncated re-vendor must fail here rather than silently weaken `conformance.test.ts`, which reads
// this record to decide whether the layers are allowed to name a source-layer or a field.
//
// `npm run vendor-schema -- protomaps --check` is the other half of the guard, and the half that
// needs network: it answers whether the record is still current. This half answers whether it is
// intact. Unlike the other two schemas the record is read out of a PMTiles archive's metadata rather
// than a TileJSON, which is the step most likely to produce a plausible-looking partial result.

describe('PROTOMAPS_SCHEMA', () => {
	it('carries the full Protomaps Basemap layer inventory', () => {
		// The nine layers of the Protomaps Basemap. An added or removed layer is a real schema change
		// and should be seen, not absorbed.
		expect(Object.keys(PROTOMAPS_SCHEMA).sort()).toEqual([
			'boundaries',
			'buildings',
			'earth',
			'landcover',
			'landuse',
			'places',
			'pois',
			'roads',
			'water',
		]);
	});

	it('states a sane zoom range for every layer', () => {
		for (const [id, layer] of Object.entries(PROTOMAPS_SCHEMA)) {
			expect(layer.minzoom, `${id}.minzoom`).toBeGreaterThanOrEqual(0);
			// Protomaps reaches z15, where Shortbread and OpenMapTiles stop at z14.
			expect(layer.maxzoom, `${id}.maxzoom`).toBeLessThanOrEqual(15);
			expect(layer.minzoom, `${id} zoom range`).toBeLessThanOrEqual(layer.maxzoom);
		}
	});

	it('lists fields sorted and deduplicated, so a re-vendor produces no spurious diff', () => {
		for (const [id, layer] of Object.entries(PROTOMAPS_SCHEMA)) {
			expect([...layer.fields], `${id}.fields`).toEqual([...layer.fields].sort());
			expect(new Set(layer.fields).size, `${id}.fields unique`).toBe(layer.fields.length);
		}
	});

	it('classifies with kind / kind_detail, which is what the layers filter on', () => {
		// The defining difference from the other two schemas: `kind` where they use `class`. Every
		// layer module's filters are written against it, so losing it in a re-vendor would make the
		// conformance audit pass while the map drew nothing.
		for (const id of ['boundaries', 'places', 'pois', 'roads', 'water', 'landuse', 'landcover']) {
			expect(PROTOMAPS_SCHEMA[id].fields, `${id}.fields`).toContain('kind');
		}
		for (const id of ['boundaries', 'places', 'pois', 'roads', 'water']) {
			expect(PROTOMAPS_SCHEMA[id].fields, `${id}.fields`).toContain('kind_detail');
		}
		// …and it is `kind`, not `class`, throughout.
		for (const [id, layer] of Object.entries(PROTOMAPS_SCHEMA)) {
			expect(layer.fields, `${id}.fields`).not.toContain('class');
			expect(layer.fields, `${id}.fields`).not.toContain('subclass');
		}
	});

	it('carries the fields the layer modules reason about', () => {
		// Spot-checks, not an inventory. Each of these is read by a filter somewhere under `layers/`.
		expect(PROTOMAPS_SCHEMA.roads.fields).toContain('is_bridge');
		expect(PROTOMAPS_SCHEMA.roads.fields).toContain('is_tunnel');
		expect(PROTOMAPS_SCHEMA.roads.fields).toContain('is_link');
		expect(PROTOMAPS_SCHEMA.buildings.fields).toContain('height');
		expect(PROTOMAPS_SCHEMA.boundaries.fields).toContain('disputed');
		expect(PROTOMAPS_SCHEMA.places.fields).toContain('capital');
	});

	it('carries the colon-form translations and not the underscore form', () => {
		// Protomaps spells a translation `name:de`; Shortbread and OpenMapTiles spell it `name_de`.
		// `protomaps.languages()` and `context.ts` both depend on that being the only form here.
		expect(PROTOMAPS_SCHEMA.places.fields.some((f) => f.startsWith('name:'))).toBe(true);
		for (const [id, layer] of Object.entries(PROTOMAPS_SCHEMA)) {
			expect(
				layer.fields.filter((f) => /^name_[a-z]{2}$/.test(f)),
				`${id} underscore names`
			).toEqual([]);
		}
	});

	it('gives the coarse low-zoom landcover band its own layer, unlike Shortbread', () => {
		// `features.landcover` emits from this layer, and it stops well before the detailed land fills
		// begin — which is what makes it a *low-zoom* band rather than a second set of land polygons.
		expect(PROTOMAPS_SCHEMA.landcover.minzoom).toBe(0);
		expect(PROTOMAPS_SCHEMA.landcover.maxzoom).toBeLessThan(PROTOMAPS_SCHEMA.landuse.maxzoom);
	});
});

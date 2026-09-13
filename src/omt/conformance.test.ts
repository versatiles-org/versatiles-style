import { describe, expect, it } from 'vitest';
import { resolveLayerGroups } from '../options/index.js';
import { resolveOmt } from './options.js';
import { auditSchema } from '../lib/schema-audit.js';
import { OMT_SCHEMA } from './schema.js';
import { buildContext } from './context.js';
import { buildStyleLayers, omtLayers } from './layers/index.js';
import type { StyleSpecification } from '../types/index.js';

// ── OpenMapTiles schema conformance ───────────────────────────────────────────
//
// The same guard as `src/shortbread/schema.test.ts`, on the same audit, against a different record —
// which is the whole point of having made it generic in step 2: a schema inherits the check by naming
// its record and its style, not by restating the logic (SCHEMA-SUPPORT-PLAN.md §8.1).
//
// Scope, stated plainly: this proves the layers read source-layers and fields OpenMapTiles *has*, and
// are not drawn before their data. It cannot prove a filter matches anything, because the vendored
// record lists field names and not the values behind them — so `class: lake` being right is a claim no
// offline test can settle. That needs tiles, and §8.2 is where it belongs.

const style = { version: 8, sources: {}, layers: buildStyleLayers(buildContext(resolveOmt())) } as StyleSpecification;
const audit = auditSchema(style, OMT_SCHEMA);

describe('the ported layers read data OpenMapTiles carries', () => {
	it('no unknown source-layer', () => {
		expect(audit.unknownSourceLayers, 'source-layers that do not exist in the tiles').toEqual([]);
	});

	it('no filter or expression reads a field the tiles do not carry', () => {
		expect(audit.unknownFields, 'reads of non-existent fields — these evaluate to undefined and fail silently').toEqual(
			[]
		);
	});

	it('every language field read is present in the tileset', () => {
		expect(audit.missingLanguageFields).toEqual([]);
	});

	it('every layer is gated at or after its source-layer minzoom', () => {
		expect(audit.drawnBeforeData).toEqual([]);
	});
});

describe('coverage, while the port is incomplete', () => {
	// The inverse of Shortbread's coverage test, which demands that every source-layer be rendered or
	// explicitly waived. Here the unrendered set is the to-do list, so it is asserted exactly: a module
	// landing must shorten it, and nothing may drop off it by accident.
	it('reads exactly the source-layers the ported modules need', () => {
		expect([...audit.usage.keys()].sort()).toEqual([
			'aerodrome_label',
			'aeroway',
			'boundary',
			'building',
			'housenumber',
			'landcover',
			'landuse',
			'place',
			'poi',
			'transportation',
			'transportation_name',
			'water',
			'water_name',
			'waterway',
		]);
	});

	it('lists every source-layer still to be bound', () => {
		expect(audit.unrendered).toEqual([
			// Both deliberate, not pending. `mountain_peak` (peak / cliff / saddle, with `ele` and `rank`)
			// has no Shortbread counterpart at all, and adding a layer only this schema draws would make the
			// two maps diverge in the direction §23 warns about — it is a candidate for later, not a gap.
			'mountain_peak',
			// `park` holds protected areas, and its `class` was sampled at 56+ values including raw localised
			// titles ("Natura 2000-gebied", "Ruhezone I/5"), so nothing filters on it. Urban parks come from
			// `landcover` (`subclass: park`) instead.
			'park',
		]);
	});
});

describe('the schema seam', () => {
	it('sources every data layer from the OpenMapTiles source name', () => {
		const sources = new Set(style.layers.map((l) => (l as { source?: string }).source).filter(Boolean));
		expect([...sources]).toEqual(['openmaptiles']);
	});

	it('emits the four slot anchors §6 requires of every schema', () => {
		// The page background is a background-type layer too, so anchors are identified by id.
		const anchors = style.layers.filter((l) => l.id.startsWith('slot-')).map((l) => l.id);
		expect(anchors).toEqual(['slot-below-fills', 'slot-below-streets', 'slot-below-symbols', 'slot-below-labels']);
		// Every anchor must be an invisible background, or it would paint over the map.
		for (const anchor of style.layers.filter((l) => l.id.startsWith('slot-'))) {
			expect(anchor.type, anchor.id).toBe('background');
		}
	});

	it('floors each layer at its own source-layer’s data zoom, not Shortbread’s', () => {
		// `water` starts at z0 in OpenMapTiles where Shortbread's `water_polygons` starts at z4, so the
		// ocean fill is ungated here — if the Shortbread record were being consulted it would be z4.
		const ocean = style.layers.find((l) => l.id === 'water-ocean') as { minzoom?: number };
		expect(ocean.minzoom).toBeUndefined();
		// `transportation` starts at z4, where Shortbread's `pier_lines` start at z12: a pier line with no
		// zoom of its own is floored at z4. (The river line used to show this at z3; it now starts at z9 on
		// purpose, to match Shortbread — see `LINE_MINZOOM` in `layers/water.ts`.)
		const pier = style.layers.find((l) => l.id === 'water-pier') as { minzoom?: number };
		expect(pier.minzoom).toBe(4);
	});

	it('reads OpenMapTiles’ own name-field convention', () => {
		const ctx = buildContext(resolveOmt({ text: { language: 'de' } }));
		expect(ctx.nameField).toEqual(['coalesce', ['get', 'name:de'], ['get', 'name_de'], ['get', 'name']]);
		// Strict drops the local-name fallback but keeps both spellings of the requested language.
		const strict = buildContext(resolveOmt({ text: { language: 'de', languageStrict: true } }));
		expect(strict.nameField).toEqual(['coalesce', ['get', 'name:de'], ['get', 'name_de']]);
	});
});

describe('mixed-geometry source-layers', () => {
	// `aeroway` carries lines and polygons under one class (`runway` as both), and a MapLibre line layer
	// paints the boundary of a polygon. Shortbread never had to think about this — it separates `streets`
	// from `street_polygons` — so the guard is stated here rather than left to a code comment: every
	// layer reading a mixed-geometry source-layer must say which geometry it wants.
	const MIXED = new Set(['aeroway', 'transportation']);

	it('every layer reading one filters on geometry-type', () => {
		const offenders = style.layers
			.filter((l) => MIXED.has((l as { 'source-layer'?: string })['source-layer'] ?? ''))
			.filter((l) => !JSON.stringify((l as { filter?: unknown }).filter ?? null).includes('geometry-type'))
			.map((l) => l.id);
		expect(offenders, 'layers that would paint the wrong geometry').toEqual([]);
	});

	it('draws runway areas as fills and runway centrelines as lines', () => {
		const byId = new Map(style.layers.map((l) => [l.id, l as { type: string; filter?: unknown }]));
		expect(JSON.stringify(byId.get('airport-area')!.filter)).toContain('Polygon');
		expect(byId.get('airport-area')!.type).toBe('fill');
		expect(JSON.stringify(byId.get('airport-runway')!.filter)).toContain('LineString');
		expect(byId.get('airport-runway')!.type).toBe('line');
	});
});

describe('group tagging', () => {
	// §8.1's primary divergence guard, in its cheapest form: the option vocabulary is schema-neutral, so
	// both schemas must tag every data layer with a group that resolves against the *same* option tree. A
	// group a schema cannot express should be an option that is absent — never one that silently does
	// nothing (risk 3), and never an untagged layer a caller cannot hide at all.
	const tagged = [...omtLayers(buildContext(resolveOmt()))];

	it('tags every layer that reads tile data', () => {
		const untagged = tagged.filter((t) => !t.group && t.layer.type !== 'background').map((t) => t.layer.id);
		expect(untagged, 'layers no `layers:` option can control').toEqual([]);
	});

	it('tags only groups that resolve to a leaf of the resolved option tree', () => {
		const resolved = resolveLayerGroups(undefined) as Record<string, unknown>;
		const leafAt = (path: string) =>
			path
				.split('.')
				.reduce<unknown>(
					(node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
					resolved
				);
		const unresolved = [...new Set(tagged.map((t) => t.group).filter(Boolean) as string[])]
			.filter((group) => leafAt(group) === undefined)
			.sort();
		expect(unresolved, 'group tags that match no option').toEqual([]);
	});

	it('names the groups the ported modules claim, and no others', () => {
		expect([...new Set(tagged.map((t) => t.group).filter(Boolean) as string[])].sort()).toEqual([
			'airport',
			'boundaries.country',
			'boundaries.state',
			'buildings',
			'labels.addresses',
			'labels.countries',
			'labels.places',
			'labels.states',
			'labels.streets',
			'labels.water',
			'land.agriculture',
			'land.forest',
			'land.glacier',
			'land.rock',
			'land.sand',
			'land.urban',
			'land.vegetation',
			'land.wetland',
			'markings',
			'pois',
			'roads.footway',
			'roads.highways',
			'roads.motorways',
			'roads.paths',
			'roads.steps',
			'roads.streets.bus',
			'roads.streets.pedestrian',
			'roads.streets.residential',
			'roads.streets.service',
			'roads.streets.track',
			'sites',
			'transit.aerialways',
			'transit.ferries',
			'transit.rail',
			'transit.stops',
			'water.lakes',
			'water.ocean',
			'water.piers',
			'water.rivers',
		]);
	});
});

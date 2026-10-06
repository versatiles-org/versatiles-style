import { describe, expect, it } from 'vitest';
import { osm } from '../api/osm.js';
import { omt } from '../omt/api.js';
import { protomaps } from '../protomaps/api.js';
import { SHORTBREAD_SCHEMA } from '../shortbread/schema.js';
import { OMT_SCHEMA } from '../omt/schema.js';
import { PROTOMAPS_SCHEMA } from '../protomaps/schema.js';
import { MAPBOX_LAYERS } from './mapbox-layers.js';
import type { SchemaName } from '../api/index.js';
import type { StyleSpecification } from '../types/index.js';
import { readProbe } from './evaluate.js';
import { PROBES } from './probes.js';

// The probe tables are hand-written claims about three schemas. These tests hold them to the package's
// own builders, which were written against real tiles: a probe feature the package's `omt()` does not
// draw is a mistake in the table, not a difference of cartography.

/** The schemas the package has a builder for. Mapbox tiles are recognised, not built (issue #137). */
type BuiltSchema = Exclude<SchemaName, 'mapbox'>;

const BUILDERS: Record<BuiltSchema, { style: StyleSpecification; source: string }> = {
	shortbread: { style: osm(), source: 'versatiles-shortbread' },
	openmaptiles: { style: omt(), source: 'openmaptiles' },
	protomaps: { style: protomaps({ urls: { protomaps: 'https://example.org/tiles.json' } }), source: 'protomaps' },
};

const RECORDS: Record<SchemaName, Readonly<Record<string, { fields: readonly string[] }>>> = {
	shortbread: SHORTBREAD_SCHEMA,
	openmaptiles: OMT_SCHEMA,
	protomaps: PROTOMAPS_SCHEMA,
	// kept by hand, not vendored — see its header
	mapbox: MAPBOX_LAYERS,
};

const cases = PROBES.flatMap((probe) =>
	(Object.keys(probe.features) as SchemaName[]).map((schema) => [probe.id, schema, probe] as const)
);
/** The cases a builder of the package can be asked about. */
const built = cases.filter((c): c is readonly [string, BuiltSchema, (typeof PROBES)[number]] => c[1] !== 'mapbox');

describe('probe features', () => {
	it('probe ids are unique', () => {
		expect(new Set(PROBES.map((p) => p.id)).size).toBe(PROBES.length);
	});

	it.each(built)('%s (%s) is drawn by the layer of that id in the package style', (_, schema, probe) => {
		const { style, source } = BUILDERS[schema];
		const reading = readProbe(style, new Map([[source, schema]]), probe);
		expect(reading, 'the builder draws nothing for this feature').toBeDefined();
		const expected = probe.features[schema]!.map((f) => f.layer ?? probe.id);
		expect(expected).toContain(reading!.layers[0]);
	});

	it.each(cases)('%s (%s) reads source-layers and fields the tiles carry', (_, schema, probe) => {
		for (const feature of probe.features[schema]!) {
			const layer = RECORDS[schema][feature.sourceLayer];
			expect(layer, `unknown source-layer "${feature.sourceLayer}"`).toBeDefined();
			const unknown = Object.keys(feature.props).filter((field) => !layer.fields.includes(field) && field !== 'name');
			expect(unknown, 'fields the tiles do not carry').toEqual([]);
		}
	});

	it('names a Mapbox feature for nearly every probe, and variants in the tiles too', () => {
		const without = PROBES.filter((p) => !p.features.mapbox).map((p) => p.id);
		// Mapbox's tiles have no landfill, military area, prison or construction site of their own
		expect(without).toEqual(['background', 'land-waste', 'site-dangerarea', 'site-prison', 'site-construction']);
		for (const probe of PROBES) {
			for (const feature of probe.variants?.mapbox ?? []) {
				expect(MAPBOX_LAYERS[feature.sourceLayer], `${probe.id}: ${feature.sourceLayer}`).toBeDefined();
			}
		}
	});

	it('every Shortbread probe is drawn by osm()', () => {
		const schemas = new Map([['versatiles-shortbread', 'shortbread' as const]]);
		const undrawn = PROBES.filter((p) => !readProbe(osm(), schemas, p)).map((p) => p.id);
		expect(undrawn).toEqual([]);
	});
});

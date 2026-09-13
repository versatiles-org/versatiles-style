import { describe, expect, it } from 'vitest';
import { osm } from '../api/osm.js';
import { omt } from '../omt/api.js';
import { protomaps } from '../protomaps/api.js';
import { SHORTBREAD_SCHEMA } from '../shortbread/schema.js';
import { OMT_SCHEMA } from '../omt/schema.js';
import { PROTOMAPS_SCHEMA } from '../protomaps/schema.js';
import type { SchemaName } from '../lib/schema-signatures.js';
import type { StyleSpecification } from '../types/index.js';
import { readProbe } from './evaluate.js';
import { PROBES } from './probes.js';

// The probe tables are hand-written claims about three schemas. These tests hold them to the package's
// own builders, which were written against real tiles: a probe feature the package's `omt()` does not
// draw is a mistake in the table, not a difference of cartography.

const BUILDERS: Record<SchemaName, { style: StyleSpecification; source: string }> = {
	shortbread: { style: osm(), source: 'versatiles-shortbread' },
	openmaptiles: { style: omt(), source: 'openmaptiles' },
	protomaps: { style: protomaps({ urls: { protomaps: 'https://example.org/tiles.json' } }), source: 'protomaps' },
};

const RECORDS: Record<SchemaName, Readonly<Record<string, { fields: readonly string[] }>>> = {
	shortbread: SHORTBREAD_SCHEMA,
	openmaptiles: OMT_SCHEMA,
	protomaps: PROTOMAPS_SCHEMA,
};

const cases = PROBES.flatMap((probe) =>
	(Object.keys(probe.features) as SchemaName[]).map((schema) => [probe.id, schema, probe] as const)
);

describe('probe features', () => {
	it('probe ids are unique', () => {
		expect(new Set(PROBES.map((p) => p.id)).size).toBe(PROBES.length);
	});

	it.each(cases)('%s (%s) is drawn by the layer of that id in the package style', (_, schema, probe) => {
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

	it('every Shortbread probe is drawn by osm()', () => {
		const schemas = new Map([['versatiles-shortbread', 'shortbread' as const]]);
		const undrawn = PROBES.filter((p) => !readProbe(osm(), schemas, p)).map((p) => p.id);
		expect(undrawn).toEqual([]);
	});
});

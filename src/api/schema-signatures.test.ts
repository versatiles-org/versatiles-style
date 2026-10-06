import { describe, expect, it } from 'vitest';
import { SCHEMA_NAMES, SCHEMA_SIGNATURES, type SchemaName } from './schema-signatures.js';
import { SHORTBREAD_SCHEMA } from '../shortbread/schema.js';
import { OMT_SCHEMA } from '../omt/schema.js';
import { PROTOMAPS_SCHEMA } from '../protomaps/schema.js';
import { MAPBOX_LAYERS } from '../migrate/mapbox-layers.js';

// The signature table is a hand-kept copy of three vendored records (see its header for why), and of
// the hand-kept list of Mapbox's layers. These tests are what make that copy safe: re-vendoring a schema
// that adds, drops or renames a source-layer or a distinguishing field fails here, not as a tileset
// that silently stops being recognised.

const RECORDS: Record<SchemaName, Readonly<Record<string, { fields: readonly string[] }>>> = {
	shortbread: SHORTBREAD_SCHEMA,
	openmaptiles: OMT_SCHEMA,
	protomaps: PROTOMAPS_SCHEMA,
	mapbox: MAPBOX_LAYERS,
};

/** The other schemas that use this source-layer id. */
const sharers = (schema: SchemaName, id: string): SchemaName[] =>
	SCHEMA_NAMES.filter((other) => other !== schema && id in RECORDS[other]);

describe.each(SCHEMA_NAMES)('%s signature', (schema) => {
	const signature = SCHEMA_SIGNATURES[schema];
	const record = RECORDS[schema];

	it('lists exactly the vendored source-layers', () => {
		expect(Object.keys(signature).sort()).toEqual(Object.keys(record).sort());
	});

	/** Fields of `id` that this schema carries and at least one schema sharing the id does not. */
	const telling = (id: string): string[] =>
		record[id].fields.filter(
			(field) => !/^name/.test(field) && sharers(schema, id).some((other) => !RECORDS[other][id].fields.includes(field))
		);

	it('names distinguishing fields for the ids another schema shares, and for no others', () => {
		for (const [id, fields] of Object.entries(signature)) {
			// a shared id with nothing to tell it by — Mapbox's `water` carries no fields at all — is left
			// to the ids around it
			expect(fields.length > 0, `${schema}.${id}`).toBe(sharers(schema, id).length > 0 && telling(id).length > 0);
		}
	});

	it('names only fields this schema carries, each of which some sharing schema does not', () => {
		for (const [id, fields] of Object.entries(signature)) {
			for (const field of fields) expect(telling(id), `${schema}.${id}`).toContain(field);
		}
	});
});

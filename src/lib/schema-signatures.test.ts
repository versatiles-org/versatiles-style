import { describe, expect, it } from 'vitest';
import { SCHEMA_NAMES, SCHEMA_SIGNATURES, type SchemaName } from './schema-signatures.js';
import { SHORTBREAD_SCHEMA } from '../shortbread/schema.js';
import { OMT_SCHEMA } from '../omt/schema.js';
import { PROTOMAPS_SCHEMA } from '../protomaps/schema.js';

// The signature table is a hand-kept copy of three vendored records (see its header for why). These
// tests are what make that copy safe: re-vendoring a schema that adds, drops or renames a source-layer or
// a distinguishing field fails here, not as a tileset that silently stops being recognised.

const RECORDS: Record<SchemaName, Readonly<Record<string, { fields: readonly string[] }>>> = {
	shortbread: SHORTBREAD_SCHEMA,
	openmaptiles: OMT_SCHEMA,
	protomaps: PROTOMAPS_SCHEMA,
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

	it('names distinguishing fields for, and only for, the ids another schema shares', () => {
		for (const [id, fields] of Object.entries(signature)) {
			expect(fields.length > 0, `${schema}.${id}`).toBe(sharers(schema, id).length > 0);
		}
	});

	it('names only fields this schema carries and no sharing schema does', () => {
		for (const [id, fields] of Object.entries(signature)) {
			for (const field of fields) {
				expect(record[id].fields, `${schema}.${id}`).toContain(field);
				for (const other of sharers(schema, id)) {
					expect(RECORDS[other][id].fields, `${schema}.${id} vs ${other}`).not.toContain(field);
				}
			}
		}
	});
});

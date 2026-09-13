import { describe, expect, it } from 'vitest';
import { guessSchema, type SchemaGuess } from './guessSchema.js';
import type { TileJSONSpecification } from '../types/index.js';
import { SHORTBREAD_SCHEMA } from '../shortbread/schema.js';
import { OMT_SCHEMA } from '../omt/schema.js';
import { PROTOMAPS_SCHEMA } from '../protomaps/schema.js';

type SchemaRecord = Readonly<Record<string, { fields: readonly string[] }>>;
type LayerInput = string | { id: string; fields: string[] };

/** A vector TileJSON; a layer given by name alone has no `fields`. */
function vector(layers: LayerInput[]): TileJSONSpecification {
	return {
		tilejson: '3.0.0',
		tiles: ['https://example.org/{z}/{x}/{y}.pbf'],
		vector_layers: layers.map((layer) =>
			typeof layer === 'string'
				? { id: layer, fields: {} }
				: { id: layer.id, fields: Object.fromEntries(layer.fields.map((f) => [f, 'String' as const])) }
		),
	};
}

/** The `vector_layers` a tileset of this schema publishes, fields included, as vendored. */
const published = (record: SchemaRecord, withFields = true): TileJSONSpecification =>
	vector(Object.entries(record).map(([id, { fields }]) => (withFields ? { id, fields: [...fields] } : id)));

const schemaOf = (tileJSON: unknown) => {
	const guess = guessSchema(tileJSON as TileJSONSpecification);
	return guess.type === 'vector' ? guess.schema : guess.type;
};

describe('guessSchema() — complete tilesets', () => {
	it.each([
		['shortbread', SHORTBREAD_SCHEMA],
		['openmaptiles', OMT_SCHEMA],
		['protomaps', PROTOMAPS_SCHEMA],
	] as const)('recognises %s, with and without fields', (schema, record) => {
		expect(schemaOf(published(record))).toBe(schema);
		expect(schemaOf(published(record, false))).toBe(schema);
	});

	it('scores every schema, best first, and explains the winner', () => {
		const guess = guessSchema(published(PROTOMAPS_SCHEMA)) as Extract<SchemaGuess, { type: 'vector' }>;
		expect(guess.candidates.map((c) => c.schema)).toEqual(['protomaps', 'shortbread', 'openmaptiles']);
		const [protomaps, shortbread] = guess.candidates;
		expect(protomaps).toMatchObject({ score: 1, missing: [], extra: [] });
		// With fields, `boundaries`, `buildings` and `pois` are recognisably not Shortbread's.
		expect(shortbread).toMatchObject({ score: 0, matched: [] });
	});
});

describe('guessSchema() — ids two schemas share', () => {
	it('counts a shared id for every schema that uses it when the layer carries no telling fields', () => {
		const guess = guessSchema(vector(['boundaries', 'buildings', 'pois'])) as Extract<SchemaGuess, { type: 'vector' }>;
		expect(guess.candidates.slice(0, 2).map((c) => [c.schema, c.score])).toEqual([
			['shortbread', 1],
			['protomaps', 1],
		]);
		// A tie is not a guess.
		expect(guess.schema).toBeUndefined();
	});

	it('decides a shared id by its fields', () => {
		const shortbread = vector([
			{ id: 'boundaries', fields: ['admin_level', 'maritime'] },
			{ id: 'pois', fields: ['amenity', 'name'] },
		]);
		const protomaps = vector([
			{ id: 'boundaries', fields: ['kind', 'kind_detail'] },
			{ id: 'pois', fields: ['kind', 'name'] },
		]);
		expect(schemaOf(shortbread)).toBe('shortbread');
		expect(schemaOf(protomaps)).toBe('protomaps');
	});

	it('does not let a generic field like `name` decide', () => {
		expect(schemaOf(vector([{ id: 'pois', fields: ['name'] }]))).toBeUndefined();
	});

	it('tells OpenMapTiles from Protomaps by `class` against `kind`', () => {
		const layers = (field: string) => ['landcover', 'landuse', 'water'].map((id) => ({ id, fields: [field] }));
		expect(schemaOf(vector(layers('class')))).toBe('openmaptiles');
		expect(schemaOf(vector(layers('kind')))).toBe('protomaps');
	});

	it('lets the unshared ids around a shared one decide, when fields do not', () => {
		expect(schemaOf(vector(['streets', 'water_polygons', 'buildings', 'land']))).toBe('shortbread');
		expect(schemaOf(vector(['roads', 'earth', 'buildings', 'water']))).toBe('protomaps');
	});
});

describe('guessSchema() — thresholds', () => {
	it('recognises a schema that is at least half of the tileset', () => {
		expect(schemaOf(vector(['streets', 'place_labels', 'custom_a', 'custom_b']))).toBe('shortbread');
		expect(schemaOf(vector(['streets', 'custom_a', 'custom_b']))).toBeUndefined();
	});

	it('recognises a schema carrying many extra layers of its own, by count', () => {
		const custom = Array.from({ length: 30 }, (_, i) => `custom_${i}`);
		expect(schemaOf(vector([...Object.keys(OMT_SCHEMA), ...custom]))).toBe('openmaptiles');
	});

	it('recognises nothing in a tileset of unknown layers, or of none', () => {
		expect(schemaOf(vector(['my_points', 'my_polygons']))).toBeUndefined();
		expect(schemaOf(vector([]))).toBeUndefined();
	});
});

describe('guessSchema() — other input', () => {
	it('reports raster tiles as raster', () => {
		expect(guessSchema({ tilejson: '3.0.0', tiles: ['https://example.org/{z}/{x}/{y}.png'] })).toEqual({
			type: 'raster',
		});
	});

	it('ignores `name` and `attribution`', () => {
		const tileJSON = { ...vector(['my_layer']), name: 'OpenMapTiles', attribution: '© OpenMapTiles © Protomaps' };
		expect(schemaOf(tileJSON)).toBeUndefined();
	});

	it('reports anything that is not a TileJSON as unknown, and never throws', () => {
		for (const input of [null, undefined, 'tiles.json', 42, [], {}, { vector_layers: 'nope' }]) {
			expect(guessSchema(input as never)).toEqual({ type: 'unknown' });
		}
	});

	it('skips malformed and repeated vector_layers entries', () => {
		const tileJSON = {
			tiles: [],
			vector_layers: [null, 7, { fields: {} }, 'streets', { id: 'streets' }, { id: 'streets' }],
		};
		const guess = guessSchema(tileJSON as never) as Extract<SchemaGuess, { type: 'vector' }>;
		expect(guess.schema).toBe('shortbread');
		expect(guess.candidates[0].matched).toEqual(['streets']);
	});

	it('does not modify the object it is given', () => {
		const tileJSON = published(SHORTBREAD_SCHEMA);
		const before = JSON.stringify(tileJSON);
		guessSchema(tileJSON);
		expect(JSON.stringify(tileJSON)).toBe(before);
	});
});

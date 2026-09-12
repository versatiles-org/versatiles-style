import { describe, expect, it } from 'vitest';
import { auditSchema, auditGroupBinding, fieldsIn, schemaUsage, type SchemaRecord } from './schema-audit.js';
import type { StyleSpecification } from '../types/index.js';

// The audit is what every schema's conformance test is built on, so its own failure modes have to be
// pinned down: a silent mis-classification here would make a dirty style look clean.

const SCHEMA: SchemaRecord = {
	land: { minzoom: 0, maxzoom: 14, fields: ['kind'] },
	streets: { minzoom: 4, maxzoom: 14, fields: ['kind', 'oneway'] },
	labels: { minzoom: 2, maxzoom: 14, fields: ['name', 'name_de'] },
	unused: { minzoom: 0, maxzoom: 14, fields: [] },
};

function style(layers: unknown[]): StyleSpecification {
	return { version: 8, sources: {}, layers } as unknown as StyleSpecification;
}

describe('fieldsIn', () => {
	it('finds every ["get", field] at any depth', () => {
		const expr = ['case', ['==', ['get', 'kind'], 'x'], ['get', 'a'], ['coalesce', ['get', 'b'], 'y']];
		expect([...fieldsIn(expr)].sort()).toEqual(['a', 'b', 'kind']);
	});

	it('ignores a get with a non-string key and non-array values', () => {
		expect([...fieldsIn(['get', 7])]).toEqual([]);
		expect([...fieldsIn('get')]).toEqual([]);
		expect([...fieldsIn(undefined)]).toEqual([]);
	});
});

describe('schemaUsage', () => {
	it('collects fields from filter, paint and layout, keyed by source-layer', () => {
		const usage = schemaUsage(
			style([
				{ id: 'a', type: 'line', 'source-layer': 'streets', filter: ['==', ['get', 'kind'], 'x'] },
				{ id: 'b', type: 'line', 'source-layer': 'streets', paint: { 'line-width': ['get', 'oneway'] } },
				{ id: 'c', type: 'symbol', 'source-layer': 'labels', layout: { 'text-field': ['get', 'name'] } },
			])
		);
		expect([...usage.keys()].sort()).toEqual(['labels', 'streets']);
		expect([...usage.get('streets')!].sort()).toEqual(['kind', 'oneway']);
		expect([...usage.get('labels')!]).toEqual(['name']);
	});

	it('skips layers with no source-layer — a background reads no data', () => {
		expect(schemaUsage(style([{ id: 'bg', type: 'background' }])).size).toBe(0);
	});
});

describe('auditSchema', () => {
	it('reports a clean style as clean', () => {
		const audit = auditSchema(
			style([
				{ id: 'land', type: 'fill', 'source-layer': 'land', filter: ['==', ['get', 'kind'], 'forest'] },
				{ id: 'street', type: 'line', 'source-layer': 'streets', minzoom: 4 },
				{ id: 'label', type: 'symbol', 'source-layer': 'labels', minzoom: 2 },
				{ id: 'other', type: 'fill', 'source-layer': 'unused' },
			]),
			SCHEMA
		);
		expect(audit.unknownSourceLayers).toEqual([]);
		expect(audit.unknownFields).toEqual([]);
		expect(audit.missingLanguageFields).toEqual([]);
		expect(audit.drawnBeforeData).toEqual([]);
		expect(audit.unrendered).toEqual([]);
	});

	it('names a source-layer the tiles do not have, without also listing its fields', () => {
		const audit = auditSchema(
			style([{ id: 'x', type: 'fill', 'source-layer': 'ghost', filter: ['==', ['get', 'whatever'], 1] }]),
			SCHEMA
		);
		expect(audit.unknownSourceLayers).toEqual(['ghost']);
		// One missing source-layer must not bury the report under every field read from it.
		expect(audit.unknownFields).toEqual([]);
	});

	it('separates a silently-failing field read from a missing translation', () => {
		const audit = auditSchema(
			style([
				{ id: 'a', type: 'line', 'source-layer': 'streets', minzoom: 4, filter: ['==', ['get', 'station'], 1] },
				{
					id: 'b',
					type: 'symbol',
					'source-layer': 'labels',
					minzoom: 2,
					layout: { 'text-field': ['coalesce', ['get', 'name_xx'], ['get', 'name:de'], ['get', 'name_de']] },
				},
			]),
			SCHEMA
		);
		expect(audit.unknownFields).toEqual(['streets.station']);
		// Both naming conventions count as language fields; `name_de` exists, so it is not reported.
		// Re-sorted by code-unit order: the audit sorts for human readability with `localeCompare`,
		// which orders `name_xx` before `name:de` and is ICU-dependent — not something to pin down here.
		expect([...audit.missingLanguageFields].sort()).toEqual(['labels.name:de', 'labels.name_xx']);
	});

	it('catches a layer drawn before its data exists, and an absent minzoom as z0', () => {
		const audit = auditSchema(
			style([
				{ id: 'early', type: 'line', 'source-layer': 'streets', minzoom: 2 },
				{ id: 'zeroed', type: 'symbol', 'source-layer': 'labels' },
				{ id: 'fine', type: 'fill', 'source-layer': 'land' },
			]),
			SCHEMA
		);
		expect(audit.drawnBeforeData).toEqual([
			'early: minzoom 2 but streets starts at z4',
			'zeroed: minzoom 0 but labels starts at z2',
		]);
	});

	it('lists source-layers the tiles carry that nothing reads', () => {
		const audit = auditSchema(style([{ id: 'land', type: 'fill', 'source-layer': 'land' }]), SCHEMA);
		expect(audit.unrendered).toEqual(['labels', 'streets', 'unused']);
	});
});

describe('auditGroupBinding', () => {
	const built = style([
		{ id: 'land-forest', type: 'fill', 'source-layer': 'land' },
		{ id: 'street-main', type: 'line', 'source-layer': 'streets' },
		{ id: 'street-ghost', type: 'line', 'source-layer': 'ghost' },
		{ id: 'slot', type: 'background' },
	]);
	const groups = {
		land: ['land-forest'],
		roads: { main: ['street-main', 'street-ghost'] },
		slots: ['slot'],
		absent: ['never-emitted'],
	};

	it('reports per-group binding against the schema, walking nested groups', () => {
		const bindings = auditGroupBinding(built, SCHEMA, groups);
		expect(bindings.map((b) => b.group)).toEqual(['absent', 'land', 'roads.main', 'slots']);
		expect(bindings.find((b) => b.group === 'land')).toEqual({ group: 'land', dataLayers: 1, bound: 1, missing: [] });
		expect(bindings.find((b) => b.group === 'roads.main')).toEqual({
			group: 'roads.main',
			dataLayers: 2,
			bound: 1,
			missing: ['ghost'],
		});
	});

	it('counts neither a style-only layer nor a layer the style never emitted', () => {
		const bindings = auditGroupBinding(built, SCHEMA, groups);
		// A background carries no data, so it is neither bound nor unbound.
		expect(bindings.find((b) => b.group === 'slots')).toEqual({ group: 'slots', dataLayers: 0, bound: 0, missing: [] });
		// A layer the options hid is no evidence either way.
		expect(bindings.find((b) => b.group === 'absent')).toEqual({
			group: 'absent',
			dataLayers: 0,
			bound: 0,
			missing: [],
		});
	});
});

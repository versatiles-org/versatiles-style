import { describe, expect, it } from 'vitest';
import type { VectorLayer } from './vector_layer.js';
import { assertVectorLayer, assertVectorLayers, isVectorLayer, isVectorLayers } from './vector_layer.js';

describe('assertVectorLayer', () => {
	it('should validate a correct VectorLayer object', () => {
		const validLayer: VectorLayer = { id: 'test-layer', fields: { field1: 'Number', field2: 'String' } };

		expect(() => assertVectorLayer(validLayer)).not.toThrow();
	});

	it('should throw an error for non-object inputs', () => {
		verifyError(null, 'Layer must be a non-null object');
		verifyError(42, 'Layer must be a non-null object');
	});

	it('should throw an error for invalid id types', () => {
		verifyError({ id: 123, fields: {} }, 'Layer.id must be a string');
	});

	it('should throw an error for invalid fields', () => {
		verifyError({ id: 'test', fields: null }, 'Layer.fields must be a non-null object');
		verifyError(
			{ id: 'test', fields: { field1: 'InvalidType' } },
			"Layer.fields values must be one of 'Boolean', 'Number', or 'String'"
		);
	});

	it('should throw an error for invalid optional properties', () => {
		verifyError({ id: 'test', fields: {}, description: 123 }, 'Layer.description must be a string if present');
		verifyError({ id: 'test', fields: {}, minzoom: -1 }, 'Layer.minzoom must be a non-negative number if present');
		verifyError({ id: 'test', fields: {}, maxzoom: 'high' }, 'Layer.maxzoom must be a non-negative number if present');
		verifyError({ id: 'test', fields: {}, maxzoom: -1 }, 'Layer.maxzoom must be a non-negative number if present');
	});

	function verifyError(layer: unknown, message: string): void {
		expect(() => assertVectorLayer(layer)).toThrow(message);
	}
});

describe('assertVectorLayers', () => {
	it('should validate an array of correct VectorLayer objects', () => {
		const validLayers = [
			{ id: 'layer1', fields: { field1: 'Number' } },
			{ id: 'layer2', fields: { field2: 'String' }, description: 'A test layer' },
		];

		expect(() => assertVectorLayers(validLayers)).not.toThrow();
	});

	it('should throw an error for non-array inputs', () => {
		expect(() => assertVectorLayers(null)).toThrow('Expected an array of layers');
		expect(() => assertVectorLayers({})).toThrow('Expected an array of layers');
	});

	it('should throw an error for empty arrays', () => {
		expect(() => assertVectorLayers([])).toThrow('Array of layers cannot be empty');
	});

	it('should throw an error for arrays containing invalid layers', () => {
		const invalidLayers = [
			{ id: 'layer1', fields: { field1: 'Number' } },
			{ id: 'layer2', fields: { field2: 'InvalidType' } },
		];

		expect(() => assertVectorLayers(invalidLayers)).toThrow('Layer[1] is invalid');
	});

	it('names the offending layer but keeps the underlying reason as the cause', () => {
		const error = (() => {
			try {
				assertVectorLayers([{ id: 'ok', fields: {} }, { id: 7 }]);
			} catch (e) {
				return e as Error;
			}
		})();
		expect(error?.message).toBe('Layer[1] is invalid');
		expect((error?.cause as Error | undefined)?.message).toBe('Layer.id must be a string');
	});
});

// These two carried a `layer is VectorLayer` signature while throwing for every invalid input, so
// `if (isVectorLayer(x)) {…} else {…}` blew up instead of taking the else branch — the same defect
// `assertTileJSONSpecification` was split out of. They now answer the question their signature asks.
describe('the boolean guards never throw', () => {
	it('isVectorLayer returns false rather than throwing', () => {
		expect(isVectorLayer({ id: 'test', fields: { field1: 'Number' } })).toBe(true);
		for (const bad of [null, 42, {}, { id: 123, fields: {} }, { id: 'x', fields: { a: 'Nope' } }]) {
			expect(() => isVectorLayer(bad)).not.toThrow();
			expect(isVectorLayer(bad)).toBe(false);
		}
	});

	it('isVectorLayers returns false rather than throwing', () => {
		expect(isVectorLayers([{ id: 'layer1', fields: { field1: 'Number' } }])).toBe(true);
		for (const bad of [null, {}, [], [{ id: 'a', fields: { f: 'InvalidType' } }]]) {
			expect(() => isVectorLayers(bad)).not.toThrow();
			expect(isVectorLayers(bad)).toBe(false);
		}
	});

	it('branches, which is the whole point', () => {
		const seen: string[] = [];
		for (const input of [{ id: 'good', fields: {} }, 'rubbish']) {
			if (isVectorLayer(input)) seen.push('then');
			else seen.push('else');
		}
		expect(seen).toEqual(['then', 'else']);
	});
});

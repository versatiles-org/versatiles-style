import type { VectorLayer } from './vector_layer';
import { isVectorLayer, isVectorLayers } from './vector_layer';

describe('isVectorLayer', () => {
	it('should validate a correct VectorLayer object', () => {
		const validLayer: VectorLayer = { id: 'test-layer', fields: { field1: 'Number', field2: 'String' } };

		expect(() => isVectorLayer(validLayer)).not.toThrow();
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
		verifyError({ id: 'test', fields: { field1: 'InvalidType' } }, 'Layer.fields values must be one of \'Boolean\', \'Number\', or \'String\'');
	});

	it('should throw an error for invalid optional properties', () => {
		verifyError({ id: 'test', fields: {}, description: 123 }, 'Layer.description must be a string if present');
		verifyError({ id: 'test', fields: {}, minzoom: -1 }, 'Layer.minzoom must be a non-negative number if present');
		verifyError({ id: 'test', fields: {}, maxzoom: 'high' }, 'Layer.maxzoom must be a non-negative number if present');
		verifyError({ id: 'test', fields: {}, maxzoom: -1 }, 'Layer.maxzoom must be a non-negative number if present');
	});

	function verifyError(layer: unknown, message: string): void {
		expect(() => isVectorLayer(layer)).toThrow(message);
	}
});

describe('isVectorLayers', () => {
	it('should validate an array of correct VectorLayer objects', () => {
		const validLayers = [
			{ id: 'layer1', fields: { field1: 'Number' } },
			{ id: 'layer2', fields: { field2: 'String' }, description: 'A test layer' },
		];

		expect(() => isVectorLayers(validLayers)).not.toThrow();
	});

	it('should throw an error for non-array inputs', () => {
		expect(() => isVectorLayers(null)).toThrow('Expected an array of layers');
		expect(() => isVectorLayers({})).toThrow('Expected an array of layers');
	});

	it('should throw an error for empty arrays', () => {
		expect(() => isVectorLayers([])).toThrow('Array of layers cannot be empty');
	});

	it('should throw an error for arrays containing invalid layers', () => {
		const invalidLayers = [
			{ id: 'layer1', fields: { field1: 'Number' } },
			{ id: 'layer2', fields: { field2: 'InvalidType' } },
		];

		expect(() => isVectorLayers(invalidLayers)).toThrow(/Layer\[\d+\] at invalid:/);
	});
});

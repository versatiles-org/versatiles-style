import { isVectorLayer } from './vector_layer';

describe('isVectorLayer', () => {
	it('should return true for a valid VectorLayer object', () => {
		const validLayer = {
			id: 'example-layer',
			fields: {
				property1: 'Number',
				property2: 'String',
			},
		};
		expect(isVectorLayer(validLayer)).toBe(true);
	});

	it('should throw an error for an invalid VectorLayer object', () => {
		const invalidLayer = { id: 'example-layer', fields: { property1: 'InvalidType' } };
		expect(isVectorLayer(invalidLayer)).toBe(false);
	});

	// Test for missing 'id' property
	it('should throw an error if the id property is missing', () => {
		const missingIdLayer = {
			fields: { property1: 'Number' },
		};
		expect(isVectorLayer(missingIdLayer)).toBe(false);
	});

	// Test for invalid 'fields' value types
	it('should throw an error for invalid field value types', () => {
		const invalidFieldTypeLayer = {
			id: 'layer2',
			fields: { property1: 'SomeInvalidType' },
		};
		expect(isVectorLayer(invalidFieldTypeLayer)).toBe(false);
	});

	// Test for optional properties like 'description', 'minzoom', and 'maxzoom'
	it('should return true for valid optional properties', () => {
		const layerWithOptionalProperties = {
			id: 'layer3',
			fields: { property1: 'String' },
			description: 'Optional description',
			minzoom: 0,
			maxzoom: 22,
		};
		expect(isVectorLayer(layerWithOptionalProperties)).toBe(true);
	});

	// Test for invalid 'minzoom' and 'maxzoom' values
	it('should throw an error for invalid zoom levels', () => {
		const invalidZoomLayer = {
			id: 'layer4',
			fields: { property1: 'Number' },
			minzoom: -1, // Invalid minzoom
			maxzoom: 25, // Invalid maxzoom
		};
		expect(isVectorLayer(invalidZoomLayer)).toBe(false);
	});
});


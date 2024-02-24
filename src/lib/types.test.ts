/* eslint-disable @typescript-eslint/naming-convention */
import { isTileJSONSpecification, isVectorLayer } from './types.ts';

describe('isTileJSONSpecification', () => {
	it('should return true for a valid TileJSONSpecificationRaster object', () => {
		const rasterSpec = {
			type: 'raster',
			format: 'png',
			tiles: ['http://example.com/{z}/{x}/{y}.png'],
		};
		expect(isTileJSONSpecification(rasterSpec)).toBeTruthy();
	});

	it('should throw an error for an invalid TileJSONSpecification object', () => {
		const invalidSpec = {
			type: 'vector', // Missing required 'vector_layers' property for 'vector' type
			format: 'pbf',
			tiles: ['http://example.com/{z}/{x}/{y}.pbf'],
		};
		expect(() => isTileJSONSpecification(invalidSpec)).toThrow();
	});

	// Test for valid TileJSONSpecificationVector object
	it('should return true for a valid TileJSONSpecificationVector object', () => {
		const vectorSpec = {
			type: 'vector',
			format: 'pbf',
			tiles: ['http://example.com/{z}/{x}/{y}.pbf'],
			vector_layers: [{ id: 'layer1', fields: { property1: 'Number' }, description: 'A test layer' }],
		};
		expect(isTileJSONSpecification(vectorSpec)).toBeTruthy();
	});

	// Test for missing 'tiles' property
	it('should throw an error if the tiles property is missing', () => {
		const missingTilesSpec = {
			type: 'raster',
			format: 'png',
		};
		expect(() => isTileJSONSpecification(missingTilesSpec)).toThrow('spec.tiles must be an array of strings');
	});

	// Test for invalid 'bounds' property
	it('should throw an error if the bounds property is invalid', () => {
		const invalidBoundsSpec = {
			type: 'vector',
			format: 'pbf',
			tiles: ['http://example.com/{z}/{x}/{y}.pbf'],
			bounds: [180, -90, 190, 90], // Invalid longitude
		};
		expect(() => isTileJSONSpecification(invalidBoundsSpec)).toThrow();
	});

	// Additional cases can include testing for invalid 'minzoom' and 'maxzoom' values, incorrect 'format' values for raster and vector types, etc.
});

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


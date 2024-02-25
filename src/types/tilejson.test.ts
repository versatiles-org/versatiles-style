/* eslint-disable @typescript-eslint/naming-convention */

import { isTileJSONSpecification } from './tilejson';

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
});

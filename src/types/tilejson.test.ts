 

import { isTileJSONSpecification } from './tilejson';

describe('isTileJSONSpecification', () => {
	const validVectorSpec = {
		tilejson: '3.0.0',
		type: 'vector',
		format: 'pbf',
		tiles: ['http://example.com/{z}/{x}/{y}.pbf'],
		vector_layers: [{ id: 'layer1', fields: { property1: 'Number' }, description: 'A test layer' }],
	};
	const validRasterSpec = {
		tilejson: '3.0.0',
		type: 'raster',
		format: 'png',
		tiles: ['http://example.com/{z}/{x}/{y}.png'],
	};

	it('should return true for a valid raster source', () => {
		expect(isTileJSONSpecification({ ...validRasterSpec })).toBeTruthy();
	});

	it('should return true for a valid vector source', () => {
		expect(isTileJSONSpecification({ ...validVectorSpec })).toBeTruthy();
	});

	it('should throw an error if not object', () => {
		expect(() => isTileJSONSpecification(null)).toThrow('spec must be an object');
		expect(() => isTileJSONSpecification(1)).toThrow('spec must be an object');
	});

	it('should throw an error if the tiles property is missing', () => {
		expect(() => isTileJSONSpecification({ ...validRasterSpec, tiles: undefined })).toThrow('spec.tiles must be an array of strings');
	});

	it('should throw an error if the bounds property is invalid', () => {
		[
			{ bounds: [-181, -90, 180, 90], errorMessage: 'spec.bounds[0] must be between -180 and 180' },
			{ bounds: [-180, -91, 180, 90], errorMessage: 'spec.bounds[1] must be between -90 and 90' },
			{ bounds: [-180, -90, 181, 90], errorMessage: 'spec.bounds[2] must be between -180 and 180' },
			{ bounds: [-180, -90, 180, 91], errorMessage: 'spec.bounds[3] must be between -90 and 90' },
			{ bounds: [180, -90, -180, 90], errorMessage: 'spec.bounds[0] must be smaller than spec.bounds[2]' },
			{ bounds: [-180, 90, 180, -90], errorMessage: 'spec.bounds[1] must be smaller than spec.bounds[3]' },
		].forEach(({ bounds, errorMessage }) => {
			expect(() => isTileJSONSpecification({ ...validVectorSpec, bounds })).toThrow(errorMessage);
		});
	});

	it('should throw an error if the center property is invalid', () => {
		[
			{ center: [-181, 0], errorMessage: 'spec.center[0] must be between -180 and 180' },
			{ center: [181, 0], errorMessage: 'spec.center[0] must be between -180 and 180' },
			{ center: [0, -91], errorMessage: 'spec.center[1] must be between -90 and 90' },
			{ center: [0, 91], errorMessage: 'spec.center[1] must be between -90 and 90' },
		].forEach(({ center, errorMessage }) => {
			expect(() => isTileJSONSpecification({ ...validVectorSpec, center })).toThrow(errorMessage);
		});
	});

	describe('check every property', () => {
		[
			['tiles', 'an array of strings', ['url'], 'url', [], [1], 1],
			['attribution', 'a string if present', 'valid', 1],
			['bounds', 'an array of four numbers if present', [1, 2, 3, 4], ['1', '2', '3', '4'], [1, 2, 3], [], 'invalid'],
			['center', 'an array of two numbers if present', [1, 2], ['1', '2'], [1, 2, 3], [], 'invalid'],
			['data', 'an array of strings if present', ['url'], 'url', [1], 1],
			['description', 'a string if present', 'valid', 1],
			['fillzoom', 'a positive integer if present', 5, 'invalid', -1],
			['grids', 'an array of strings if present', ['1', '2', '3', '4'], [1, 2, 3, 4], 'invalid'],
			['legend', 'a string if present', 'valid', 1],
			['maxzoom', 'a positive integer if present', 5, 'invalid', -1],
			['minzoom', 'a positive integer if present', 5, 'invalid', -1],
			['name', 'a string if present', 'valid', 1],
			['scheme', '"tms" or "xyz" if present', 'xyz', 'invalid', 1],
			['template', 'a string if present', 'valid', 1],
		].forEach(test => {
			const key = test[0] as string;
			const errorMessage = test[1] as string;
			const values = test.slice(2) as unknown[];
			it(key, () => {
				for (let i = 0; i < values.length; i++) {
					const value = values[i];
					if (i === 0) {
						expect(isTileJSONSpecification({ ...validVectorSpec, [key]: value })).toBe(true);
					} else {
						expect(() => isTileJSONSpecification({ ...validVectorSpec, [key]: value }))
							.toThrow(`spec.${key} must be ${errorMessage}`);
					}
				}
			});
		});
	});
});

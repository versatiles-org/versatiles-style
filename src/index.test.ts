import { describe, expect, it } from 'vitest';
import * as lib from './index.js';

describe('exports', () => {
	it('should export the v6 API functions', () => {
		expect(typeof lib.osm).toBe('function');
		expect(typeof lib.satellite).toBe('function');
		expect(typeof lib.guessStyle).toBe('function');
		expect(typeof lib.getStyleVariants).toBe('function');
	});

	it('should expose osm static properties', () => {
		expect(lib.osm.palettes).toStrictEqual(['colorful', 'natural', 'muted', 'gray', 'toner']);
		expect(typeof lib.osm.colors).toBe('function');
	});

	it('should export Color', () => {
		expect(typeof lib.Color).toBe('function');
		expect(typeof lib.Color.HSL).toBe('function');
		expect(typeof lib.Color.HSV).toBe('function');
		expect(typeof lib.Color.HSV.randomColor).toBe('function');
		expect(typeof lib.Color.RGB).toBe('function');
	});

	it('should export the TileJSON type guards', () => {
		expect(typeof lib.isTileJSONSpecification).toBe('function');
		expect(typeof lib.isRasterTileJSONSpecification).toBe('function');
	});

	it('the exported guards actually work', () => {
		expect(lib.isTileJSONSpecification({ tiles: ['https://t/{z}/{x}/{y}'] })).toBe(true);
		expect(lib.isRasterTileJSONSpecification({ tiles: ['https://t/{z}/{x}/{y}'] })).toBe(true);
	});
});

import { describe, expect, it } from 'vitest';
import * as lib from './index.js';

describe('exports', () => {
	it('should export the v6 API functions', () => {
		expect(typeof lib.osm).toBe('function');
		expect(typeof lib.satellite).toBe('function');
		expect(typeof lib.guessStyle).toBe('function');
		expect(typeof lib.getStyleVariants).toBe('function');
	});

	it('should export every function API_DESIGN.md documents', () => {
		expect(typeof lib.isDarkMode).toBe('function');
		expect(typeof lib.fetchTileJSON).toBe('function');
		expect(typeof lib.inlineSources).toBe('function');
	});

	it('osm() and satellite() are synchronous; guessStyle() is not', () => {
		expect(lib.osm()).not.toBeInstanceOf(Promise);
		expect(lib.satellite()).not.toBeInstanceOf(Promise);
		expect(lib.guessStyle('https://tiles.example.com/tiles.json')).toBeInstanceOf(Promise);
	});

	it('should expose osm static properties', () => {
		expect(lib.osm.palettes).toStrictEqual([
			'colorful',
			'colorful-dark',
			'natural',
			'natural-dark',
			'muted',
			'muted-dark',
			'gray',
			'gray-dark',
			'toner',
			'toner-dark',
		]);
		expect(typeof lib.osm.colors).toBe('function');
		expect(typeof lib.osm.layerGroups).toBe('object');
		expect(lib.osm.layerGroups.buildings).toContain('building');
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
		expect(typeof lib.assertTileJSONSpecification).toBe('function');
		expect(typeof lib.assertRasterTileJSONSpecification).toBe('function');
		expect(typeof lib.isRasterTileJSONSpecification).toBe('function');
	});

	it('the exported guards actually work', () => {
		expect(lib.isTileJSONSpecification({ tiles: ['https://t/{z}/{x}/{y}'] })).toBe(true);
		expect(lib.isTileJSONSpecification(null)).toBe(false);
		expect(lib.isRasterTileJSONSpecification({ tiles: ['https://t/{z}/{x}/{y}'] })).toBe(true);
	});
});

import { describe, expect, it } from 'vitest';
import * as lib from './index.js';

describe('exports', () => {
	it('should export the v6 API functions', () => {
		expect(typeof lib.osm).toBe('function');
		expect(typeof lib.satellite).toBe('function');
		expect(typeof lib.guessStyle).toBe('function');
		expect(typeof lib.guessSchema).toBe('function');
	});

	it('should export every function API_DESIGN.md documents', () => {
		expect(typeof lib.isDarkMode).toBe('function');
		expect(typeof lib.labelLanguage).toBe('function');
		expect(typeof lib.fetchTileJSON).toBe('function');
		expect(typeof lib.inlineSources).toBe('function');
		// The v5 migration table sends `HSV.randomColor` here and the changelog documents its v6
		// behaviour changes, but nothing exported it — a v5 user following the table got an import
		// error. The `hsv` space it is built on ships either way, so the bytes were already paid for.
		expect(typeof lib.randomColor).toBe('function');
	});

	it('randomColor returns a Color and is seedable', () => {
		expect(lib.randomColor({ seed: 42 })).toBeInstanceOf(lib.Color);
		expect(lib.randomColor({ seed: 42 }).asString()).toBe(lib.randomColor({ seed: 42 }).asString());
	});

	it('osm(), satellite() and guessSchema() are synchronous; guessStyle() is not', () => {
		expect(lib.osm()).not.toBeInstanceOf(Promise);
		expect(lib.satellite()).not.toBeInstanceOf(Promise);
		expect(lib.guessSchema({ tiles: [] })).not.toBeInstanceOf(Promise);
		expect(lib.guessStyle('https://tiles.example.com/tiles.json')).toBeInstanceOf(Promise);
	});

	// Every static below is a module-level object handed out by reference — `layerGroups` and
	// `textGroups` are memoized, so all callers share one. They are `readonly` in the types, which a
	// JS caller never sees, and they back validation and `minimizeOptions`: `osm.palettes.splice(0, 1)`
	// used to make `osm({ theme: 'colorful' })` throw "unknown palette" for the rest of the process.
	it('hands out frozen statics, so a caller cannot corrupt the library', () => {
		expect(Object.isFrozen(lib.osm.palettes)).toBe(true);
		expect(Object.isFrozen(lib.osm.colorKeys)).toBe(true);
		expect(Object.isFrozen(lib.osm.slots)).toBe(true);
		expect(Object.isFrozen(lib.satellite.slots)).toBe(true);
		expect(Object.isFrozen(lib.osm.layerGroups)).toBe(true);
		expect(Object.isFrozen(lib.osm.textGroups)).toBe(true);
	});

	it('freezes the group maps through their leaves, not just the top level', () => {
		const groups = lib.osm.layerGroups as Record<string, unknown>;
		expect(Object.isFrozen(groups.buildings)).toBe(true);
		// `roads` is a branch node, so its own leaves have to be frozen too.
		const roads = groups.roads as Record<string, unknown>;
		expect(Object.isFrozen(roads)).toBe(true);
		expect(Object.isFrozen(Object.values(roads)[0])).toBe(true);
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
		expect(typeof lib.Color.parse).toBe('function');
		expect(typeof lib.Color.srgb).toBe('function');
		expect(typeof lib.Color.oklch).toBe('function');
		expect(typeof lib.Color.mix).toBe('function');
		expect(typeof lib.ColorParseError).toBe('function');
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

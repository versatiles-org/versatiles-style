import { describe, expect, it } from 'vitest';
import type { VectorLayer } from './index.js';
import * as lib from './index.js';

describe('guessStyle (v6)', () => {
	const tiles = ['https://fancy.map/tiles/{z}/{x}/{y}'];
	const vector_layers: VectorLayer[] = [{ id: 'hallo', fields: { label: 'String' } }];

	it('should build a raster style with background and raster layers', () => {
		const style = lib.guessStyle({ tiles });
		expect(style.version).toBe(8);
		expect(Object.keys(style.sources)).toHaveLength(1);
		const sourceKey = Object.keys(style.sources)[0];
		expect((style.sources[sourceKey] as { type: string }).type).toBe('raster');
		const layerTypes = style.layers.map((l) => l.type);
		expect(layerTypes).toContain('raster');
	});

	it('should build an inspector style for unknown vector tiles', () => {
		const style = lib.guessStyle({ tiles, vector_layers });
		expect(style.version).toBe(8);
		expect(Object.keys(style.sources)).toHaveLength(1);
		const sourceKey = Object.keys(style.sources)[0];
		expect((style.sources[sourceKey] as { type: string }).type).toBe('vector');
		// inspector style: background + fill + line + symbol per source-layer
		const layerIds = style.layers.map((l) => l.id);
		expect(layerIds).toContain('background');
		expect(layerIds.some((id) => id.includes('hallo'))).toBe(true);
		const halloLayers = style.layers.filter((l) => (l as { 'source-layer'?: string })['source-layer'] === 'hallo');
		expect(halloLayers.map((l) => l.type).sort()).toEqual(['fill', 'line', 'symbol']);
	});

	it('should return a blank style for invalid input', () => {
		// @ts-expect-error intentional bad input
		const style = lib.guessStyle(null);
		expect(style).toStrictEqual({ version: 8, sources: {}, layers: [] });
	});
});

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
});

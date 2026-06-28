import { describe, expect, it } from 'vitest';
import { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { VectorLayer } from './index.js';
import * as lib from './index.js';

const { colorful, eclipse, graybeard, neutrino, shadow } = lib.styles;

describe('styles', () => {
	[
		{ name: 'colorful', builder: colorful },
		{ name: 'eclipse', builder: eclipse },
		{ name: 'graybeard', builder: graybeard },
		{ name: 'shadow', builder: shadow },
		{ name: 'neutrino', builder: neutrino },
	].forEach(({ name, builder }) => {
		it(`should create and test an instance of ${name}`, () => {
			expect(typeof builder).toBe('function');

			const style = builder({ baseUrl: 'https://example.org' });

			const minSize = name === 'empty' ? 4000 : 50000;
			expect(JSON.stringify(style).length).toBeGreaterThan(minSize);

			expect(style.name).toBe('versatiles-' + name);
			expect(style.glyphs).toBe('https://example.org/assets/glyphs/{fontstack}/{range}.pbf');
			expect(style.sprite).toStrictEqual([{ id: 'basics', url: 'https://example.org/assets/sprites/basics/sprites' }]);
			expect(Object.keys(style.sources).join(',')).toBe('versatiles-shortbread');

			const source = style.sources['versatiles-shortbread'] as VectorSourceSpecification;
			expect(source.tiles).toEqual(['https://example.org/tiles/osm/{z}/{x}/{y}']);
		});
	});
});

describe('Colorful', () => {
	it('should allow custom colors and baseUrl', () => {
		const style = colorful({
			baseUrl: 'https://dev.null',
			colors: { commercial: '#f00' },
		});
		expect(style.glyphs).toBe('https://dev.null/assets/glyphs/{fontstack}/{range}.pbf');
		const paint = style.layers.find((l) => l.id === 'land-commercial')?.paint;

		expect(paint).toBeDefined();
		if (paint == null) throw Error();

		expect(paint).toHaveProperty('fill-color');
		if (!('fill-color' in paint)) throw Error();

		expect(paint['fill-color']).toBe('rgb(255,0,0)');
	});
});

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
	it('should export styles', () => {
		type something = Record<string, unknown>;
		expect(typeof lib.styles).toBe('object');
		const styleNames = ['colorful', 'eclipse', 'graybeard', 'neutrino', 'shadow', 'satellite'];
		for (const name of styleNames) {
			expect(typeof (lib as something)[name]).toBe('function');
			expect(typeof (lib.styles as something)[name]).toBe('function');
		}
	});

	it('should export guessStyle', () => {
		expect(typeof lib.guessStyle).toBe('function');
	});

	it('should export Color', () => {
		expect(typeof lib.Color).toBe('function');
		expect(typeof lib.Color.HSL).toBe('function');
		expect(typeof lib.Color.HSV).toBe('function');
		expect(typeof lib.Color.HSV.randomColor).toBe('function');
		expect(typeof lib.Color.RGB).toBe('function');
	});
});

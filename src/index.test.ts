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

describe('guessStyle', () => {
	const tiles = ['https://fancy.map/tiles/{z}/{x}/{y}'];
	const vector_layers: VectorLayer[] = [{ id: 'hallo', fields: { label: 'String' } }];

	it('should build raster styles', () => {
		const style = lib.guessStyle({ tiles });
		expect(style).toStrictEqual({
			layers: [{ id: 'raster', source: 'rasterSource', type: 'raster' }],
			sources: { rasterSource: { tiles, type: 'raster' } },
			version: 8,
		});
	});

	it('should build vector styles', () => {
		const style = lib.guessStyle({ tiles, vector_layers });
		expect(style).toStrictEqual({
			layers: [
				{ id: 'background', paint: { 'background-color': '#fff' }, type: 'background' },
				{
					id: 'vectorSource-hallo-fill',
					filter: ['==', '$type', 'Polygon'],
					paint: {
						'fill-antialias': true,
						'fill-color': 'hsla(14,50%,52%,0.6)',
						'fill-opacity': 0.3,
						'fill-outline-color': 'hsla(14,50%,52%,0.6)',
					},
					source: 'vectorSource',
					'source-layer': 'hallo',
					type: 'fill',
				},
				{
					id: 'vectorSource-hallo-line',
					filter: ['==', '$type', 'LineString'],
					layout: { 'line-cap': 'round', 'line-join': 'round' },
					paint: { 'line-color': 'hsla(14,50%,52%,0.6)' },
					source: 'vectorSource',
					'source-layer': 'hallo',
					type: 'line',
				},
				{
					id: 'vectorSource-hallo-circle',
					filter: ['==', '$type', 'Point'],
					paint: { 'circle-color': 'hsla(14,50%,52%,0.6)', 'circle-radius': 2 },
					source: 'vectorSource',
					'source-layer': 'hallo',
					type: 'circle',
				},
			],
			sources: { vectorSource: { tiles, type: 'vector' } },
			version: 8,
		});
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

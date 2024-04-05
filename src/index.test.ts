/* eslint-disable @typescript-eslint/naming-convention */
import type { VectorLayer } from './index.js';
import { guessStyle, styles } from './index.js';

describe('styles', () => {
	it('should be all styles', () => {
		expect(Array.from(Object.keys(styles)).sort())
			.toStrictEqual(['colorful', 'eclipse', 'graybeard', 'neutrino']);
	});

	Object.entries(styles).forEach(([name, builder]) => {
		it(`should create and test an instance of ${name}`, () => {
			expect(typeof builder).toBe('function');

			const style = builder({ baseUrl: 'https://example.org' });
			expect(JSON.stringify(style).length).toBeGreaterThan(50000);

			expect(style.name).toBe('versatiles-' + name);
			expect(style.glyphs).toBe('https://example.org/assets/fonts/{fontstack}/{range}.pbf');
			expect(style.sprite).toBe('https://example.org/assets/sprites/sprites');
			expect(Object.keys(style.sources).join(',')).toBe('versatiles-shortbread');

			expect(style.sources['versatiles-shortbread'].tiles).toEqual(['https://example.org/tiles/osm/{z}/{x}/{y}']);
		});
	});
});

describe('Colorful', () => {
	const style = styles.colorful({
		baseUrl: 'https://dev.null',
		colors: { commercial: '#f00' },
	});
	expect(style.glyphs).toBe('https://dev.null/assets/fonts/{fontstack}/{range}.pbf');
	const paint = style.layers.find(l => l.id === 'land-commercial')?.paint;

	expect(paint).toBeDefined();
	if (paint == null) throw Error();

	expect(paint).toHaveProperty('fill-color');
	if (!('fill-color' in paint)) throw Error();

	expect(paint['fill-color']).toBe('#ff0000');
});

describe('guessStyle', () => {
	const tiles = ['https://fancy.map/tiles/{z}/{x}/{y}'];
	const vectorLayers: VectorLayer[] = [{ id: 'hallo', fields: { label: 'String' } }];

	it('should build raster styles', () => {
		const style = guessStyle({
			tiles,
			format: 'png',
		});
		expect(style).toStrictEqual({
			layers: [{ id: 'raster', source: 'rasterSource', type: 'raster' }],
			sources: { rasterSource: { format: 'png', tilejson: '3.0.0', tiles, type: 'raster' } },
			version: 8,
		});
	});

	it('should build vector styles', () => {
		const style = guessStyle({
			tiles,
			format: 'pbf',
			vectorLayers,
		});
		expect(style).toStrictEqual({
			layers: [
				{ id: 'background', paint: { 'background-color': '#fff' }, type: 'background' },
				{ id: 'vectorSource-hallo-fill', filter: ['==', '$type', 'Polygon'], paint: { 'fill-antialias': true, 'fill-color': 'hsla(14,50%,52%,0.6)', 'fill-opacity': 0.3, 'fill-outline-color': 'hsla(14,50%,52%,0.6)' }, source: 'vectorSource', 'source-layer': 'hallo', type: 'fill' },
				{ id: 'vectorSource-hallo-line', filter: ['==', '$type', 'LineString'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': 'hsla(14,50%,52%,0.6)' }, source: 'vectorSource', 'source-layer': 'hallo', type: 'line' },
				{ id: 'vectorSource-hallo-circle', filter: ['==', '$type', 'Point'], paint: { 'circle-color': 'hsla(14,50%,52%,0.6)', 'circle-radius': 2 }, source: 'vectorSource', 'source-layer': 'hallo', type: 'circle' },
			],
			sources: { vectorSource: { format: 'pbf', tilejson: '3.0.0', tiles, type: 'vector', vector_layers: vectorLayers } },
			'version': 8,
		});
	});
});

/* eslint-disable @typescript-eslint/naming-convention */
import guessStyle from './style_guesser.js';
import type { VectorLayer } from './types.ts';

describe('guessStyle', () => {
	const tiles = ['https://example.com/tiles/{z}/{x}/{y}'];

	it('should build raster styles', () => {
		const type = 'raster';
		const format = 'avif';
		expect(guessStyle({ type, tiles, format }))
			.toStrictEqual({
				version: 8,
				sources: { rasterSource: { format, tilejson: '3.0.0', tiles, type } },
				layers: [{ id: 'raster', source: 'rasterSource', type }],
			});
	});

	it('should build vector styles', () => {
		const type = 'vector';
		const format = 'pbf';
		const vector_layers: VectorLayer[] = [{ id: 'geometry', fields: { label: 'String', height: 'Number' } }];
		expect(guessStyle({ type, tiles, format, vector_layers }))
			.toStrictEqual({
				version: 8,
				sources: { vectorSource: { format, tilejson: '3.0.0', tiles, type, vector_layers } },
				layers: [
					{
						id: 'background',
						type: 'background',
						paint: { 'background-color': '#fff' },
					},
					{
						id: 'vectorSource-geometry-fill',
						type: 'fill',
						source: 'vectorSource',
						'source-layer': 'geometry',
						filter: ['==', '$type', 'Polygon'],
						paint: { 'fill-antialias': true, 'fill-color': 'hsla(7,57%,56%,0.6)', 'fill-opacity': 0.3, 'fill-outline-color': 'hsla(7,57%,56%,0.6)' },
					},
					{
						id: 'vectorSource-geometry-line',
						type: 'line',
						source: 'vectorSource',
						'source-layer': 'geometry',
						filter: ['==', '$type', 'LineString'],
						layout: { 'line-cap': 'round', 'line-join': 'round' },
						paint: { 'line-color': 'hsla(7,57%,56%,0.6)' },
					},
					{
						id: 'vectorSource-geometry-circle',
						type: 'circle',
						source: 'vectorSource',
						'source-layer': 'geometry',
						filter: ['==', '$type', 'Point'],
						paint: { 'circle-color': 'hsla(7,57%,56%,0.6)', 'circle-radius': 2 },
					},
				],
			});
	});
});

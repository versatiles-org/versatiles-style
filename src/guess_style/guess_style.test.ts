 
import type { Container, Header } from '@versatiles/container';
import { getShortbreadTemplate } from '../shortbread/index.js';
import type { TileJSONSpecificationVector, VectorLayer } from '../types/index.js';
import { guessStyle, guessStyleFromContainer } from './guess_style.js';
import type { GuessStyleOptions } from './types.js';

describe('guessStyle', () => {
	const tiles = ['https://example.com/tiles/{z}/{x}/{y}'];
	const vectorLayersSomething: VectorLayer[] = [{ id: 'geometry', fields: { label: 'String', height: 'Number' } }];
	const vectorLayersShortbread: VectorLayer[] = getShortbreadTemplate().sources['versatiles-shortbread'].vector_layers;

	it('should build raster styles', () => {
		const type = 'raster';
		const format = 'avif';
		expect(guessStyle({ tiles, format }))
			.toStrictEqual({
				version: 8,
				sources: { rasterSource: { format, tilejson: '3.0.0', tiles, type } },
				layers: [{ id: 'raster', source: 'rasterSource', type }],
			});
	});

	it('should build vector inspector styles', () => {
		const type = 'vector';
		const format = 'pbf';
		expect(guessStyle({ tiles, format, vectorLayers: vectorLayersSomething }))
			.toStrictEqual({
				version: 8,
				sources: { vectorSource: { format, tilejson: '3.0.0', tiles, type, vector_layers: vectorLayersSomething } },
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

	it('should build shortbread vector styles', () => {
		const type = 'vector';
		const format = 'pbf';
		const style = guessStyle({ tiles, format, vectorLayers: vectorLayersShortbread, baseUrl: 'http://example.com' });

		expect(style.layers.length).toBe(236);
		style.layers = [];

		expect(style).toStrictEqual({
			glyphs: 'http://example.com/assets/fonts/{fontstack}/{range}.pbf',
			metadata: {
				license: 'https://creativecommons.org/publicdomain/zero/1.0/',
				'maputnik:renderer': 'mbgljs',
			},
			name: 'versatiles-colorful',
			sprite: 'http://example.com/assets/sprites/sprites',
			layers: [],
			sources: {
				'versatiles-shortbread': {
					attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
					bounds: [-180, -85.0511287798066, 180, 85.0511287798066],
					format,
					maxzoom: 14,
					minzoom: 0,
					scheme: 'xyz',
					tilejson: '3.0.0',
					tiles,
					type,
					vector_layers: vectorLayersShortbread,
				},
			},
			version: 8,
		});
	});

	const cases: { type: string; options: GuessStyleOptions }[] = [
		{ type: 'image', options: { tiles, format: 'png' } },
		{ type: 'inspector', options: { tiles, format: 'pbf', vectorLayers: vectorLayersSomething } },
		{ type: 'shortbread', options: { tiles, format: 'pbf', vectorLayers: vectorLayersShortbread } },
	];

	describe('minzoom sets zoom', () => {
		cases.forEach(({ type, options }) => {
			it(type, () => {
				expect(guessStyle({ ...options, minzoom: 5 })).toHaveProperty('zoom', 5);
			});
		});
	});

	describe('bounds sets center', () => {
		cases.forEach(({ type, options }) => {
			it(type, () => {
				expect(guessStyle({ ...options, bounds: [1, 2, 3, 4] })).toHaveProperty('center', [2, 3]);
			});
		});
	});

	describe('center sets center', () => {
		cases.forEach(({ type, options }) => {
			it(type, () => {
				expect(guessStyle({ ...options, center: [12, 34] })).toHaveProperty('center', [12, 34]);
			});
		});
	});

	describe('center overrides bounds', () => {
		cases.forEach(({ type, options }) => {
			it(type, () => {
				expect(guessStyle({ ...options, bounds: [1, 2, 3, 4], center: [12, 34] })).toHaveProperty('center', [12, 34]);
			});
		});
	});

	describe('absolute tile urls override baseUrl', () => {
		cases.forEach(({ type, options }) => {
			it(type, () => {
				const style = guessStyle({ ...options, tiles: ['https://example1.org/tiles/{z}/{x}/{y}'], baseUrl: 'https://example2.org/' });
				 
				expect(Object.values(style.sources)[0].tiles).toEqual(['https://example1.org/tiles/{z}/{x}/{y}']);
			});
		});
	});

	describe('relative tile urls are resolved with baseUrl', () => {
		cases.forEach(({ type, options }) => {
			it(type, () => {
				const style = guessStyle({ ...options, tiles: ['./{z}/{x}/{y}'], baseUrl: 'https://example2.org/tiles/' });
				 
				expect(Object.values(style.sources)[0].tiles).toEqual(['https://example2.org/tiles/{z}/{x}/{y}']);
			});
		});
	});
});

describe('guessStyleFromContainer', () => {
	const options = { baseUrl: 'http://example.com', tiles: ['tiles/{z}/{x}/{y}'] };

	it('should handle supported tile formats correctly', async () => {
		const container = getMockedContainer();
		const style = await guessStyleFromContainer(container, options);

		expect(style).toBeDefined();
		expect(style.sources).toBeDefined();
		expect(style.layers.length).toBe(4);

		const source = style.sources.vectorSource as TileJSONSpecificationVector;
		expect(source.vector_layers).toBeDefined();
		expect(source.vector_layers.length).toBe(1);
	});

	it('should throw an error for unsupported tile formats', async () => {
		const container = getMockedContainer({ tileFormat: 'docx' });

		await expect(guessStyleFromContainer(container, options))
			.rejects
			.toThrow('format "docx" is not supported');
	});

	function getMockedContainer(opt: { tileFormat?: string } = {}): Container {
		return {
			getHeader: async (): Promise<Header> => Promise.resolve({
				tileFormat: opt.tileFormat ?? 'pbf',
			} as Header),
			getMetadata: async (): Promise<string> => Promise.resolve(JSON.stringify({
				vector_layers: [{
					id: 'id',
					fields: {},
				}],
			})),
		} as Container;
	}
});

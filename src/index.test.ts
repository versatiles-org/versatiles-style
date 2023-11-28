/* eslint-disable @typescript-eslint/naming-convention */
import * as builders from './index.js';

describe('Style Builders', () => {
	const styles = [
		{ name: 'Colorful', builder: builders.colorful },
		{ name: 'Graybeard', builder: builders.graybeard },
		{ name: 'Neutrino', builder: builders.neutrino },
	];

	styles.forEach(({ name, builder }) => {
		it(`should create and test an instance of ${name}`, () => {
			expect(typeof builder).toBe('function');

			const style = builder({ baseUrl: 'https://example.org' });
			expect(JSON.stringify(style).length).toBeGreaterThan(50000);

			expect(style.name).toBe('versatiles-' + name.toLowerCase());
			expect(style.glyphs).toBe('https://example.org/assets/fonts/{fontstack}/{range}.pbf');
			expect(style.sprite).toBe('https://example.org/assets/sprites/sprites');
			expect(Object.keys(style.sources).join(',')).toBe('versatiles-shortbread');

			expect(style.sources['versatiles-shortbread'].tiles).toEqual(['https://example.org/tiles/osm/{z}/{x}/{y}']);
		});
	});
});

describe('Colorful', () => {
	const style = builders.colorful({
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
	it('should build raster styles', () => {
		const style = builders.guessStyle({
			type: 'raster',
			tiles: [],
			format: 'avif',
		});
		expect(style).toStrictEqual({
			layers: [{ id: 'raster', source: 'rasterSource', type: 'raster' }],
			sources: { rasterSource: { format: 'avif', tilejson: '3.0.0', tiles: [], type: 'raster' } },
			version: 8,
		});
	});


	it('should build vector styles', () => {
		const style = builders.guessStyle({
			type: 'vector',
			tiles: [],
			format: 'pbf',
			vector_layers: [],
		});
		expect(style).toStrictEqual({
			layers: [{ id: 'background', paint: { 'background-color': '#fff' }, type: 'background' }],
			sources: { vectorSource: { format: 'pbf', tilejson: '3.0.0', tiles: [], type: 'vector', 'vector_layers': [] } },
			'version': 8,
		});
	});
});

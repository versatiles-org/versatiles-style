/* eslint-disable @typescript-eslint/naming-convention */
import * as builderClasses from './index.js';
import StyleBuilder from './lib/style_builder.js';

describe('Style Builders', () => {
	const styles = [
		{ name: 'Colorful', builderClass: builderClasses.Colorful },
		{ name: 'Graybeard', builderClass: builderClasses.Graybeard },
		{ name: 'Neutrino', builderClass: builderClasses.Neutrino },
	];

	styles.forEach(({ name, builderClass }) => {
		it(`should create and test an instance of ${name}`, () => {
			const builder = new builderClass();
			expect(builder).toBeInstanceOf(StyleBuilder);
			expect(typeof builder.name).toBe('string');
			expect(builder.name).toBe(name);

			builder.baseUrl = 'https://example.org';
			const style = builder.build();
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
	const colorful = new builderClasses.Colorful();
	colorful.baseUrl = 'https://dev.null';
	colorful.defaultColors.commercial = '#f00';
	const style = colorful.build();
	expect(style.glyphs).toBe('https://dev.null/assets/fonts/{fontstack}/{range}.pbf');
});

describe('guessStyle', () => {
	it('should build raster styles', () => {
		const style = builderClasses.guessStyle({
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
		const style = builderClasses.guessStyle({
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

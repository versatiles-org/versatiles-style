import { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
import { getTilesetsTemplate } from './template.js';

describe('getTilesetsTemplate', () => {
	const styleTemplate = getTilesetsTemplate();

	it('returns a style object with the correct version', () => {
		expect(styleTemplate).toHaveProperty('version', 8);
	});

	it('has the expected name for the style', () => {
		expect(styleTemplate).toHaveProperty('name', 'versatiles');
	});

	it('contains metadata with expected properties', () => {
		expect(styleTemplate).toHaveProperty('metadata');
		expect(styleTemplate.metadata).toHaveProperty('license', 'https://creativecommons.org/publicdomain/zero/1.0/');
	});

	it('specifies glyphs and sprite URLs correctly', () => {
		expect(styleTemplate).toHaveProperty('glyphs', 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf');
		expect(styleTemplate).toHaveProperty('sprite', [{ id: 'basics', url: 'https://tiles.versatiles.org/assets/sprites/basics/sprites' }]);
	});

	it('defines sources with required properties', () => {
		expect(styleTemplate).toHaveProperty('sources');
		const sources = styleTemplate.sources['versatiles-shortbread'] as VectorSourceSpecification;
		expect(sources).toHaveProperty('type', 'vector');
		expect(sources).toHaveProperty('scheme', 'xyz');
		expect(sources).toHaveProperty('tiles');
		expect(sources.tiles).toContain('https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}');
	});

	it('sets bounds to the expected global extent', () => {
		const expectedBounds = [-180, -85.0511287798066, 180, 85.0511287798066];
		expect(styleTemplate.sources['versatiles-shortbread']).toHaveProperty('bounds', expectedBounds);
	});

	it('has layers array initialized as empty', () => {
		expect(styleTemplate).toHaveProperty('layers');
		expect(styleTemplate.layers).toEqual([]);
	});
});

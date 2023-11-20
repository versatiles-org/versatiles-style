/* eslint-disable @typescript-eslint/naming-convention */

import getTemplate from './template.js';
import type { MaplibreStyle } from '../types.js';

describe('getTemplate', () => {
	const styleTemplate: MaplibreStyle = getTemplate();

	it('returns a style object with the correct version', () => {
		expect(styleTemplate).toHaveProperty('version', 8);
	});

	it('has the expected name for the style', () => {
		expect(styleTemplate).toHaveProperty('name', 'versatiles');
	});

	it('contains metadata with expected properties', () => {
		expect(styleTemplate).toHaveProperty('metadata');
		expect(styleTemplate.metadata).toHaveProperty('maputnik:renderer', 'mbgljs');
		expect(styleTemplate.metadata).toHaveProperty('license', 'https://creativecommons.org/publicdomain/zero/1.0/');
	});

	it('specifies glyphs and sprite URLs correctly', () => {
		expect(styleTemplate).toHaveProperty('glyphs', 'https://tiles.versatiles.org/fonts/{fontstack}/{range}.pbf');
		expect(styleTemplate).toHaveProperty('sprite', 'https://tiles.versatiles.org/sprites/sprites');
	});

	it('defines sources with required properties', () => {
		expect(styleTemplate).toHaveProperty('sources');
		const sources = styleTemplate.sources['versatiles-shortbread'];
		expect(sources).toHaveProperty('type', 'vector');
		expect(sources).toHaveProperty('scheme', 'xyz');
		expect(sources).toHaveProperty('format', 'pbf');
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

	describe('sources vector_layers validation', () => {

		expect(styleTemplate).toBeDefined();
		expect(styleTemplate.sources).toBeDefined();

		const { vector_layers } = styleTemplate.sources['versatiles-shortbread'];

		expect(typeof vector_layers).toBe('object');

		it('contains vector_layers with id and fields', () => {
			expect(Array.isArray(vector_layers)).toBeTruthy();
			vector_layers.forEach(layer => {
				expect(layer).toHaveProperty('id');
				expect(layer).toHaveProperty('fields');
			});
		});

		it('has maxzoom set to 14 for all vector layers', () => {
			vector_layers.forEach(layer => {
				expect(layer).toHaveProperty('maxzoom', 14);
			});
		});
	});
});

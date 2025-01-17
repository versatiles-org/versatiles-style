import { decorate } from './decorator.js';
import Color from '../color/index.ts';
import type { MaplibreLayer } from '../types/maplibre.js';
import { CachedRecolor } from './recolor.ts';

describe('decorate function', () => {
	const mockLayers: MaplibreLayer[] = [
		{ id: 'layer1', type: 'fill', layout: {}, paint: {}, source: 'versatiles-shortbread' },
		{ id: 'layer2', type: 'line', layout: {}, paint: {}, source: 'versatiles-shortbread' },
	];

	const mockRules = {
		'layer1': {
			color: '#ff0000',
			visibility: 'none',
		},
		'layer2': {
			color: 'rgba(0, 255, 0, 0.5)',
			visibility: 'visible',
		},
	};

	const noRecolor = new CachedRecolor();

	it('should return an array of layers', () => {
		const result = decorate(mockLayers, mockRules, noRecolor);
		expect(Array.isArray(result)).toBe(true);
	});

	it('should apply styles from rules to the corresponding layers', () => {
		const result = decorate(mockLayers, mockRules, noRecolor);

		result.forEach(layer => {
			if (layer.id === 'layer1') {
				expect(layer.paint).toHaveProperty('fill-color', 'rgb(255,0,0)');
				expect(layer.layout).toHaveProperty('visibility', 'none');
			}
			if (layer.id === 'layer2') {
				expect(layer.paint).toHaveProperty('line-color', 'rgba(0,255,0,0.5)');
				expect(layer.layout).toHaveProperty('visibility', 'visible');
			}
		});
	});

	it('should handle color conversion correctly', () => {
		const colorRule = {
			'layer1': {
				paintColor: Color.parse('#ff0000'),
			},
		};
		const result = decorate(mockLayers, colorRule, noRecolor);
		const layer0: MaplibreLayer = result[0];

		expect(layer0).toBeDefined();
		if (typeof layer0 === 'undefined') return;

		expect(layer0.paint).toBeDefined();
		if (typeof layer0.paint === 'undefined') return;

		expect(layer0.paint).toHaveProperty('fill-color', 'rgb(255,0,0)');
	});

	it('should discard layers that have no style rules applied', () => {
		const result = decorate(mockLayers, {}, noRecolor);
		expect(result.length).toBe(0);
	});
});

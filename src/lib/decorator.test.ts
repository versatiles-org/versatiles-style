/* eslint-disable @typescript-eslint/naming-convention */

import { decorate } from './decorator.js';
import Color from 'color';
import type { MaplibreLayer } from './shortbread/layers.js';

describe('decorate function', () => {
	const mockLayers: MaplibreLayer[] = [
		{ id: 'layer1', type: 'fill', layout: {}, paint: {} },
		{ id: 'layer2', type: 'line', layout: {}, paint: {} },
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

	it('should return an array of layers', () => {
		const result = decorate(mockLayers, mockRules);
		expect(Array.isArray(result)).toBe(true);
	});

	it('should apply styles from rules to the corresponding layers', () => {
		const result = decorate(mockLayers, mockRules);

		result.forEach(layer => {
			if (layer.id === 'layer1') {
				expect(layer.paint).toHaveProperty('fill-color', '#ff0000');
				expect(layer.layout).toHaveProperty('visibility', 'none');
			}
			if (layer.id === 'layer2') {
				expect(layer.paint).toHaveProperty('line-color', '#00ff0080');
				expect(layer.layout).toHaveProperty('visibility', 'visible');
			}
		});
	});

	it('should handle color conversion correctly', () => {
		const colorRule = {
			'layer1': {
				paintColor: new Color('#ff0000'),
			},
		};
		const result = decorate(mockLayers, colorRule);
		const layer0: MaplibreLayer = result[0];

		expect(layer0).toBeDefined();
		if (typeof layer0 === 'undefined') return;

		expect(layer0.paint).toBeDefined();
		if (typeof layer0.paint === 'undefined') return;

		expect(layer0.paint).toHaveProperty('fill-color', '#ff0000');
	});

	it('should discard layers that have no style rules applied', () => {
		const result = decorate(mockLayers, {});
		expect(result.length).toBe(0);
	});
});

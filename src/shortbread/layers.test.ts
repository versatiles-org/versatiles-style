import { describe, expect, it } from 'vitest';
import type { FillLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { getShortbreadLayers } from './layers.js';
import { Language } from '../style_builder/types.js';

describe('layers', () => {
	it('should return an array of MaplibreLayer', () => {
		const language: Language = 'en';
		const layers = getShortbreadLayers({ language });

		expect(Array.isArray(layers)).toBe(true);
		expect(layers).not.toHaveLength(0);
		layers.forEach((layer) => {
			expect(layer).toHaveProperty('id');
			expect(layer).toHaveProperty('type');
		});
	});

	it('should handle no language suffix correctly', () => {
		const language: Language = '';
		const layers = getShortbreadLayers({ language });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();

		expect(labelLayer.layout?.['text-field']).toStrictEqual(['get', 'name']);
	});

	it('should handle language suffix en correctly', () => {
		const language: Language = 'en';
		const layers = getShortbreadLayers({ language });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();

		expect(labelLayer.layout?.['text-field']).toStrictEqual(['coalesce', ['get', 'name_en'], ['get', 'name']]);
	});

	it('should handle language suffix fr correctly', () => {
		const language: Language = 'fr';
		const layers = getShortbreadLayers({ language });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();

		expect(labelLayer.layout?.['text-field']).toStrictEqual(['coalesce', ['get', 'name_fr'], ['get', 'name']]);
	});

	it('should render busway and bus_guideway as streets', () => {
		const layers = getShortbreadLayers({ language: '' });
		const ids = new Set(layers.map((l) => l.id));

		expect(ids.has('street-busway')).toBe(true);
		expect(ids.has('street-busguideway')).toBe(true);
		expect(ids.has('bridge-street-busway')).toBe(true);
		expect(ids.has('tunnel-street-busway')).toBe(true);
		expect(ids.has('transport-busway')).toBe(false);
		expect(ids.has('transport-bus_guideway')).toBe(false);
	});

	it('should sort place labels by population', () => {
		const layers = getShortbreadLayers({ language: '' });
		const cityLayer = layers.find((layer) => layer.id === 'label-place-city') as SymbolLayerSpecification;

		expect(cityLayer).toBeDefined();
		expect(cityLayer.layout?.['symbol-sort-key']).toStrictEqual(['-', ['to-number', ['get', 'population'], 0]]);
	});

	it('should create appropriate filters for land layers', () => {
		const language: Language = 'en';
		const layers = getShortbreadLayers({ language });
		const landLayer = layers.find((layer) => layer.id === 'land-agriculture') as FillLayerSpecification;

		expect(landLayer).toBeDefined();
		expect(landLayer.filter).toEqual([
			'in',
			['get', 'kind'],
			[
				'literal',
				[
					'brownfield',
					'farmland',
					'farmyard',
					'greenfield',
					'greenhouse_horticulture',
					'orchard',
					'plant_nursery',
					'vineyard',
				],
			],
		]);
	});
});

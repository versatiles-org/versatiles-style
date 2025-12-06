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

		expect(labelLayer.layout?.['text-field']).toBe("{name}");
	});

	it('should handle language suffix en correctly', () => {
		const language: Language = 'en';
		const layers = getShortbreadLayers({ language });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();

		expect(labelLayer.layout?.['text-field']).toStrictEqual([
			"coalesce",
			"{name_en}",
			"{name}",
		]);
	});

	it('should handle language suffix fr correctly', () => {
		const language: Language = 'fr';
		const layers = getShortbreadLayers({ language });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();

		expect(labelLayer.layout?.['text-field']).toStrictEqual([
			"coalesce",
			"{name_fr}",
			"{name}",
		]);
	});

	it('should create appropriate filters for land layers', () => {
		const language: Language = 'en';
		const layers = getShortbreadLayers({ language });
		const landLayer = layers.find((layer) => layer.id === 'land-agriculture') as FillLayerSpecification;

		expect(landLayer).toBeDefined();
		expect(landLayer.filter).toEqual(['all', ['in', 'kind', 'brownfield', 'farmland', 'farmyard', 'greenfield', 'greenhouse_horticulture', 'orchard', 'plant_nursery', 'vineyard']]);
	});
});

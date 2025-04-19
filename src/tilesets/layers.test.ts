import type { FillLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { getTilesetsLayers } from './layers.js';
import { Language } from '../style_builder/types.js';

describe('layers', () => {
	it('should return an array of MaplibreLayer', () => {
		const language: Language = 'en';
		const layers = getTilesetsLayers({ language });

		expect(Array.isArray(layers)).toBe(true);
		expect(layers).not.toHaveLength(0);
		layers.forEach((layer) => {
			expect(layer).toHaveProperty('id');
			expect(layer).toHaveProperty('type');
		});
	});

	it('should handle language suffix correctly', () => {
		const language: Language = 'en';
		const layers = getTilesetsLayers({ language });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();

		expect(labelLayer.layout?.['text-field']).toContain('{name_en}');
	});

	it('should create appropriate filters for land layers', () => {
		const language: Language = 'en';
		const layers = getTilesetsLayers({ language });
		const landLayer = layers.find((layer) => layer.id === 'land-agriculture') as FillLayerSpecification;

		expect(landLayer).toBeDefined();
		expect(landLayer.filter).toEqual(['all', ['in', 'kind', 'brownfield', 'farmland', 'farmyard', 'greenfield', 'greenhouse_horticulture', 'orchard', 'plant_nursery', 'vineyard']]);
	});
});

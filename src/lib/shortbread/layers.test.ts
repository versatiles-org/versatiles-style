import type { LanguageSuffix } from '../style_builder.js';
import getLayers from './layers.js';
import type { SymbolLayer } from 'mapbox-gl';

describe('layers', () => {
	it('should return an array of MaplibreLayer', () => {
		const languageSuffix: LanguageSuffix = '_en';
		const layers = getLayers({ languageSuffix });

		expect(Array.isArray(layers)).toBe(true);
		expect(layers).not.toHaveLength(0);
		layers.forEach((layer) => {
			expect(layer).toHaveProperty('id');
			expect(layer).toHaveProperty('type');
		});
	});

	it('should handle language suffix correctly', () => {
		const languageSuffix: LanguageSuffix = '_en';
		const layers = getLayers({ languageSuffix });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayer;

		expect(labelLayer).toBeDefined();

		expect(labelLayer.layout?.['text-field']).toContain('{name_en}');
	});

	it('should create appropriate filters for land layers', () => {
		const languageSuffix: LanguageSuffix = '_en';
		const layers = getLayers({ languageSuffix });
		const landLayer = layers.find((layer) => layer.id === 'land-agriculture');

		expect(landLayer).toBeDefined();
		expect(landLayer?.filter).toEqual(['all', ['in', 'kind', 'brownfield', 'farmland', 'farmyard', 'greenfield', 'greenhouse_horticulture', 'orchard', 'plant_nursery', 'vineyard']]);
	});
});


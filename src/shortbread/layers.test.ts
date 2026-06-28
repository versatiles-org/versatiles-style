import { describe, expect, it } from 'vitest';
import type { FillLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import {
	getShortbreadLayers,
	SLOT_BELOW_FILLS,
	SLOT_BELOW_LABELS,
	SLOT_BELOW_STREETS,
	SLOT_BELOW_SYMBOLS,
} from './layers.js';

describe('layers', () => {
	it('should return an array of MaplibreLayer', () => {
		const layers = getShortbreadLayers({ language: 'en' });

		expect(Array.isArray(layers)).toBe(true);
		expect(layers).not.toHaveLength(0);
		layers.forEach((layer) => {
			expect(layer).toHaveProperty('id');
			expect(layer).toHaveProperty('type');
		});
	});

	it('should use local name when language is "local"', () => {
		const layers = getShortbreadLayers({ language: 'local' });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();
		expect(labelLayer.layout?.['text-field']).toStrictEqual(['get', 'name']);
	});

	it('should use local name when language is empty string', () => {
		const layers = getShortbreadLayers({ language: '' });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();
		expect(labelLayer.layout?.['text-field']).toStrictEqual(['get', 'name']);
	});

	it('should handle language suffix "en" with fallback', () => {
		const layers = getShortbreadLayers({ language: 'en' });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();
		expect(labelLayer.layout?.['text-field']).toStrictEqual(['coalesce', ['get', 'name_en'], ['get', 'name']]);
	});

	it('should handle language suffix "fr" with fallback', () => {
		const layers = getShortbreadLayers({ language: 'fr' });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();
		expect(labelLayer.layout?.['text-field']).toStrictEqual(['coalesce', ['get', 'name_fr'], ['get', 'name']]);
	});

	it('should use strict language field when languageStrict is true', () => {
		const layers = getShortbreadLayers({ language: 'de', languageStrict: true });
		const labelLayer = layers.find((layer) => layer.id === 'label-street-pedestrian') as SymbolLayerSpecification;

		expect(labelLayer).toBeDefined();
		expect(labelLayer.layout?.['text-field']).toStrictEqual(['get', 'name_de']);
	});

	it('should render busway and bus_guideway as streets', () => {
		const layers = getShortbreadLayers({ language: 'local' });
		const ids = new Set(layers.map((l) => l.id));

		expect(ids.has('street-busway')).toBe(true);
		expect(ids.has('street-busguideway')).toBe(true);
		expect(ids.has('bridge-street-busway')).toBe(true);
		expect(ids.has('tunnel-street-busway')).toBe(true);
		expect(ids.has('transport-busway')).toBe(false);
		expect(ids.has('transport-bus_guideway')).toBe(false);
	});

	it('should sort place labels by population', () => {
		const layers = getShortbreadLayers({ language: 'local' });
		const cityLayer = layers.find((layer) => layer.id === 'label-place-city') as SymbolLayerSpecification;

		expect(cityLayer).toBeDefined();
		expect(cityLayer.layout?.['symbol-sort-key']).toStrictEqual(['-', ['to-number', ['get', 'population'], 0]]);
	});

	it('should create appropriate filters for land layers', () => {
		const layers = getShortbreadLayers({ language: 'en' });
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

	it('should include all four slot anchor layers', () => {
		const layers = getShortbreadLayers({ language: 'local' });
		const ids = layers.map((l) => l.id);

		expect(ids).toContain(SLOT_BELOW_FILLS);
		expect(ids).toContain(SLOT_BELOW_STREETS);
		expect(ids).toContain(SLOT_BELOW_SYMBOLS);
		expect(ids).toContain(SLOT_BELOW_LABELS);
	});

	it('should order slot layers correctly in the render stack', () => {
		const layers = getShortbreadLayers({ language: 'local' });
		const indexOf = (id: string) => layers.findIndex((l) => l.id === id);

		// fills come after slot-below-fills
		expect(indexOf(SLOT_BELOW_FILLS)).toBeLessThan(indexOf('water-ocean'));
		expect(indexOf(SLOT_BELOW_FILLS)).toBeLessThan(indexOf('land-forest'));

		// streets come after slot-below-streets
		expect(indexOf(SLOT_BELOW_STREETS)).toBeLessThan(indexOf('street-residential'));
		expect(indexOf(SLOT_BELOW_STREETS)).toBeGreaterThan(indexOf('building'));

		// symbols come after slot-below-symbols
		expect(indexOf(SLOT_BELOW_SYMBOLS)).toBeLessThan(indexOf('poi-amenity'));
		expect(indexOf(SLOT_BELOW_SYMBOLS)).toBeGreaterThan(indexOf('bridge-street-motorway'));

		// labels come after slot-below-labels
		expect(indexOf(SLOT_BELOW_LABELS)).toBeLessThan(indexOf('label-place-city'));
		expect(indexOf(SLOT_BELOW_LABELS)).toBeGreaterThan(indexOf('symbol-transit-airport'));
	});

	it('slot anchor layers should be invisible background layers', () => {
		const layers = getShortbreadLayers({ language: 'local' });
		for (const slotId of [SLOT_BELOW_FILLS, SLOT_BELOW_STREETS, SLOT_BELOW_SYMBOLS, SLOT_BELOW_LABELS]) {
			const slot = layers.find((l) => l.id === slotId);
			expect(slot?.type).toBe('background');
			expect((slot as { paint?: Record<string, unknown> })?.paint?.['background-opacity']).toBe(0);
		}
	});
});

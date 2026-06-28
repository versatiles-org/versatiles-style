import { describe, expect, it } from 'vitest';
import type { FillLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../api/osm.js';
import { SLOT_BELOW_FILLS, SLOT_BELOW_LABELS, SLOT_BELOW_STREETS, SLOT_BELOW_SYMBOLS } from './index.js';

// End-to-end checks on the assembled layer list (structure, language handling, slot anchors,
// render order) — the colocated successors of the old getShortbreadLayers() tests.

function layersFor(language?: string, languageStrict?: boolean): SymbolLayerSpecification[] {
	return osm({ text: { language, languageStrict } }).layers as unknown as SymbolLayerSpecification[];
}

describe('assembled layers', () => {
	it('should return a non-empty array of layers with id and type', () => {
		const layers = layersFor('en');
		expect(Array.isArray(layers)).toBe(true);
		expect(layers).not.toHaveLength(0);
		layers.forEach((layer) => {
			expect(layer).toHaveProperty('id');
			expect(layer).toHaveProperty('type');
		});
	});

	const labelField = (layers: SymbolLayerSpecification[]) =>
		(layers.find((l) => l.id === 'label-street-pedestrian') as SymbolLayerSpecification).layout?.['text-field'];

	it('should use local name when language is "local"', () => {
		expect(labelField(layersFor('local'))).toStrictEqual(['get', 'name']);
	});

	it('should use local name when language is empty string', () => {
		expect(labelField(layersFor(''))).toStrictEqual(['get', 'name']);
	});

	it('should handle language suffix "en" with fallback', () => {
		expect(labelField(layersFor('en'))).toStrictEqual(['coalesce', ['get', 'name_en'], ['get', 'name']]);
	});

	it('should handle language suffix "fr" with fallback', () => {
		expect(labelField(layersFor('fr'))).toStrictEqual(['coalesce', ['get', 'name_fr'], ['get', 'name']]);
	});

	it('should use strict language field when languageStrict is true', () => {
		expect(labelField(layersFor('de', true))).toStrictEqual(['get', 'name_de']);
	});

	it('should render busway and bus_guideway as streets', () => {
		const ids = new Set(layersFor('local').map((l) => l.id));
		expect(ids.has('street-busway')).toBe(true);
		expect(ids.has('street-busguideway')).toBe(true);
		expect(ids.has('bridge-street-busway')).toBe(true);
		expect(ids.has('tunnel-street-busway')).toBe(true);
		expect(ids.has('transport-busway')).toBe(false);
		expect(ids.has('transport-bus_guideway')).toBe(false);
	});

	it('should sort place labels by population', () => {
		const cityLayer = layersFor('local').find((l) => l.id === 'label-place-city') as SymbolLayerSpecification;
		expect(cityLayer.layout?.['symbol-sort-key']).toStrictEqual(['-', ['to-number', ['get', 'population'], 0]]);
	});

	it('should create appropriate filters for land layers', () => {
		const landLayer = layersFor('en').find((l) => l.id === 'land-agriculture') as unknown as FillLayerSpecification;
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
		const ids = layersFor('local').map((l) => l.id);
		expect(ids).toContain(SLOT_BELOW_FILLS);
		expect(ids).toContain(SLOT_BELOW_STREETS);
		expect(ids).toContain(SLOT_BELOW_SYMBOLS);
		expect(ids).toContain(SLOT_BELOW_LABELS);
	});

	it('should order slot layers correctly in the render stack', () => {
		const layers = layersFor('local');
		const indexOf = (id: string) => layers.findIndex((l) => l.id === id);

		expect(indexOf(SLOT_BELOW_FILLS)).toBeLessThan(indexOf('water-ocean'));
		expect(indexOf(SLOT_BELOW_FILLS)).toBeLessThan(indexOf('land-forest'));
		expect(indexOf(SLOT_BELOW_STREETS)).toBeLessThan(indexOf('street-residential'));
		expect(indexOf(SLOT_BELOW_STREETS)).toBeGreaterThan(indexOf('building'));
		expect(indexOf(SLOT_BELOW_SYMBOLS)).toBeLessThan(indexOf('poi-amenity'));
		expect(indexOf(SLOT_BELOW_SYMBOLS)).toBeGreaterThan(indexOf('bridge-street-motorway'));
		expect(indexOf(SLOT_BELOW_LABELS)).toBeLessThan(indexOf('label-place-city'));
		expect(indexOf(SLOT_BELOW_LABELS)).toBeGreaterThan(indexOf('symbol-transit-airport'));
	});

	it('slot anchor layers should be invisible background layers', () => {
		const layers = layersFor('local');
		for (const slotId of [SLOT_BELOW_FILLS, SLOT_BELOW_STREETS, SLOT_BELOW_SYMBOLS, SLOT_BELOW_LABELS]) {
			const slot = layers.find((l) => l.id === slotId);
			expect(slot?.type).toBe('background');
			expect((slot as { paint?: Record<string, unknown> })?.paint?.['background-opacity']).toBe(0);
		}
	});
});

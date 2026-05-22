import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { TileJSONSpecification, VectorLayer } from '../types/index.js';
import { guessStyle } from './guess_style.js';
import { getShortbreadVectorLayers } from '../shortbread/template.js';
import {
	SourceSpecification,
	StyleSpecification,
	validateStyleMin,
	VectorSourceSpecification,
} from '@maplibre/maplibre-gl-style-spec';

describe('guessStyle', () => {
	const tiles = ['https://example.com/tiles/{z}/{x}/{y}'];
	const vectorLayersSomething: VectorLayer[] = [{ id: 'geometry', fields: { label: 'String', height: 'Number' } }];
	const vectorLayersShortbread: VectorLayer[] = getShortbreadVectorLayers();

	it('should build raster styles', () => {
		expect(guessStyle({ tiles })).toStrictEqual({
			version: 8,
			sources: { rasterSource: { tiles, type: 'raster' } },
			layers: [{ id: 'raster', source: 'rasterSource', type: 'raster' }],
		});
	});

	it('should build vector inspector styles', () => {
		expect(guessStyle({ tiles, vector_layers: vectorLayersSomething })).toStrictEqual({
			version: 8,
			sources: { vectorSource: { tiles, type: 'vector' } },
			layers: [
				{
					id: 'background',
					type: 'background',
					paint: { 'background-color': '#fff' },
				},
				{
					id: 'vectorSource-geometry-fill',
					type: 'fill',
					source: 'vectorSource',
					'source-layer': 'geometry',
					filter: ['==', '$type', 'Polygon'],
					paint: {
						'fill-antialias': true,
						'fill-color': 'hsla(7,57%,56%,0.6)',
						'fill-opacity': 0.3,
						'fill-outline-color': 'hsla(7,57%,56%,0.6)',
					},
				},
				{
					id: 'vectorSource-geometry-line',
					type: 'line',
					source: 'vectorSource',
					'source-layer': 'geometry',
					filter: ['==', '$type', 'LineString'],
					layout: { 'line-cap': 'round', 'line-join': 'round' },
					paint: { 'line-color': 'hsla(7,57%,56%,0.6)' },
				},
				{
					id: 'vectorSource-geometry-circle',
					type: 'circle',
					source: 'vectorSource',
					'source-layer': 'geometry',
					filter: ['==', '$type', 'Point'],
					paint: { 'circle-color': 'hsla(7,57%,56%,0.6)', 'circle-radius': 2 },
				},
			],
		});
	});

	it('should build shortbread vector styles', () => {
		const style = guessStyle({ tiles, vector_layers: vectorLayersShortbread }, { baseUrl: 'http://example.com' });

		expect(style.layers.length).toBe(324);
		style.layers = [];

		expect(style).toStrictEqual({
			glyphs: 'http://example.com/assets/glyphs/{fontstack}/{range}.pbf',
			metadata: {
				license: 'https://creativecommons.org/publicdomain/zero/1.0/',
			},
			name: 'versatiles-colorful',
			sprite: [{ id: 'basics', url: 'http://example.com/assets/sprites/basics/sprites' }],
			layers: [],
			sources: {
				'versatiles-shortbread': {
					attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
					bounds: [-180, -85.0511287798066, 180, 85.0511287798066],
					maxzoom: 14,
					minzoom: 0,
					scheme: 'xyz',
					tiles,
					type: 'vector',
				},
			},
			version: 8,
		});
	});

	const cases: { type: string; tilejson: TileJSONSpecification }[] = [
		{ type: 'image', tilejson: { tiles } },
		{ type: 'inspector', tilejson: { tiles, vector_layers: vectorLayersSomething } },
	];

	function getSource(style: StyleSpecification): SourceSpecification {
		return Object.values(style.sources)[0];
	}

	describe('minzoom sets minzoom', () => {
		cases.forEach(({ type, tilejson }) => {
			it(type, () => {
				expect(getSource(guessStyle({ ...tilejson, minzoom: 5 }))).toHaveProperty('minzoom', 5);
			});
		});
	});

	describe('maxzoom sets maxzoom', () => {
		cases.forEach(({ type, tilejson }) => {
			it(type, () => {
				expect(getSource(guessStyle({ ...tilejson, maxzoom: 5 }))).toHaveProperty('maxzoom', 5);
			});
		});
	});

	describe('real-world TileJSONs from tiles.versatiles.org', () => {
		const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '../types/fixtures/tilejson');
		const fixtures = readdirSync(fixtureDir).filter((f) => f.endsWith('.json'));

		it.each(fixtures)('should build a valid MapLibre style for %s', (file) => {
			const tilejson = JSON.parse(readFileSync(join(fixtureDir, file), 'utf8')) as TileJSONSpecification;
			const style = guessStyle(tilejson, { baseUrl: 'https://tiles.versatiles.org/' });
			expect(validateStyleMin(style)).toStrictEqual([]);
		});
	});

	describe('stays valid for partially invalid TileJSONs', () => {
		const invalidInputs: [string, unknown][] = [
			['null', null],
			['a string', 'garbage'],
			['an empty object', {}],
			['no tiles', { minzoom: 3 }],
			['an empty tiles array', { tiles: [] }],
			['non-string tiles entries', { tiles: ['https://example.com/{z}/{x}/{y}', 42, null] }],
			['an out-of-range center', { tiles, center: [999, 999] }],
			['malformed bounds', { tiles, bounds: [1, 2, 3] }],
			['a negative minzoom', { tiles, minzoom: -5 }],
			['vector_layers that is not an array', { tiles, vector_layers: 'oops' }],
			['only invalid vector layers', { tiles, vector_layers: [{ id: 42 }, 'nope'] }],
		];

		it.each(invalidInputs)('returns a valid style for %s', (_label, input) => {
			let style: StyleSpecification;
			expect(() => (style = guessStyle(input as TileJSONSpecification))).not.toThrow();
			expect(validateStyleMin(style!)).toStrictEqual([]);
		});

		it('keeps valid vector layers and drops invalid ones', () => {
			const style = guessStyle({
				tiles,
				vector_layers: [
					{ id: 'good_a', fields: { label: 'String' } },
					{ id: 42 } as unknown as VectorLayer,
					{ nope: 1 } as unknown as VectorLayer,
					{ id: 'good_b', fields: { bad: 'Bogus', ok: 'Number' } as unknown as VectorLayer['fields'] },
				],
			});
			const sourceLayers = style.layers
				.filter((l) => 'source-layer' in l)
				.map((l) => (l as { 'source-layer': string })['source-layer']);
			expect(new Set(sourceLayers)).toStrictEqual(new Set(['good_a', 'good_b']));
		});
	});

	describe('absolute tile urls override baseUrl', () => {
		cases.forEach(({ type, tilejson }) => {
			it(type, () => {
				const style = guessStyle(
					{ ...tilejson, tiles: ['https://example1.org/tiles/{z}/{x}/{y}'] },
					{ baseUrl: 'https://example2.org/' }
				);
				const source = Object.values(style.sources)[0] as VectorSourceSpecification;
				expect(source.tiles).toEqual(['https://example1.org/tiles/{z}/{x}/{y}']);
			});
		});
	});

	describe('relative tile urls are resolved with baseUrl', () => {
		cases.forEach(({ type, tilejson }) => {
			it(type, () => {
				const style = guessStyle({ ...tilejson, tiles: ['./{z}/{x}/{y}'] }, { baseUrl: 'https://example2.org/tiles/' });
				const source = Object.values(style.sources)[0] as VectorSourceSpecification;
				expect(source.tiles).toEqual(['https://example2.org/tiles/{z}/{x}/{y}']);
			});
		});
	});
});

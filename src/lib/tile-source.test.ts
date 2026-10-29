import { describe, expect, it } from 'vitest';
import { buildSourceDescriptor, demEncoding, inlinedFields, vectorEncoding } from './tile-source.js';
import type { TileJSONSpecification } from '../types/index.js';

const tiles = ['https://t/{z}/{x}/{y}'];

describe('vectorEncoding()', () => {
	it('takes an explicit mvt or mlt encoding from the TileJSON', () => {
		expect(vectorEncoding({ tiles, encoding: 'mlt' })).toBe('mlt');
		expect(vectorEncoding({ tiles, encoding: 'mvt' })).toBe('mvt');
	});

	it('derives mlt from tile_format, including the older and unprefixed media types', () => {
		for (const tile_format of [
			'application/vnd.maplibre-tile',
			'application/vnd.maplibre-vector-tile',
			'vnd.maplibre-tile',
		]) {
			expect(vectorEncoding({ tiles, tile_format }), tile_format).toBe('mlt');
		}
	});

	it('states nothing for MVT by tile_format, which is MapLibre’s default anyway', () => {
		expect(vectorEncoding({ tiles, tile_format: 'application/vnd.mapbox-vector-tile' })).toBeUndefined();
		expect(vectorEncoding({ tiles })).toBeUndefined();
	});

	it('prefers an explicit encoding over tile_format', () => {
		expect(vectorEncoding({ tiles, encoding: 'mvt', tile_format: 'application/vnd.maplibre-tile' })).toBe('mvt');
	});

	it('ignores raster-dem encodings', () => {
		expect(vectorEncoding({ tiles, encoding: 'terrarium' })).toBeUndefined();
	});
});

describe('inlinedFields()', () => {
	it('carries the vector encoding onto the source', () => {
		const tj: TileJSONSpecification = { tiles, tile_format: 'application/vnd.maplibre-tile', vector_layers: [] };
		expect(inlinedFields(tj)).toMatchObject({ encoding: 'mlt' });
		expect(buildSourceDescriptor('vector', tj)).toMatchObject({ type: 'vector', tiles, encoding: 'mlt' });
	});

	it('does not declare an encoding the TileJSON does not imply', () => {
		expect(inlinedFields({ tiles, vector_layers: [] })).not.toHaveProperty('encoding');
		expect(inlinedFields({ tiles, encoding: 'terrarium' })).not.toHaveProperty('encoding');
	});
});

describe('demEncoding()', () => {
	it('takes a terrarium or mapbox encoding from the TileJSON', () => {
		expect(demEncoding({ tiles, encoding: 'mapbox' })).toBe('mapbox');
		expect(demEncoding({ tiles, encoding: 'terrarium' })).toBe('terrarium');
	});

	it('derives it from tile_schema', () => {
		expect(demEncoding({ tiles, tile_schema: 'dem/mapbox' })).toBe('mapbox');
		expect(demEncoding({ tiles, tile_schema: 'dem/terrarium' })).toBe('terrarium');
	});

	it('prefers an explicit encoding over tile_schema', () => {
		expect(demEncoding({ tiles, encoding: 'terrarium', tile_schema: 'dem/mapbox' })).toBe('terrarium');
	});

	it('states nothing when the TileJSON states nothing', () => {
		expect(demEncoding({ tiles })).toBeUndefined();
		expect(demEncoding({ tiles, encoding: 'mlt' })).toBeUndefined();
		expect(demEncoding({ tiles, tile_schema: 'dem/versatiles' })).toBeUndefined();
	});
});

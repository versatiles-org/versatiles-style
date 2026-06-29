import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '../types/index.js';
import type { ResolvedSun } from '../types/index.js';
import { buildElevationSource } from './elevation-source.js';
import { addTerrain } from './terrain.js';
import { addHillshade } from './hillshade.js';
import { configure3DLighting } from './sun.js';

const ELEVATION_URL = 'https://tiles.example.com/dem/{z}/{x}/{y}.png';

const MOCK_SUN: ResolvedSun = {
	direction: 220,
	altitude: 35,
	color: '#fff5e0',
	intensity: 0.5,
};

function baseStyle(): StyleSpecification {
	return {
		version: 8,
		sources: {},
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': '#fff' } },
			{ id: 'land-forest', type: 'fill', source: 'osm', 'source-layer': 'landcover', paint: { 'fill-opacity': 0.6 } },
			{
				id: 'land-grass',
				type: 'fill',
				source: 'osm',
				'source-layer': 'landcover',
				paint: { 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 12, 0.8] },
			},
			{ id: 'water', type: 'fill', source: 'osm', 'source-layer': 'water', paint: {} },
			{ id: 'building:outline', type: 'fill', source: 'osm', 'source-layer': 'buildings' },
			{ id: 'building', type: 'fill', source: 'osm', 'source-layer': 'buildings' },
			{
				id: 'building-3d',
				type: 'fill-extrusion',
				source: 'osm',
				'source-layer': 'buildings',
				layout: { visibility: 'none' },
			},
			{ id: 'road', type: 'line', source: 'osm', 'source-layer': 'streets' },
		],
	} as unknown as StyleSpecification;
}

describe('buildElevationSource', () => {
	it('builds terrarium source from URL string', () => {
		const src = buildElevationSource(ELEVATION_URL);
		expect(src.type).toBe('raster-dem');
		expect(src.tiles).toEqual([ELEVATION_URL]);
		expect(src.encoding).toBe('terrarium');
		expect(src.tileSize).toBe(512);
	});

	it('builds source from TileJSON with terrarium encoding by default', () => {
		const src = buildElevationSource({
			tiles: ['https://a/{z}/{x}/{y}'],
			tile_size: 256,
			minzoom: 0,
			maxzoom: 14,
		} as Parameters<typeof buildElevationSource>[0]);
		expect(src.encoding).toBe('terrarium');
		expect(src.tileSize).toBe(256);
		expect(src.minzoom).toBe(0);
		expect(src.maxzoom).toBe(14);
	});

	it('uses mapbox encoding when tile_schema is dem/mapbox', () => {
		const src = buildElevationSource({
			tiles: ['https://a/{z}/{x}/{y}'],
			tile_schema: 'dem/mapbox',
		} as Parameters<typeof buildElevationSource>[0]);
		expect(src.encoding).toBe('mapbox');
	});
});

describe('addTerrain', () => {
	it('adds elevation source and terrain to style', () => {
		const style = baseStyle();
		addTerrain(style, { exaggeration: 1.5 }, ELEVATION_URL);
		expect(style.sources).toHaveProperty('elevation');
		expect(style.terrain).toEqual({ source: 'elevation', exaggeration: 1.5 });
	});
});

describe('addHillshade', () => {
	const hillshadeOptions = {
		exaggeration: 0.5,
		shadowColor: '#000',
		highlightColor: '#fff',
		accentColor: '#888',
		anchor: 'map' as const,
	};

	it('adds elevation source and hillshade layer', () => {
		const style = baseStyle();
		addHillshade(style, hillshadeOptions, MOCK_SUN, ELEVATION_URL);
		expect(style.sources).toHaveProperty('elevation');
		const hillshadeLayer = style.layers.find((l) => l.id === 'hillshade');
		expect(hillshadeLayer).toBeDefined();
		expect(hillshadeLayer?.type).toBe('hillshade');
	});

	it('inserts hillshade layer after last fill/background/raster', () => {
		const style = baseStyle();
		addHillshade(style, hillshadeOptions, MOCK_SUN, ELEVATION_URL);
		const ids = style.layers.map((l) => l.id);
		const hillshadeIdx = ids.indexOf('hillshade');
		const waterIdx = ids.indexOf('water');
		// hillshade should be after the last fill (water), before road
		expect(hillshadeIdx).toBeGreaterThan(waterIdx);
	});
});

describe('sun', () => {
	it('sets style.light from sun direction', () => {
		const style = baseStyle();
		configure3DLighting(style, MOCK_SUN);
		expect(style.light).toBeDefined();
		expect((style.light as { position: unknown }).position).toBeDefined();
	});
});

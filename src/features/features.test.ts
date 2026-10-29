import { describe, expect, it } from 'vitest';
import type { StyleSpecification } from '../types/index.js';
import { SKY_DEFAULTS, type ResolvedLight, type ResolvedSky } from '../options/index.js';
import { buildElevationSource } from './elevation-source.js';
import { addTerrain } from './terrain.js';
import { addHillshade } from './hillshade.js';
import { configure3DLighting, globeLightPosition, lightPosition } from './light.js';
import { BUILDINGS_APPEAR_ZOOM } from '../cartography/index.js';

const ELEVATION_URL = 'https://tiles.example.com/dem/{z}/{x}/{y}.png';

const MOCK_LIGHT: Exclude<ResolvedLight, false> = {
	direction: 220,
	altitude: 35,
	color: '#fff5e0',
	intensity: 0.5,
	fixedToScreen: false,
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
		// A raw tile template states no tile size, so none is declared.
		expect(src).not.toHaveProperty('tileSize');
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

	// MapLibre loads a terrain source one zoom coarser, so a hillshade sharing it loses half its
	// resolution, and MapLibre warns (#140).
	it('takes a source of its own next to a hillshade on `elevation`', () => {
		const style = baseStyle();
		addHillshade(
			style,
			{ exaggeration: 0.5, shadowColor: '#000', highlightColor: '#fff', accentColor: '#888' },
			false,
			ELEVATION_URL
		);
		addTerrain(style, { exaggeration: 1.5 }, ELEVATION_URL);
		expect(style.terrain).toEqual({ source: 'elevation-terrain', exaggeration: 1.5 });
		expect(style.layers.find((l) => l.id === 'hillshade')).toMatchObject({ source: 'elevation' });
		expect(style.sources['elevation-terrain']).toStrictEqual(style.sources['elevation']);
	});
});

describe('addHillshade anchor', () => {
	const options = { exaggeration: 0.5, shadowColor: '#000', highlightColor: '#fff', accentColor: '#888' };
	const anchorOf = (fixedToScreen?: boolean) => {
		const style = baseStyle();
		const light = fixedToScreen === undefined ? false : { ...MOCK_LIGHT, fixedToScreen };
		addHillshade(style, options, light, ELEVATION_URL);
		return style.layers.find((l) => l.id === 'hillshade')?.paint?.['hillshade-illumination-anchor' as never];
	};

	it('follows the light, so terrain and buildings are lit from the same side', () => {
		expect(anchorOf(true)).toBe('viewport');
		expect(anchorOf(false)).toBe('map');
	});

	it("is 'map' without a light", () => {
		expect(anchorOf(undefined)).toBe('map');
	});
});

describe('addHillshade', () => {
	const hillshadeOptions = {
		exaggeration: 0.5,
		shadowColor: '#000',
		highlightColor: '#fff',
		accentColor: '#888',
	};

	it('adds elevation source and hillshade layer', () => {
		const style = baseStyle();
		addHillshade(style, hillshadeOptions, MOCK_LIGHT, ELEVATION_URL);
		expect(style.sources).toHaveProperty('elevation');
		const hillshadeLayer = style.layers.find((l) => l.id === 'hillshade');
		expect(hillshadeLayer).toBeDefined();
		expect(hillshadeLayer?.type).toBe('hillshade');
	});

	it('inserts hillshade layer after last fill/background/raster', () => {
		const style = baseStyle();
		addHillshade(style, hillshadeOptions, MOCK_LIGHT, ELEVATION_URL);
		const ids = style.layers.map((l) => l.id);
		const hillshadeIdx = ids.indexOf('hillshade');
		const waterIdx = ids.indexOf('water');
		// hillshade should be after the last fill (water), before road
		expect(hillshadeIdx).toBeGreaterThan(waterIdx);
	});

	// Without a light, the hillshade is MapLibre's own: 'standard', with the accent colour.
	it("uses MapLibre's default method without a light", () => {
		const style = baseStyle();
		addHillshade(style, hillshadeOptions, false, ELEVATION_URL);
		const paint = style.layers.find((l) => l.id === 'hillshade')?.paint ?? {};
		expect(paint).not.toHaveProperty('hillshade-method');
		expect(paint).not.toHaveProperty('hillshade-illumination-altitude');
		expect(paint).toHaveProperty('hillshade-accent-color', 'rgb(136,136,136)');
	});

	// 'standard' ignores the altitude; 'combined' takes it, and draws no accent colour.
	it("switches to 'combined' with a light, so the light's altitude shades the terrain", () => {
		const style = baseStyle();
		addHillshade(style, hillshadeOptions, MOCK_LIGHT, ELEVATION_URL);
		const paint = style.layers.find((l) => l.id === 'hillshade')?.paint ?? {};
		expect(paint).toMatchObject({
			'hillshade-method': 'combined',
			'hillshade-illumination-direction': 220,
			'hillshade-illumination-altitude': 35,
		});
		expect(paint).not.toHaveProperty('hillshade-accent-color');
	});
});

describe('configure3DLighting', () => {
	const sun = (direction: number, altitude: number, fixedToScreen = true) => ({
		...MOCK_LIGHT,
		direction,
		altitude,
		fixedToScreen,
	});
	const positionOf = (style: StyleSpecification) => (style.light as { position: unknown }).position;
	// A sky whose atmosphere shows on a globe, so these tests see the light whatever the buildings do.
	const SKY = { ...SKY_DEFAULTS, atmosphereBlend: 1 };
	/** `baseStyle()` with the extruded buildings visible, so a Mercator style reads the light too. */
	const extruded = () => {
		const style = baseStyle();
		delete style.layers.find((l) => l.id === 'building-3d')!.layout;
		return style;
	};

	it('writes the true position in Mercator', () => {
		const style = extruded();
		configure3DLighting(style, sun(315, 45), 'mercator', SKY);
		expect(positionOf(style)).toStrictEqual([1.15, 315, 45]);
	});

	it('steps from the atmosphere position to the true one where buildings appear, on a globe', () => {
		for (const projection of ['globe', 'vertical-perspective'] as const) {
			const style = baseStyle();
			configure3DLighting(style, sun(315, 45), projection, SKY);
			expect(positionOf(style)).toStrictEqual([
				'step',
				['zoom'],
				['literal', [1.15, 225, 135]],
				BUILDINGS_APPEAR_ZOOM,
				['literal', [1.15, 315, 45]],
			]);
		}
	});

	it('mirrors the direction vertically and moves the sun in front of the globe', () => {
		expect(globeLightPosition(sun(0, 45))).toStrictEqual([1.15, 180, 135]);
		expect(globeLightPosition(sun(90, 0))).toStrictEqual([1.15, 90, 90]);
		expect(globeLightPosition(sun(180, 90))).toStrictEqual([1.15, 0, 180]);
		expect(globeLightPosition(sun(270, 30))).toStrictEqual([1.15, 270, 120]);
		expect(globeLightPosition(sun(-45, 45))[1]).toBe(225);
		expect(globeLightPosition(sun(540, 45))[1]).toBe(0);
		expect(lightPosition(sun(270, 30))).toStrictEqual([1.15, 270, 60]);
	});

	it('steps a light that turns with the map from the screen to the map where buildings appear, on a globe', () => {
		const style = baseStyle();
		configure3DLighting(style, sun(315, 45, false), 'globe', SKY);
		expect(positionOf(style)).toStrictEqual([
			'step',
			['zoom'],
			['literal', [1.15, 225, 135]],
			BUILDINGS_APPEAR_ZOOM,
			['literal', [1.15, 315, 45]],
		]);
		expect(style.light?.anchor).toStrictEqual(['step', ['zoom'], 'viewport', BUILDINGS_APPEAR_ZOOM, 'map']);
	});

	it('writes a light that turns with the map plainly in Mercator', () => {
		const style = extruded();
		configure3DLighting(style, sun(315, 45, false), 'mercator', SKY);
		expect(positionOf(style)).toStrictEqual([1.15, 315, 45]);
		expect(style.light?.anchor).toBe('map');
	});

	it('removes style.light without a light', () => {
		const style = baseStyle();
		style.light = { anchor: 'map' };
		configure3DLighting(style, false, 'globe', SKY);
		expect(style.light).toBeUndefined();
	});

	// The hillshade carries the light in its own paint properties; only buildings and the atmosphere
	// read `style.light`.
	it('writes style.light only where 3D buildings or a visible atmosphere read it', () => {
		const lit = (style: StyleSpecification, projection: 'globe' | 'mercator', sky: ResolvedSky) => {
			configure3DLighting(style, sun(315, 45), projection, sky);
			return style.light !== undefined;
		};
		const noHaze = { ...SKY_DEFAULTS, atmosphereBlend: 0 };
		expect(lit(baseStyle(), 'globe', noHaze)).toBe(false);
		expect(lit(baseStyle(), 'globe', false)).toBe(false);
		expect(lit(baseStyle(), 'mercator', SKY)).toBe(false);
		expect(lit(baseStyle(), 'globe', SKY)).toBe(true);
		expect(
			lit(baseStyle(), 'globe', { ...SKY_DEFAULTS, atmosphereBlend: ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 0] })
		).toBe(true);
		expect(lit(extruded(), 'mercator', noHaze)).toBe(true);
	});
});

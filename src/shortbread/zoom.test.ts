import { describe, expect, it } from 'vitest';
import { createFadeIn, getFadeInZoom, LAND_KIND_GROUPS, WATER_POLYGON_KIND_GROUPS } from './zoom.js';
import { getShortbreadLayers } from './layers.js';

describe('getFadeInZoom', () => {
	// Appearance zooms per https://shortbread-tiles.org/schema/1.0/, taken as the lowest zoom of
	// all kinds a layer renders.
	const shortbreadZooms: Record<string, number> = {
		'land-glacier': 4,
		'land-forest': 7,
		'land-agriculture': 10,
		'land-commercial': 10,
		'land-industrial': 10,
		'land-residential': 10,
		'land-sand': 10,
		'land-waste': 10,
		'land-garden': 11,
		'land-grass': 11,
		'land-leisure': 11,
		'land-park': 11,
		'land-rock': 11,
		'land-vegetation': 11,
		'land-wetland': 11,
		'land-burial': 13,
		'water-area': 4,
		'water-area-river': 4,
		'water-area-small': 4,
	};

	it('uses the Shortbread appearance zoom of the earliest kind a layer renders', () => {
		for (const [layerId, zoom] of Object.entries(shortbreadZooms)) {
			expect(getFadeInZoom(layerId), layerId).toBe(zoom);
		}
	});

	// The land cover extension delivers these kinds from z0, so any layer rendering one of them
	// must be visible from z0. See
	// https://docs.versatiles.org/compendium/specification_shortbread_landcover.html
	const landcoverZooms: Record<string, number> = {
		...shortbreadZooms,
		'land-glacier': 0, // glacier
		'land-forest': 0, // forest
		'land-agriculture': 0, // farmland
		'land-residential': 0, // residential
		'land-grass': 0, // grassland
		'land-rock': 0, // bare_rock
		'land-vegetation': 0, // heath, scrub
		'land-wetland': 0, // marsh, swamp
		'water-area': 0, // water
	};

	it('starts at z0 for layers the land cover extension covers', () => {
		for (const [layerId, zoom] of Object.entries(landcoverZooms)) {
			expect(getFadeInZoom(layerId, true), layerId).toBe(zoom);
		}
	});

	it('covers exactly the land and water_polygons layers', () => {
		const ids = getShortbreadLayers({ language: null })
			.filter((layer) => {
				const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
				return sourceLayer === 'land' || sourceLayer === 'water_polygons';
			})
			.map((layer) => layer.id)
			.sort();
		expect(ids).toStrictEqual(Object.keys(shortbreadZooms).sort());
	});

	it('takes the earliest zoom of several layers', () => {
		expect(getFadeInZoom(['land-burial', 'land-forest'])).toBe(7);
	});

	it('throws for a layer with no known kinds', () => {
		expect(() => getFadeInZoom('land-nonsense')).toThrow('no kinds known for layer "land-nonsense"');
	});

	it('knows an appearance zoom for every kind rendered by a layer', () => {
		const layerIds = [...LAND_KIND_GROUPS.map(({ id }) => 'land-' + id), ...Object.keys(WATER_POLYGON_KIND_GROUPS)];
		for (const layerId of layerIds) {
			// Throws if any of the layer's kinds is missing from the appearance-zoom table.
			expect(() => getFadeInZoom(layerId), layerId).not.toThrow();
		}
	});
});

describe('createFadeIn', () => {
	it('ramps from 0 to the target over the given span', () => {
		const fadeIn = createFadeIn(false);
		expect(fadeIn('land-burial')).toStrictEqual({ 13: 0, 14: 1 });
		expect(fadeIn('land-forest', { target: 0.1 })).toStrictEqual({ 7: 0, 8: 0.1 });
		expect(fadeIn('water-area', { span: 2 })).toStrictEqual({ 4: 0, 6: 1 });
	});

	it('drops the ramp once the data reaches z0', () => {
		const fadeIn = createFadeIn(true);
		expect(fadeIn('land-forest', { target: 0.1 })).toBe(0.1);
		expect(fadeIn('land-grass')).toBeUndefined();
		expect(fadeIn('water-area', { span: 2 })).toBeUndefined();
	});

	it('keeps fading layers the extension does not cover', () => {
		const fadeIn = createFadeIn(true);
		expect(fadeIn('land-burial')).toStrictEqual({ 13: 0, 14: 1 });
		expect(fadeIn('land-sand')).toStrictEqual({ 10: 0, 11: 1 });
		expect(fadeIn('land-leisure')).toStrictEqual({ 11: 0, 12: 1 });
	});
});

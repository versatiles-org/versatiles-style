import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Inland water: rivers/canals/streams/ditches (lines), water polygons, dams and piers.
// These sit ABOVE the land fills (which is why ocean lives in the landcover band instead).

const LINE_SIZES: Record<string, Record<number, number>> = {
	river: { 9: 0, 10: 3, 15: 5, 17: 9, 18: 20, 20: 60 },
	canal: { 9: 0, 10: 2, 15: 4, 17: 8, 18: 17, 20: 50 },
	stream: { 13: 0, 14: 1, 15: 2, 17: 6, 18: 12, 20: 30 },
	ditch: { 14: 0, 15: 1, 17: 4, 18: 8, 20: 20 },
};

export function* water(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	// flowing water (lines)
	for (const kind of ['river', 'canal', 'stream', 'ditch'] as const) {
		yield b.line('water-' + kind, {
			sourceLayer: 'water_lines',
			filter: ['all', ['==', ['get', 'kind'], kind], ['!=', ['get', 'tunnel'], true], ['!=', ['get', 'bridge'], true]],
			color: c.water,
			lineCap: 'round',
			lineJoin: 'round',
			size: LINE_SIZES[kind],
			group: 'water.rivers',
		});
	}

	// water polygons
	yield b.fill('water-area', {
		sourceLayer: 'water_polygons',
		filter: ['==', ['get', 'kind'], 'water'],
		color: c.water,
		opacity: { 4: 0, 6: 1 },
		group: 'water.lakes',
	});
	yield b.fill('water-area-river', {
		sourceLayer: 'water_polygons',
		filter: ['==', ['get', 'kind'], 'river'],
		color: c.water,
		opacity: { 4: 0, 6: 1 },
		group: 'water.rivers',
	});
	yield b.fill('water-area-small', {
		sourceLayer: 'water_polygons',
		filter: ['in', ['get', 'kind'], ['literal', ['reservoir', 'basin', 'dock']]],
		color: c.water,
		opacity: { 4: 0, 6: 1 },
		group: 'water.lakes',
	});

	// dam
	yield b.fill('water-dam-area', {
		sourceLayer: 'dam_polygons',
		filter: ['==', ['get', 'kind'], 'dam'],
		color: c.land,
		opacity: { 12: 0, 13: 1 },
		group: 'water.piers',
	});
	yield b.line('water-dam', {
		sourceLayer: 'dam_lines',
		filter: ['==', ['get', 'kind'], 'dam'],
		color: c.water,
		lineCap: 'round',
		lineJoin: 'round',
		group: 'water.piers',
	});

	// pier
	const pierKinds: FilterSpecification = ['in', ['get', 'kind'], ['literal', ['pier', 'breakwater', 'groyne']]];
	yield b.fill('water-pier-area', {
		sourceLayer: 'pier_polygons',
		filter: pierKinds,
		color: c.land,
		opacity: { 12: 0, 13: 1 },
		group: 'water.piers',
	});
	yield b.line('water-pier', {
		sourceLayer: 'pier_lines',
		filter: pierKinds,
		color: c.land,
		lineCap: 'round',
		lineJoin: 'round',
		group: 'water.piers',
	});
}

import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Airport runways and taxiways (area fill + casing/fill lines). All in the `airport` group.
export function* airport(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	yield b.fill('airport-area', {
		sourceLayer: 'street_polygons',
		filter: ['in', ['get', 'kind'], ['literal', ['runway', 'taxiway']]],
		color: c.roadStreet,
		opacity: 0.5,
		group: 'airport',
	});

	yield b.line('airport-taxiway:outline', {
		sourceLayer: 'streets',
		filter: ['==', ['get', 'kind'], 'taxiway'],
		color: c.roadStreetBg,
		lineJoin: 'round',
		size: { 13: 0, 14: 2, 15: 10, 16: 14, 18: 20, 20: 40 },
		group: 'airport',
	});
	yield b.line('airport-runway:outline', {
		sourceLayer: 'streets',
		filter: ['==', ['get', 'kind'], 'runway'],
		color: c.roadStreetBg,
		lineJoin: 'round',
		size: { 11: 0, 12: 6, 13: 9, 14: 16, 15: 24, 16: 40, 17: 100, 18: 160, 20: 300 },
		group: 'airport',
	});
	yield b.line('airport-taxiway', {
		sourceLayer: 'streets',
		filter: ['==', ['get', 'kind'], 'taxiway'],
		color: c.roadStreet,
		lineJoin: 'round',
		size: { 13: 0, 14: 1, 15: 8, 16: 12, 18: 18, 20: 36 },
		opacity: { 13: 0, 14: 1 },
		group: 'airport',
	});
	yield b.line('airport-runway', {
		sourceLayer: 'streets',
		filter: ['==', ['get', 'kind'], 'runway'],
		color: c.roadStreet,
		lineJoin: 'round',
		size: { 11: 0, 12: 5, 13: 8, 14: 14, 15: 22, 16: 38, 17: 98, 18: 158, 20: 298 },
		opacity: { 11: 0, 12: 1 },
		group: 'airport',
	});
}

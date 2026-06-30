import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Airport runways and taxiways (area fill + casing/fill lines). All in the `airport` group.
export function* airport(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;
	// OSM Bright aeroway casings are a mid grey (~#999); fills are white. Widths use base 1.5.
	const casing = c.roadStreetBg.darken(0.26);

	yield b.fill('airport-area', {
		sourceLayer: 'street_polygons',
		filter: ['in', ['get', 'kind'], ['literal', ['runway', 'taxiway']]],
		color: c.roadStreet,
		opacity: { 13: 0, 14: 1 },
		group: 'airport',
	});

	yield b.line('airport-taxiway:outline', {
		sourceLayer: 'streets',
		filter: ['==', ['get', 'kind'], 'taxiway'],
		color: casing,
		lineCap: 'round',
		lineJoin: 'round',
		minzoom: 12,
		size: { base: 1.5, stops: { 11: 2, 17: 12 } },
		group: 'airport',
	});
	yield b.line('airport-runway:outline', {
		sourceLayer: 'streets',
		filter: ['==', ['get', 'kind'], 'runway'],
		color: casing,
		lineCap: 'round',
		lineJoin: 'round',
		minzoom: 12,
		size: { base: 1.5, stops: { 11: 5, 17: 55 } },
		group: 'airport',
	});
	yield b.line('airport-taxiway', {
		sourceLayer: 'streets',
		filter: ['==', ['get', 'kind'], 'taxiway'],
		color: c.roadStreet,
		lineCap: 'round',
		lineJoin: 'round',
		size: { base: 1.5, stops: { 11: 1, 17: 10 } },
		opacity: { 11: 0, 12: 1 },
		group: 'airport',
	});
	yield b.line('airport-runway', {
		sourceLayer: 'streets',
		filter: ['==', ['get', 'kind'], 'runway'],
		color: c.roadStreet,
		lineCap: 'round',
		lineJoin: 'round',
		size: { base: 1.5, stops: { 11: 4, 17: 50 } },
		opacity: { 11: 0, 12: 1 },
		group: 'airport',
	});
}

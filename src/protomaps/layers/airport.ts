import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';

// Airport runways and taxiways for Protomaps.
//
// Verified: the centrelines are `roads` with `kind: aeroway` and `kind_detail` runway / taxiway, and the
// paved areas are `landuse` with `kind: runway`. Two source-layers, as in the water module — Protomaps
// files the line and the area of the same feature apart.
const LINES: FilterSpecification = ['==', ['geometry-type'], 'LineString'];
const centreline = (detail: string): FilterSpecification => [
	'all',
	LINES,
	['==', ['get', 'kind'], 'aeroway'],
	['==', ['get', 'kind_detail'], detail],
];

export function* airport(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;
	const casing = c.roadStreetBg;

	yield b.fill('airport-area', {
		sourceLayer: 'landuse',
		// Shortbread's two paved kinds. Not `apron`, which Shortbread has no counterpart for (and which the
		// cached Protomaps tiles do not carry anyway).
		filter: ['in', ['get', 'kind'], ['literal', ['runway', 'taxiway']]],
		color: c.roadStreet,
		opacity: { 13: 0, 14: 1 },
		group: 'airport',
	});

	yield b.line('airport-taxiway:outline', {
		sourceLayer: 'roads',
		filter: centreline('taxiway'),
		color: casing,
		lineCap: 'butt',
		lineJoin: 'round',
		minzoom: 12,
		size: { 13: 0, 14: 2, 15: 10, 16: 14, 18: 20, 20: 40 },
		group: 'airport',
	});
	yield b.line('airport-runway:outline', {
		sourceLayer: 'roads',
		filter: centreline('runway'),
		color: casing,
		lineCap: 'butt',
		lineJoin: 'round',
		minzoom: 12,
		size: { 11: 0, 12: 6, 13: 9, 14: 16, 15: 24, 16: 40, 17: 100, 18: 160, 20: 300 },
		group: 'airport',
	});
	yield b.line('airport-taxiway', {
		sourceLayer: 'roads',
		filter: centreline('taxiway'),
		color: c.roadStreet,
		lineCap: 'butt',
		lineJoin: 'round',
		size: { 13: 0, 14: 1, 15: 8, 16: 12, 18: 18, 20: 36 },
		group: 'airport',
	});
	yield b.line('airport-runway', {
		sourceLayer: 'roads',
		filter: centreline('runway'),
		color: c.roadStreet,
		lineCap: 'butt',
		lineJoin: 'round',
		size: { 11: 0, 12: 5, 13: 8, 14: 14, 15: 22, 16: 38, 17: 98, 18: 158, 20: 298 },
		opacity: { 11: 0, 12: 1 },
		group: 'airport',
	});
}

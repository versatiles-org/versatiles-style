import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Administrative boundary lines (country / state, with disputed + maritime variants).
// Country/state are drawn as a casing (`:outline`) pass then a main pass. `maritime`
// variants render as a single faint dashed line (no casing) over the water.

export function* boundaries(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;
	const fCountry: FilterSpecification = [
		'all',
		['==', ['get', 'admin_level'], 2],
		['!=', ['get', 'maritime'], true],
		['!=', ['get', 'disputed'], true],
		['!=', ['get', 'coastline'], true],
	];
	const fDisputed: FilterSpecification = [
		'all',
		['==', ['get', 'admin_level'], 2],
		['==', ['get', 'disputed'], true],
		['!=', ['get', 'maritime'], true],
		['!=', ['get', 'coastline'], true],
	];
	const fMaritime: FilterSpecification = [
		'all',
		['==', ['get', 'admin_level'], 2],
		['==', ['get', 'maritime'], true],
		['!=', ['get', 'disputed'], true],
		['!=', ['get', 'coastline'], true],
	];
	const fState: FilterSpecification = [
		'all',
		['==', ['get', 'admin_level'], 4],
		['!=', ['get', 'maritime'], true],
		['!=', ['get', 'disputed'], true],
		['!=', ['get', 'coastline'], true],
	];

	// OSM Bright draws boundaries as single lines (no casing). Widths interpolate with base 1.
	const COUNTRY_WIDTH: b.ExpStops = { base: 1, stops: { 0: 0.6, 4: 1.4, 5: 2, 12: 8 } };

	// state / province (admin 3–8): dashed, drawn beneath the country line. Shortbread serves
	// these from z7, so grow the width in from 0 over z7→8 instead of popping.
	yield b.line('boundary-state', {
		sourceLayer: 'boundaries',
		filter: fState,
		color: c.boundary,
		lineCap: 'round',
		lineJoin: 'round',
		minzoom: 2,
		appear: 7,
		size: { base: 1.4, stops: { 4: 0.4, 5: 1, 12: 3 } },
		lineDasharray: [3, 1, 1, 1],
		group: 'boundaries.state',
	});

	// country (admin 2): solid
	yield b.line('boundary-country', {
		sourceLayer: 'boundaries',
		filter: fCountry,
		color: c.boundary,
		lineCap: 'round',
		lineJoin: 'round',
		size: COUNTRY_WIDTH,
		group: 'boundaries.country',
	});

	// disputed: dashed
	yield b.line('boundary-country-disputed', {
		sourceLayer: 'boundaries',
		filter: fDisputed,
		color: c.boundaryDisputed,
		lineDasharray: [1, 3],
		lineCap: 'round',
		lineJoin: 'round',
		size: COUNTRY_WIDTH,
		group: 'boundaries.country',
	});

	// maritime: deeper-blue solid line over the water; grows in from z4→5 as it appears
	yield b.line('boundary-country-maritime', {
		sourceLayer: 'boundaries',
		filter: fMaritime,
		color: c.water.darken(0.13),
		lineCap: 'round',
		lineJoin: 'round',
		appear: 4,
		size: COUNTRY_WIDTH,
		group: 'boundaries.country',
	});
}

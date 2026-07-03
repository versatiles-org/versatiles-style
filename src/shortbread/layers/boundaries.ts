import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Administrative boundary lines (country / state, with disputed + maritime variants).
//
// Restored to the old VersaTiles style: each admin line is drawn as a light "casing" (halo) pass
// first, then the coloured line on top — the casing keeps the border legible over any background.
// Country/disputed share one (wider) casing + line width; state is narrower. Widths grow from 0 at
// their appear zoom. `maritime` is a newer addition (not in the old style): a single blue line over
// the water, no casing.

const lineCap = 'round';
const lineJoin = 'round';

const notMaritimeCoast: FilterSpecification[] = [
	['!=', ['get', 'maritime'], true],
	['!=', ['get', 'coastline'], true],
];
const COUNTRY = [
	'all',
	['==', ['get', 'admin_level'], 2],
	['!=', ['get', 'disputed'], true],
	...notMaritimeCoast,
] as FilterSpecification;
const DISPUTED = [
	'all',
	['==', ['get', 'admin_level'], 2],
	['==', ['get', 'disputed'], true],
	...notMaritimeCoast,
] as FilterSpecification;
const STATE = [
	'all',
	['==', ['get', 'admin_level'], 4],
	['!=', ['get', 'disputed'], true],
	...notMaritimeCoast,
] as FilterSpecification;
const MARITIME = [
	'all',
	['==', ['get', 'admin_level'], 2],
	['==', ['get', 'maritime'], true],
	['!=', ['get', 'disputed'], true],
	['!=', ['get', 'coastline'], true],
] as FilterSpecification;

export function* boundaries(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c, fg } = ctx;

	// Casing (halo) and line widths, per the old style. Country/disputed share the wide curves; state
	// is narrower. All grow from 0 at their appear zoom.
	const countryCasingSize = { 0: 0, 3: 2, 10: 8 };
	const countryLineSize = { 0: 0, 3: 1, 10: 4 };
	const stateCasingSize = { 7: 0, 8: 2, 10: 4 };
	const stateLineSize = { 7: 0, 8: 1, 10: 2 };

	// The casing is the light background colour at 0.75 opacity — a faint halo behind the line.
	const casing = { sourceLayer: 'boundaries', color: c.background, opacity: 0.75, lineCap, lineJoin };

	// ── casings (drawn beneath all the coloured lines) ──
	yield b.line('boundary-country:outline', {
		...casing,
		filter: COUNTRY,
		size: countryCasingSize,
		group: 'boundaries.country',
	});
	yield b.line('boundary-country-disputed:outline', {
		...casing,
		filter: DISPUTED,
		size: countryCasingSize,
		group: 'boundaries.country',
	});
	yield b.line('boundary-state:outline', {
		...casing,
		filter: STATE,
		size: stateCasingSize,
		group: 'boundaries.state',
	});

	// ── coloured lines ──
	// country: solid
	yield b.line('boundary-country', {
		sourceLayer: 'boundaries',
		filter: COUNTRY,
		color: c.boundary,
		size: countryLineSize,
		lineCap,
		lineJoin,
		group: 'boundaries.country',
	});
	// disputed: dashed
	yield b.line('boundary-country-disputed', {
		sourceLayer: 'boundaries',
		filter: DISPUTED,
		color: c.boundaryDisputed,
		size: countryLineSize,
		lineDasharray: [2, 1],
		lineCap,
		lineJoin,
		group: 'boundaries.country',
	});
	// state: solid, fades in over z7→8 (Shortbread serves admin-4 from z7)
	yield b.line('boundary-state', {
		sourceLayer: 'boundaries',
		filter: STATE,
		color: c.boundary,
		size: stateLineSize,
		appear: 7,
		lineCap,
		lineJoin,
		group: 'boundaries.state',
	});
	// maritime: deeper-blue solid line over the water; fades in over z4→5 (newer; not in the old style)
	yield b.line('boundary-country-maritime', {
		sourceLayer: 'boundaries',
		filter: MARITIME,
		color: c.water.blend(0.03, fg),
		size: countryLineSize,
		appear: 4,
		lineCap,
		lineJoin,
		group: 'boundaries.country',
	});
}

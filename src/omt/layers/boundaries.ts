import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';

// Administrative boundary lines for OpenMapTiles (country / state, with disputed + maritime variants).
// A direct port of the Shortbread module: same casing-then-line construction, same widths, same colours.
//
// ── The one difference, and it is a silent-failure class ──────────────────────
//
// Shortbread carries `disputed` and `maritime` as **booleans**; `npm run schema-values -- omt boundary`
// shows OpenMapTiles carries them as **integers 0/1**. A copied `['==', ['get', 'disputed'], true]` is
// simply false against a `1`, so a straight port would have drawn no disputed borders at all and applied
// no maritime exclusion — with no error, and with nothing for the conformance suite to catch, because the
// *field* exists and only its value type differs.
//
// That is the same defect class as a filter on a missing field (`symbol-transit-subway` and its
// non-existent `station`), one level deeper, and it is the strongest argument for sampling values before
// porting rather than after.
//
// `admin_level` goes to 10 here (2, 4–10 observed) against Shortbread's 2 and 4, but only the two levels
// the style draws are relevant.

const lineCap = 'round';
const lineJoin = 'round';

const notMaritime: FilterSpecification[] = [['!=', ['get', 'maritime'], 1]];
const COUNTRY = [
	'all',
	['==', ['get', 'admin_level'], 2],
	['!=', ['get', 'disputed'], 1],
	...notMaritime,
] as FilterSpecification;
const DISPUTED = [
	'all',
	['==', ['get', 'admin_level'], 2],
	['==', ['get', 'disputed'], 1],
	...notMaritime,
] as FilterSpecification;
const STATE = [
	'all',
	['==', ['get', 'admin_level'], 4],
	['!=', ['get', 'disputed'], 1],
	...notMaritime,
] as FilterSpecification;
const MARITIME = [
	'all',
	['==', ['get', 'admin_level'], 2],
	['==', ['get', 'maritime'], 1],
	['!=', ['get', 'disputed'], 1],
] as FilterSpecification;

export function* boundaries(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c, fg } = ctx;

	const countryCasingSize = { 0: 0, 3: 2, 10: 8 };
	const countryLineSize = { 0: 0, 3: 1, 10: 4 };
	const stateCasingSize = { 7: 0, 8: 2, 10: 4 };
	const stateLineSize = { 7: 0, 8: 1, 10: 2 };

	const casing = { sourceLayer: 'boundary', color: c.background, opacity: 0.75, lineCap, lineJoin };

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
	yield b.line('boundary-country', {
		sourceLayer: 'boundary',
		filter: COUNTRY,
		color: c.boundary,
		size: countryLineSize,
		lineCap,
		lineJoin,
		group: 'boundaries.country',
	});
	yield b.line('boundary-country-disputed', {
		sourceLayer: 'boundary',
		filter: DISPUTED,
		color: c.boundaryDisputed,
		size: countryLineSize,
		lineDasharray: [2, 1],
		lineCap,
		lineJoin,
		group: 'boundaries.country',
	});
	// state: OpenMapTiles serves `boundary` from z0, so unlike Shortbread's z7 this fade is purely
	// cartographic — state borders at z3 are noise, not information.
	yield b.line('boundary-state', {
		sourceLayer: 'boundary',
		filter: STATE,
		color: c.boundary,
		size: stateLineSize,
		appear: 7,
		lineCap,
		lineJoin,
		group: 'boundaries.state',
	});
	yield b.line('boundary-country-maritime', {
		sourceLayer: 'boundary',
		filter: MARITIME,
		color: c.water.blend(0.03, fg),
		size: countryLineSize,
		appear: 4,
		lineCap,
		lineJoin,
		group: 'boundaries.country',
	});
}

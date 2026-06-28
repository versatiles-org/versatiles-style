import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Administrative boundary lines (country / state, with disputed + maritime variants).
// Each is drawn as a casing (`:outline`) pass then a main pass. `maritime` variants carry
// no styling rule in any palette, so they are emitted as bare (invisible) lines.

export function* boundaries(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c, bg } = ctx;
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

	// ── casing (:outline) pass ──
	yield b.line('boundary-country:outline', {
		sourceLayer: 'boundaries',
		filter: fCountry,
		color: c.land.blend(0.05, bg),
		lineBlur: 1,
		lineCap: 'round',
		lineJoin: 'round',
		size: { 2: 0, 3: 2, 10: 8 },
		opacity: 0.75,
		group: 'boundaries.country',
	});
	yield b.line('boundary-country-disputed:outline', {
		sourceLayer: 'boundaries',
		filter: fDisputed,
		color: c.land.blend(0.05, bg),
		size: { 2: 0, 3: 2, 10: 8 },
		opacity: 0.75,
		group: 'boundaries.country',
	});
	yield b.line('boundary-country-maritime:outline', {
		sourceLayer: 'boundaries',
		filter: fMaritime,
		group: 'boundaries.country',
	});
	yield b.line('boundary-state:outline', {
		sourceLayer: 'boundaries',
		filter: fState,
		color: c.land.blend(0.1, bg),
		lineBlur: 1,
		lineCap: 'round',
		lineJoin: 'round',
		size: { 7: 0, 8: 2, 10: 4 },
		opacity: 0.75,
		group: 'boundaries.state',
	});

	// ── main pass ──
	yield b.line('boundary-country', {
		sourceLayer: 'boundaries',
		filter: fCountry,
		color: c.boundary,
		lineCap: 'round',
		lineJoin: 'round',
		size: { 2: 0, 3: 1, 10: 4 },
		group: 'boundaries.country',
	});
	yield b.line('boundary-country-disputed', {
		sourceLayer: 'boundaries',
		filter: fDisputed,
		size: { 2: 0, 3: 1, 10: 4 },
		color: c.boundaryDisputed,
		lineDasharray: [2, 1],
		lineCap: 'square',
		group: 'boundaries.country',
	});
	yield b.line('boundary-country-maritime', {
		sourceLayer: 'boundaries',
		filter: fMaritime,
		group: 'boundaries.country',
	});
	yield b.line('boundary-state', {
		sourceLayer: 'boundaries',
		filter: fState,
		color: c.boundary,
		lineCap: 'round',
		lineJoin: 'round',
		size: { 7: 0, 8: 1, 10: 2 },
		group: 'boundaries.state',
	});
}

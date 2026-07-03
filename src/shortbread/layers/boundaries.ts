import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Administrative boundary lines (country / state, with disputed + maritime variants).
// Country/state are drawn as a casing (`:outline`) pass then a main pass. `maritime`
// variants render as a single faint dashed line (no casing) over the water.

export function* boundaries(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c, fg } = ctx;

	// OSM Bright draws boundaries as single lines (no casing). Widths interpolate with base 1.
	const def = {
		sourceLayer: 'boundaries',
		lineCap: 'round',
		lineJoin: 'round',
		group: 'boundaries.country',
		size: { base: 1, stops: { 0: 0.5, 2: 1, 6: 2.5, 12: 7 } },
	};

	const layers: b.TaggedLayer[] = [
		// state / province (admin 3–8): dashed, drawn beneath the country line. Shortbread serves
		// these from z7, so fade them in by opacity over z7→8 instead of popping.
		b.line('boundary-state', {
			sourceLayer: 'boundaries',
			filter: [
				'all',
				['==', ['get', 'admin_level'], 4],
				['!=', ['get', 'maritime'], true],
				['!=', ['get', 'disputed'], true],
				['!=', ['get', 'coastline'], true],
			],
			color: c.boundary,
			lineCap: 'round',
			lineJoin: 'round',
			minzoom: 2,
			appear: 7,
			size: { base: 1.4, stops: { 4: 0.4, 5: 1, 12: 3 } },
			lineDasharray: [3, 1, 1, 1],
			group: 'boundaries.state',
		}),
		// country (admin 2): solid
		b.line('boundary-country', {
			...def,
			filter: [
				'all',
				['==', ['get', 'admin_level'], 2],
				['!=', ['get', 'maritime'], true],
				['!=', ['get', 'disputed'], true],
				['!=', ['get', 'coastline'], true],
			],
			color: c.boundary,
		}),
		// disputed: dashed
		b.line('boundary-country-disputed', {
			...def,
			filter: [
				'all',
				['==', ['get', 'admin_level'], 2],
				['==', ['get', 'disputed'], true],
				['!=', ['get', 'maritime'], true],
				['!=', ['get', 'coastline'], true],
			],
			color: c.boundaryDisputed,
			lineDasharray: [1, 3],
		}),
		// maritime: deeper-blue solid line over the water; fades in by opacity over z4→5 as it appears
		b.line('boundary-country-maritime', {
			...def,
			filter: [
				'all',
				['==', ['get', 'admin_level'], 2],
				['==', ['get', 'maritime'], true],
				['!=', ['get', 'disputed'], true],
				['!=', ['get', 'coastline'], true],
			],
			color: c.water.blend(0.13, fg),
			appear: 4,
		}),
	];

	yield* b.gate(ctx.layers, ...layers);
}

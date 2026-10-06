import { describe, expect, it } from 'vitest';
import { resolveLayerGroups } from './layer-groups.js';

// The fully-resolved defaults: every group is visible (`true`).
const DEFAULTS = {
	land: {
		forest: true,
		vegetation: true,
		rock: true,
		wetland: true,
		sand: true,
		glacier: true,
		agriculture: true,
		urban: true,
	},
	water: { ocean: true, rivers: true, lakes: true, piers: true },
	roads: {
		motorways: true,
		highways: true,
		streets: { residential: true, service: true, pedestrian: true, track: true, bus: true },
		paths: { opacity: true, dashed: true, width: 1 },
		footway: { opacity: true, dashed: true, width: 1 },
		steps: { opacity: true, dashed: true, width: 1 },
	},
	transit: { rail: true, aerialways: true, ferries: true, stops: true },
	buildings: true,
	sites: true,
	airport: true,
	pois: true,
	boundaries: {
		country: { opacity: true, dashed: false, width: 1, halo: true },
		state: { opacity: true, dashed: true, width: 1, halo: true },
		disputed: { opacity: true, dashed: true, width: 1, halo: true },
	},
	markings: true,
	labels: {
		boundaries: { countries: true, states: true },
		places: { cities: true, villages: true, hamlets: true, districts: true },
		streets: { names: true, refs: true, exits: true },
		water: { lakes: true, rivers: true },
		addresses: true,
	},
	icons: true,
};

describe('resolveLayerGroups', () => {
	it('fills in every group with defaults, all visible', () => {
		expect(resolveLayerGroups()).toStrictEqual(DEFAULTS);
	});

	it('treats undefined and empty options identically', () => {
		expect(resolveLayerGroups({})).toStrictEqual(resolveLayerGroups());
	});

	// ── footway / steps default ────────────────────────────────────────────────────

	it('shows footway and steps by default', () => {
		expect(resolveLayerGroups().roads.footway.opacity).toBe(true);
		expect(resolveLayerGroups().roads.steps.opacity).toBe(true);
	});

	it('hides footway when explicitly disabled, leaving siblings at their defaults', () => {
		const r = resolveLayerGroups({ roads: { footway: false } });
		expect(r.roads.footway.opacity).toBe(false);
		expect(r.roads.steps.opacity).toBe(true); // sibling stays at its (visible) default
		expect(r.roads.paths.opacity).toBe(true);
	});

	it('shows steps when explicitly enabled, leaving siblings at their defaults', () => {
		const r = resolveLayerGroups({ roads: { steps: true } });
		expect(r.roads.steps.opacity).toBe(true);
		expect(r.roads.paths.opacity).toBe(true);
		expect(r.roads.motorways).toBe(true);
	});

	it('accepts an opacity for steps', () => {
		expect(resolveLayerGroups({ roads: { steps: 0.4 } }).roads.steps.opacity).toBe(0.4);
	});

	// ── scalar cascade ─────────────────────────────────────────────────────────────

	it('cascades a scalar on roads to every child, including footway and steps', () => {
		expect(resolveLayerGroups({ roads: true }).roads).toStrictEqual({
			motorways: true,
			highways: true,
			streets: { residential: true, service: true, pedestrian: true, track: true, bus: true },
			paths: { opacity: true, dashed: true, width: 1 },
			footway: { opacity: true, dashed: true, width: 1 },
			steps: { opacity: true, dashed: true, width: 1 },
		});
	});

	it('cascades a scalar on roads down through nested streets', () => {
		expect(resolveLayerGroups({ roads: 0.5 }).roads).toStrictEqual({
			motorways: 0.5,
			highways: 0.5,
			streets: { residential: 0.5, service: 0.5, pedestrian: 0.5, track: 0.5, bus: 0.5 },
			paths: { opacity: 0.5, dashed: true, width: 1 },
			footway: { opacity: 0.5, dashed: true, width: 1 },
			steps: { opacity: 0.5, dashed: true, width: 1 },
		});
	});

	it('hides all roads (including steps) when roads is false', () => {
		const r = resolveLayerGroups({ roads: false }).roads;
		expect(r.motorways).toBe(false);
		expect(r.streets.residential).toBe(false);
		expect(r.paths.opacity).toBe(false);
		expect(r.steps.opacity).toBe(false);
	});

	it('cascades a scalar on streets to its children only', () => {
		const r = resolveLayerGroups({ roads: { streets: 0.3 } }).roads;
		expect(r.streets).toStrictEqual({
			residential: 0.3,
			service: 0.3,
			pedestrian: 0.3,
			track: 0.3,
			bus: 0.3,
		});
		// siblings of `streets` stay at their defaults
		expect(r.motorways).toBe(true);
		expect(r.paths.opacity).toBe(true);
		expect(r.steps.opacity).toBe(true);
	});

	// ── object overrides ─────────────────────────────────────────────────────────

	it('applies per-child roads overrides, leaving unset children at defaults', () => {
		const r = resolveLayerGroups({ roads: { paths: false } }).roads;
		expect(r.paths.opacity).toBe(false);
		expect(r.steps.opacity).toBe(true); // unchanged default
		expect(r.motorways).toBe(true);
	});

	it('applies per-child streets overrides, leaving unset children visible', () => {
		const r = resolveLayerGroups({ roads: { streets: { service: false } } }).roads;
		expect(r.streets.service).toBe(false);
		expect(r.streets.residential).toBe(true);
		expect(r.streets.pedestrian).toBe(true);
	});

	it('lets an explicit child override an inherited scalar', () => {
		const r = resolveLayerGroups({ roads: { streets: 0.3, paths: false, steps: true } }).roads;
		expect(r.streets.residential).toBe(0.3);
		expect(r.paths.opacity).toBe(false);
		expect(r.steps.opacity).toBe(true);
		expect(r.motorways).toBe(true);
	});

	// ── flat (single-level) groups ─────────────────────────────────────────────────

	it('cascades a scalar on a flat group to every child', () => {
		expect(resolveLayerGroups({ land: false }).land).toStrictEqual({
			forest: false,
			vegetation: false,
			rock: false,
			wetland: false,
			sand: false,
			glacier: false,
			agriculture: false,
			urban: false,
		});
	});

	it('applies per-child flat-group overrides, leaving the rest visible', () => {
		const land = resolveLayerGroups({ land: { forest: 0.1 } }).land;
		expect(land.forest).toBe(0.1);
		expect(land.vegetation).toBe(true);
		expect(land.urban).toBe(true);
	});

	it('resolves water, transit, boundaries and labels groups', () => {
		const r = resolveLayerGroups({
			water: { ocean: false },
			transit: 0.5,
			boundaries: { state: false },
			labels: false,
		});
		expect(r.water.ocean).toBe(false);
		expect(r.water.rivers).toBe(true);
		expect(r.transit).toStrictEqual({ rail: 0.5, aerialways: 0.5, ferries: 0.5, stops: 0.5 });
		expect(r.boundaries).toStrictEqual({
			country: { opacity: true, dashed: false, width: 1, halo: true },
			state: { opacity: false, dashed: true, width: 1, halo: true },
			disputed: { opacity: true, dashed: true, width: 1, halo: true },
		});
		expect(r.labels).toStrictEqual({
			boundaries: { countries: false, states: false },
			places: { cities: false, villages: false, hamlets: false, districts: false },
			streets: { names: false, refs: false, exits: false },
			water: { lakes: false, rivers: false },
			addresses: false,
		});
	});

	it('cascades a label group scalar to its children, and lets a child override it', () => {
		const r = resolveLayerGroups({ labels: { water: 0.5, streets: { refs: false }, boundaries: false } });
		expect(r.labels.water).toStrictEqual({ lakes: 0.5, rivers: 0.5 });
		expect(r.labels.streets).toStrictEqual({ names: true, refs: false, exits: true });
		expect(r.labels.boundaries).toStrictEqual({ countries: false, states: false });
		expect(r.labels.places).toStrictEqual({ cities: true, villages: true, hamlets: true, districts: true });
	});

	it('rejects the old flat label keys and `default`, which only the font tree has', () => {
		expect(() => resolveLayerGroups({ labels: { states: false } as never })).toThrow('unknown option "labels.states"');
		expect(() => resolveLayerGroups({ labels: { water: { default: false } } as never })).toThrow(
			'unknown option "labels.water.default"'
		);
	});

	// ── top-level scalar groups ────────────────────────────────────────────────────

	it('resolves top-level scalar groups', () => {
		const r = resolveLayerGroups({ buildings: false, pois: 0.5, airport: true });
		expect(r.buildings).toBe(false);
		expect(r.pois).toBe(0.5);
		expect(r.airport).toBe(true);
		expect(r.sites).toBe(true); // untouched default
		expect(r.icons).toBe(true);
	});

	// ── icons alias ────────────────────────────────────────────────────────────────

	it('applies the icons alias to pois, markings and transit.stops', () => {
		const r = resolveLayerGroups({ icons: false });
		expect(r.pois).toBe(false);
		expect(r.markings).toBe(false);
		expect(r.transit.stops).toBe(false);
		expect(r.icons).toBe(false);
		// non-icon groups are unaffected
		expect(r.transit.rail).toBe(true);
		expect(r.buildings).toBe(true);
	});

	it('lets a specific icon group override the icons alias', () => {
		const r = resolveLayerGroups({ icons: false, pois: true, transit: { stops: 0.5 } });
		expect(r.pois).toBe(true);
		expect(r.transit.stops).toBe(0.5);
		expect(r.markings).toBe(false); // still driven by the alias
	});

	it('lets a transit scalar override the icons alias for stops', () => {
		const r = resolveLayerGroups({ icons: false, transit: true });
		expect(r.transit.stops).toBe(true);
		expect(r.pois).toBe(false); // pois still hidden by the alias
	});

	// ── opacity normalization ──────────────────────────────────────────────────────

	it('normalizes an out-of-range opacity to a boolean, keeping values in [0, 1]', () => {
		const r = resolveLayerGroups({
			roads: { motorways: 0, highways: 1, paths: 0.5, steps: 2 },
			buildings: -1,
		});
		expect(r.roads.motorways).toBe(false); // 0 → hidden
		expect(r.roads.highways).toBe(1); // 1 stays a number — see below
		expect(r.roads.paths.opacity).toBe(0.5); // fractional stays a number
		expect(r.roads.steps.opacity).toBe(true); // 2 → clamped to fully visible
		expect(r.buildings).toBe(false); // negative → hidden
	});

	// An explicit 1 used to collapse to `true`. It no longer does, because the two mean different
	// things for a layer the cartography draws below full opacity: `true` leaves `building-3d` at its
	// 0.7, where `1` asks for opaque. `gate` skips a factor of 1, so nothing else sees a difference.
	it('keeps an explicit 1 distinct from true, which the 3D buildings opacity reads', () => {
		expect(resolveLayerGroups({ buildings: 1 }).buildings).toBe(1);
		expect(resolveLayerGroups({ buildings: true }).buildings).toBe(true);
		expect(resolveLayerGroups({}).buildings).toBe(true);
	});

	it('normalizes a cascaded scalar too', () => {
		expect(resolveLayerGroups({ roads: 0 }).roads.motorways).toBe(false);
		expect(resolveLayerGroups({ land: 5 }).land.forest).toBe(true);
	});
});

// ── line styles ────────────────────────────────────────────────────────────────

describe('line groups: borders and paths', () => {
	const boundaries = (layers: Parameters<typeof resolveLayerGroups>[0]) => resolveLayerGroups(layers).boundaries;

	it('dashes every line group but the country border by default', () => {
		const r = resolveLayerGroups();
		expect(r.boundaries.country.dashed).toBe(false);
		expect(
			[r.boundaries.state, r.boundaries.disputed, r.roads.paths, r.roads.footway, r.roads.steps].map((l) => l.dashed)
		).toStrictEqual([true, true, true, true, true]);
	});

	it('takes a plain value as the opacity, and an object as both', () => {
		expect(boundaries({ boundaries: { state: 0.5 } }).state).toStrictEqual({
			opacity: 0.5,
			dashed: true,
			width: 1,
			halo: true,
		});
		expect(boundaries({ boundaries: { state: { opacity: 0.5 } } }).state).toStrictEqual({
			opacity: 0.5,
			dashed: true,
			width: 1,
			halo: true,
		});
		expect(boundaries({ boundaries: { state: { dashed: false } } }).state).toStrictEqual({
			opacity: true,
			dashed: false,
			width: 1,
			halo: true,
		});
		expect(
			boundaries({ boundaries: { country: { opacity: 0.3, dashed: true, width: 1, halo: true } } }).country
		).toStrictEqual({
			opacity: 0.3,
			dashed: true,
			width: 1,
			halo: true,
		});
	});

	it('takes a dash pattern of the caller, as a copy', () => {
		const pattern = [4, 2, 1, 2];
		const r = resolveLayerGroups({ roads: { footway: { dashed: pattern } } }).roads.footway;
		expect(r.dashed).toStrictEqual([4, 2, 1, 2]);
		expect(r.dashed).not.toBe(pattern);
	});

	it('inherits the opacity from a scalar above, and never the dash', () => {
		expect(boundaries({ boundaries: 0.5 })).toStrictEqual({
			country: { opacity: 0.5, dashed: false, width: 1, halo: true },
			state: { opacity: 0.5, dashed: true, width: 1, halo: true },
			disputed: { opacity: 0.5, dashed: true, width: 1, halo: true },
		});
		expect(boundaries(false).state).toStrictEqual({ opacity: false, dashed: true, width: 1, halo: true });
		// an object that sets only the dash still takes the opacity cascading down to it
		expect(resolveLayerGroups({ roads: 0.5 }).roads.steps.opacity).toBe(0.5);
	});

	it('normalises the opacity of a line style as it does a plain value', () => {
		expect(boundaries({ boundaries: { state: { opacity: 0 } } }).state.opacity).toBe(false);
		expect(boundaries({ boundaries: { state: { opacity: 2 } } }).state.opacity).toBe(true);
		expect(boundaries({ boundaries: { state: { opacity: 1 } } }).state.opacity).toBe(1);
	});

	it('accepts what it resolved to', () => {
		const once = resolveLayerGroups({
			boundaries: { state: { opacity: 0.4, dashed: [1, 2] } },
			roads: { footway: false },
		});
		expect(resolveLayerGroups(once)).toStrictEqual(once);
	});

	it('rejects an unknown key and a dash that is not a pattern', () => {
		expect(() => resolveLayerGroups({ boundaries: { state: { dash: true } as never } })).toThrow(
			'unknown option "boundaries.state.dash"'
		);
		for (const dashed of [[1], [1, 2, 3], [0, 0], [1, -1], [1, NaN], 'dotted', 2]) {
			expect(
				() => resolveLayerGroups({ boundaries: { state: { dashed: dashed as never } } }),
				JSON.stringify(dashed)
			).toThrow('layers.boundaries.state.dashed: expected true, false or a dash pattern');
		}
	});

	it('rejects a line style on a group that is not a line', () => {
		expect(() => resolveLayerGroups({ buildings: { dashed: true } as never })).toThrow(
			'layers.buildings: expected a boolean or a number'
		);
		expect(() => resolveLayerGroups({ roads: { motorways: { opacity: 0.5 } as never } })).toThrow(
			'layers.roads.motorways: expected a boolean or a number'
		);
		expect(() => resolveLayerGroups({ land: { forest: { opacity: 0.5 } as never } })).toThrow(
			'layers.land.forest: expected a boolean or a number'
		);
	});

	it('takes a width on every line group and a halo on the borders, with defaults of 1 and true', () => {
		const r = resolveLayerGroups();
		for (const line of [r.roads.paths, r.roads.footway, r.roads.steps]) {
			expect(line.width).toBe(1);
			expect('halo' in line).toBe(false);
		}
		for (const border of [r.boundaries.country, r.boundaries.state, r.boundaries.disputed]) {
			expect(border.width).toBe(1);
			expect(border.halo).toBe(true);
		}
		expect(boundaries({ boundaries: { state: { width: 0.5, halo: false } } }).state).toStrictEqual({
			opacity: true,
			dashed: true,
			width: 0.5,
			halo: false,
		});
		expect(resolveLayerGroups({ roads: { footway: { width: 2 } } }).roads.footway).toStrictEqual({
			opacity: true,
			dashed: true,
			width: 2,
		});
	});

	it('never inherits a width or a halo from a scalar above', () => {
		expect(boundaries({ boundaries: 0.5 }).state).toMatchObject({ opacity: 0.5, width: 1, halo: true });
	});

	it('rejects a width that is not a number above 0, and a halo that is not a boolean', () => {
		for (const width of [0, -1, NaN, Infinity, '2']) {
			expect(() => resolveLayerGroups({ boundaries: { state: { width: width as never } } }), String(width)).toThrow(
				/layers\.boundaries\.state\.width: expected a (finite number|number above 0)/
			);
		}
		expect(() => resolveLayerGroups({ boundaries: { state: { halo: 1 as never } } })).toThrow(
			'layers.boundaries.state.halo: expected true or false'
		);
	});

	it('rejects a halo on a path, which has none', () => {
		expect(() => resolveLayerGroups({ roads: { footway: { halo: false } as never } })).toThrow(
			'unknown option "roads.footway.halo"'
		);
	});
});

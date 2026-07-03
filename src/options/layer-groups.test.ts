import { describe, expect, it } from 'vitest';
import { resolveLayerGroups } from './layer-groups.js';

// The fully-resolved defaults: every group visible (`true`) except `roads.steps`, which is hidden.
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
		paths: true,
		footway: false,
		steps: false,
	},
	transit: { rail: true, aerialways: true, ferries: true, stops: true },
	buildings: true,
	sites: true,
	airport: true,
	pois: true,
	boundaries: { country: true, state: true },
	markings: true,
	labels: { places: true, streets: true, states: true, countries: true, addresses: true },
	icons: true,
};

describe('resolveLayerGroups', () => {
	it('fills in every group with defaults, and hides steps by default', () => {
		expect(resolveLayerGroups()).toStrictEqual(DEFAULTS);
	});

	it('treats undefined and empty options identically', () => {
		expect(resolveLayerGroups({})).toStrictEqual(resolveLayerGroups());
	});

	// ── footway / steps default ────────────────────────────────────────────────────

	it('keeps footway and steps hidden by default', () => {
		expect(resolveLayerGroups().roads.footway).toBe(false);
		expect(resolveLayerGroups().roads.steps).toBe(false);
	});

	it('shows footway when explicitly enabled, leaving siblings at their defaults', () => {
		const r = resolveLayerGroups({ roads: { footway: true } });
		expect(r.roads.footway).toBe(true);
		expect(r.roads.steps).toBe(false); // sibling stays hidden
		expect(r.roads.paths).toBe(true);
	});

	it('shows steps when explicitly enabled, leaving siblings at their defaults', () => {
		const r = resolveLayerGroups({ roads: { steps: true } });
		expect(r.roads.steps).toBe(true);
		expect(r.roads.paths).toBe(true);
		expect(r.roads.motorways).toBe(true);
	});

	it('accepts an opacity for steps', () => {
		expect(resolveLayerGroups({ roads: { steps: 0.4 } }).roads.steps).toBe(0.4);
	});

	// ── scalar cascade ─────────────────────────────────────────────────────────────

	it('cascades a scalar on roads to every child, re-enabling footway and steps', () => {
		expect(resolveLayerGroups({ roads: true }).roads).toStrictEqual({
			motorways: true,
			highways: true,
			streets: { residential: true, service: true, pedestrian: true, track: true, bus: true },
			paths: true,
			footway: true,
			steps: true,
		});
	});

	it('cascades a scalar on roads down through nested streets', () => {
		expect(resolveLayerGroups({ roads: 0.5 }).roads).toStrictEqual({
			motorways: 0.5,
			highways: 0.5,
			streets: { residential: 0.5, service: 0.5, pedestrian: 0.5, track: 0.5, bus: 0.5 },
			paths: 0.5,
			footway: 0.5,
			steps: 0.5,
		});
	});

	it('hides all roads (including steps) when roads is false', () => {
		const r = resolveLayerGroups({ roads: false }).roads;
		expect(r.motorways).toBe(false);
		expect(r.streets.residential).toBe(false);
		expect(r.paths).toBe(false);
		expect(r.steps).toBe(false);
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
		expect(r.paths).toBe(true);
		expect(r.steps).toBe(false);
	});

	// ── object overrides ─────────────────────────────────────────────────────────

	it('applies per-child roads overrides, leaving unset children at defaults', () => {
		const r = resolveLayerGroups({ roads: { paths: false } }).roads;
		expect(r.paths).toBe(false);
		expect(r.steps).toBe(false); // unchanged default
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
		expect(r.paths).toBe(false);
		expect(r.steps).toBe(true);
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
		expect(r.boundaries).toStrictEqual({ country: true, state: false });
		expect(r.labels).toStrictEqual({
			places: false,
			streets: false,
			states: false,
			countries: false,
			addresses: false,
		});
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

	it('normalizes a non-fractional opacity to a boolean, keeping fractional values', () => {
		const r = resolveLayerGroups({
			roads: { motorways: 0, highways: 1, paths: 0.5, steps: 2 },
			buildings: -1,
		});
		expect(r.roads.motorways).toBe(false); // 0 → hidden
		expect(r.roads.highways).toBe(true); // 1 → fully visible
		expect(r.roads.paths).toBe(0.5); // fractional stays a number
		expect(r.roads.steps).toBe(true); // 2 → fully visible
		expect(r.buildings).toBe(false); // negative → hidden
	});

	it('normalizes a cascaded scalar too', () => {
		expect(resolveLayerGroups({ roads: 0 }).roads.motorways).toBe(false);
		expect(resolveLayerGroups({ land: 5 }).land.forest).toBe(true);
	});
});

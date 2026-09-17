import type { ExpressionSpecification, FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';
import { labelStyles, placeLabel, placeSecondary, type PlaceLabelDef } from '../../cartography/index.js';

// Text labels for Protomaps.
//
// ── No label layers at all ────────────────────────────────────────────────────
//
// Shortbread has six label source-layers and OpenMapTiles three; Protomaps has none. Names live on the
// feature layers themselves — `roads` carries `name` and six `shield_text` slots, `water` its own names,
// `buildings` an `addr_housenumber`. So every label here reads the same source-layer as the geometry it
// names, and the layers that would otherwise pair up (`street_labels` with `streets`) collapse.
//
// ── What Protomaps gets right that OpenMapTiles lost ──────────────────────────
//
// `places` carries `population` **and** `population_rank`, so the settlement sort key that Shortbread
// uses survives intact — the OpenMapTiles port had to substitute `rank`. There is still no `way_area`,
// so the water-label size buckets are re-derived from `kind` exactly as they were there, with the same
// consequence: a great lake goes unnamed at world zoom rather than every pond being named at z4.

const LINES: ExpressionSpecification = ['==', ['geometry-type'], 'LineString'];
const POINTS: ExpressionSpecification = ['==', ['geometry-type'], 'Point'];

/** Shortbread's sort key, which Protomaps can reproduce exactly. */
const POP_SORT_KEY = ['-', ['to-number', ['get', 'population'], 0]];
const PLACE_SOURCE = { sourceLayer: 'places', sortKey: POP_SORT_KEY };

const byKind = (...kinds: string[]): ExpressionSpecification =>
	kinds.length === 1 ? ['==', ['get', 'kind'], kinds[0]] : ['in', ['get', 'kind'], ['literal', [...kinds]]];

// ── Places: the type is in `kind_detail` ──────────────────────────────────────
//
// Protomaps files settlements under three coarse kinds and puts the type Shortbread calls `kind` in
// `kind_detail` (every cached tile, z2–15):
//
//   kind: locality       kind_detail: city, town, village, hamlet, isolated_dwelling, locality, farm
//   kind: neighbourhood  kind_detail: neighbourhood, suburb
//   kind: macrohood      kind_detail: quarter
//
// So the type is read as `kind_detail`, falling back to `kind` for a feature without one. Filtering on
// `kind: city` — as this module once did — matched nothing, and Protomaps drew no settlement labels.
//
// `capital` is a string: `yes` for a national capital, and an admin level (`4` for a state capital, but
// also `5`–`8`) otherwise. Only `yes` and `4` are capitals in Shortbread's sense; the rest stay cities
// and towns. `2` is accepted as a national capital too, for builds that write the admin level there.
const PLACE_TYPE: ExpressionSpecification = ['coalesce', ['get', 'kind_detail'], ['get', 'kind']];
const byType = (type: string): ExpressionSpecification => ['==', PLACE_TYPE, type];
const CAPITAL: ExpressionSpecification = ['to-string', ['get', 'capital']];
const IS_CAPITAL: ExpressionSpecification = ['in', CAPITAL, ['literal', ['yes', '2']]];
const IS_STATE_CAPITAL: ExpressionSpecification = ['==', CAPITAL, '4'];
const NOT_A_CAPITAL: ExpressionSpecification = ['!', ['in', CAPITAL, ['literal', ['yes', '2', '4']]]];

const PLACES_SMALL: PlaceLabelDef[] = [
	{ id: 'neighbourhood', filter: byType('neighbourhood'), minzoom: 14, size: 12 },
	{ id: 'quarter', filter: byType('quarter'), minzoom: 13, size: 13 },
	{ id: 'suburb', filter: byType('suburb'), minzoom: 10, size: { 11: 11, 13: 14 } },
	{ id: 'hamlet', filter: byType('hamlet'), minzoom: 13, size: { 10: 11, 12: 14 } },
	{ id: 'village', filter: byType('village'), minzoom: 10, size: { 9: 11, 12: 14 } },
	{ id: 'town', filter: ['all', byType('town'), NOT_A_CAPITAL], minzoom: 7, size: { 8: 11, 12: 14 } },
];

const PLACES_LARGE: PlaceLabelDef[] = [
	{
		id: 'city',
		filter: ['all', byType('city'), NOT_A_CAPITAL],
		minzoom: 6,
		maxzoom: 14,
		size: { 7: 11, 10: 14 },
	},
	{ id: 'statecapital', filter: IS_STATE_CAPITAL, minzoom: 4, maxzoom: 14, size: { 6: 11, 10: 15 } },
	{ id: 'capital', filter: IS_CAPITAL, minzoom: 4, maxzoom: 12, size: { 5: 12, 10: 16 } },
];

/**
 * Country bands by `population_rank`, the nearest thing to Shortbread's `way_area` buckets.
 *
 * The zooms follow the data Shortbread's tiles carry, not its style: its `boundary_labels` hold only the
 * largest countries at z2, the first medium ones at z3 and small ones from z5, so its map thins out
 * country names at low zoom whatever the style says. Starting the medium bucket at z3 and the small one
 * at z5 gives this schema the same density: in the world view at z2 its tiles hold 72 country names,
 * Shortbread's 13.
 */
const COUNTRIES: { id: string; rank: ExpressionSpecification; minzoom: number; maxzoom: number; size: b.SizeValue }[] =
	[
		{ id: 'large', rank: ['>=', ['get', 'population_rank'], 14], minzoom: 2, maxzoom: 9, size: { 2: 8, 5: 13 } },
		{
			id: 'medium',
			rank: ['all', ['<', ['get', 'population_rank'], 14], ['>=', ['get', 'population_rank'], 11]],
			minzoom: 3,
			maxzoom: 10,
			size: { 3: 8, 5: 12 },
		},
		{ id: 'small', rank: ['<', ['get', 'population_rank'], 11], minzoom: 5, maxzoom: 10, size: { 4: 8, 5: 11 } },
	];

const STREET_KINDS = ['minor_road', 'major_road', 'highway'];

// House numbers: an attribute of the building, not a layer of its own, and there is no `unit`.
export function* addresses(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield b.symbol('label-address-housenumber', {
		sourceLayer: 'buildings',
		filter: ['has', 'addr_housenumber'],
		layout: { 'text-field': ['get', 'addr_housenumber'] },
		color: ctx.c.labelHousenumber,
		symbolPlacement: 'point',
		textAnchor: 'center',
		minzoom: 17,
		size: { 17: 8, 19: 10 },
		group: 'labels.addresses',
	});
}

export function* featureLabels(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;
	const streetBase = labelStyles(ctx).street;
	const waterBase = labelStyles(ctx).water;

	// Motorway shields: `roads` carries `shield_text` alongside `ref`, which is what a renderer is meant
	// to draw in the shield. There is no junction-point layer, so no exit-number label.
	yield b.symbol('label-motorway-shield', {
		sourceLayer: 'roads',
		filter: ['all', LINES, ['==', ['get', 'kind_detail'], 'motorway'], ['has', 'shield_text']] as FilterSpecification,
		layout: { 'text-field': ['get', 'shield_text'] },
		color: c.labelShield,
		textHaloColor: c.roadMotorway,
		symbolPlacement: 'line',
		textAnchor: 'center',
		minzoom: 14,
		size: { 14: 10, 18: 12, 20: 16 },
		group: 'labels.streets.refs',
	});

	for (const kind of STREET_KINDS) {
		yield b.symbol('label-street-' + kind.replace(/_/g, ''), {
			sourceLayer: 'roads',
			filter: ['all', LINES, ['==', ['get', 'kind'], kind]] as FilterSpecification,
			layout: { 'text-field': ctx.nameField },
			...streetBase,
			group: 'labels.streets.names',
		});
	}
	// No `label-street-pedestrian-zone`: the pedestrian area is a `landuse` polygon here, and `landuse`
	// carries only `kind` and `sort_rank` — no name to draw. Emitting it would filter on a field the tiles
	// do not have, which renders nothing and hides the fact.

	// Water areas, bucketed by kind — no `way_area` here either. See the header.
	//
	// The names are on **points**. Every water polygon in the tiles is unnamed; each named water body has
	// a separate point feature of the same `kind` (in the cached tiles: 123 `water`, 68 `fountain`, 15 `sea`,
	// 11 `bay`). Reading polygons, as these layers once did, labelled no lake, sea or fountain at all.
	// Fountains get Shortbread's smallest bucket: they are the ponds and cascades it labels from z15.
	const WATER_AREAS: { id: string; kinds: string[]; appear: number; size: Record<number, number> }[] = [
		{ id: 'major', kinds: ['ocean', 'sea'], appear: 4, size: { 4: 11, 10: 14 } },
		{ id: 'large', kinds: ['bay', 'strait'], appear: 8, size: { 8: 10, 12: 13 } },
		{ id: 'medium', kinds: ['lake', 'water', 'dock'], appear: 11, size: { 11: 10, 14: 12 } },
		{ id: 'small', kinds: ['fountain'], appear: 15, size: { 14: 10, 17: 12 } },
	];
	for (const bucket of WATER_AREAS) {
		yield b.symbol('label-water-area-' + bucket.id, {
			sourceLayer: 'water',
			filter: ['all', POINTS, byKind(...bucket.kinds)] as FilterSpecification,
			layout: { 'text-field': ctx.nameField },
			...waterBase,
			symbolPlacement: 'point',
			appear: bucket.appear,
			size: bucket.size,
			group: 'labels.water.lakes',
		});
	}

	yield b.symbol('label-water-river', {
		sourceLayer: 'water',
		filter: ['all', LINES, byKind('river', 'canal')] as FilterSpecification,
		layout: { 'text-field': ctx.nameField },
		...waterBase,
		symbolPlacement: 'line',
		minzoom: 12,
		size: { 12: 10, 15: 12 },
		group: 'labels.water.rivers',
	});
	yield b.symbol('label-water-stream', {
		sourceLayer: 'water',
		filter: ['all', LINES, byKind('stream', 'ditch')] as FilterSpecification,
		layout: { 'text-field': ctx.nameField },
		...waterBase,
		symbolPlacement: 'line',
		minzoom: 14,
		size: { 14: 9, 17: 11 },
		group: 'labels.water.rivers',
	});
}

export function* placeLabels(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { place: placeBase, boundary: boundaryBase } = labelStyles(ctx);

	for (const p of PLACES_SMALL) yield placeLabel(ctx, placeBase, p, PLACE_SOURCE);

	// Region labels are `places` kinds, as in the OpenMapTiles port.
	yield b.symbol('label-boundary-state', {
		sourceLayer: 'places',
		filter: byKind('region', 'province'),
		layout: { 'text-field': ctx.nameField, 'symbol-sort-key': POP_SORT_KEY },
		...boundaryBase,
		minzoom: 3,
		maxzoom: 10,
		color: placeSecondary(ctx),
		size: { 5: 8, 8: 12 },
		group: 'labels.boundaries.states',
	});

	for (const p of PLACES_LARGE) yield placeLabel(ctx, placeBase, p, PLACE_SOURCE);

	for (const country of COUNTRIES) {
		yield b.symbol('label-boundary-country-' + country.id, {
			sourceLayer: 'places',
			filter: ['all', byKind('country'), country.rank] as FilterSpecification,
			layout: { 'text-field': ctx.nameField, 'symbol-sort-key': POP_SORT_KEY },
			...boundaryBase,
			minzoom: country.minzoom,
			maxzoom: country.maxzoom,
			size: country.size,
			group: 'labels.boundaries.countries',
		});
	}
}

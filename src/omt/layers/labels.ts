import type { ExpressionSpecification, FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl';
import { labelStyles, placeLabel, placeSecondary, type PlaceLabelDef } from '../../cartography';

// Text labels for OpenMapTiles, in the same two bands as the Shortbread module: `featureLabels`
// (motorway refs/shields, street names, water names), then transit stops, then `placeLabels`
// (settlements, states, countries). House numbers are separate and lowest-priority (`addresses`).
//
// ── Where the schemas part ────────────────────────────────────────────────────
//
// Shortbread keeps names in label layers of their own — `street_labels`, `water_polygons_labels`,
// `place_labels`, `boundary_labels`, eight in all. OpenMapTiles has three: `transportation_name`,
// `water_name` and `place`, with `waterway` and `housenumber` carrying their own names. Sampled with
// `npm run schema-values -- omt place water_name transportation_name`:
//
//   place.class      state 1267  neighbourhood 252  village 242  country 200  province 147  city 126
//                    quarter 66  hamlet 38  suburb 25  town 22  island 14  continent 7  borough 1
//   place.capital    2 (national) and 4 (state) — plus 5 and 6
//   place.rank       country 1–3 (+6), state 1–6 — an importance order, 1 highest
//   water_name.class lake 81  bay 45  sea 31  strait 1
//   transportation_name point features are all `subclass: junction`, most with a `ref`
//
// Three consequences, in descending order of how much they change the map:
//
//  1. **Sizing signals are different, and one is better.** Shortbread buckets country labels by
//     `way_area` and sorts settlements by `population`; OpenMapTiles has neither, and offers `rank`
//     instead. `rank` is the better signal — it is an importance order rather than a geometric proxy —
//     so the three country buckets become rank bands and the settlement sort key becomes `rank`.
//  2. **Water-area labels lose their size discrimination**, and this one is a real regression. Shortbread
//     buckets lake labels by `way_area` precisely because a name says nothing about whether a feature
//     deserves a label at continental zoom: the Berlin cascade of 3325 m² once labelled from z4 beside
//     the North Sea. `water_name` carries no `way_area` and no `rank`, so a pond and a great lake are
//     indistinguishable — both are `class: lake`. The only honest options are to label every lake early
//     (reintroducing that bug) or none of them early (losing the great lakes' low-zoom names). This
//     module takes the second: `sea`/`strait` from z4 and `bay` from z8, where the class itself implies
//     scale, and `lake` only from z11. A great lake therefore goes unnamed at world zoom, which is a
//     visible difference from the Shortbread map and belongs in a §8.2 comparison, not in a silent fix.
//  3. **Two label layers collapse into one each.** Pedestrian-square labels have no separate source here
//     (`transportation_name` carries no polygons), so they fold into the pedestrian street label; and
//     state labels come from `place` rather than a boundary-label layer.

const LINES: ExpressionSpecification = ['==', ['geometry-type'], 'LineString'];
const POINTS: ExpressionSpecification = ['==', ['geometry-type'], 'Point'];

/** Settlement priority. Shortbread sorts by descending population; `rank` ascends with unimportance,
 *  so it is used directly — and a missing rank sorts last rather than first. */
const RANK_SORT_KEY = ['to-number', ['get', 'rank'], 99];

/** Where settlement labels come from, and what decides which one survives a collision. */
const PLACE_SOURCE = { sourceLayer: 'place', sortKey: RANK_SORT_KEY };

const byClass = (...classes: string[]): ExpressionSpecification =>
	classes.length === 1 ? ['==', ['get', 'class'], classes[0]] : ['in', ['get', 'class'], ['literal', [...classes]]];

// Districts and quarters are lighter, as in the Shortbread module. Sizes carried over.
const PLACES_SMALL: PlaceLabelDef[] = [
	{ id: 'neighbourhood', filter: byClass('neighbourhood', 'borough'), minzoom: 14, size: 12 },
	{ id: 'quarter', filter: byClass('quarter'), minzoom: 13, size: 13 },
	{ id: 'suburb', filter: byClass('suburb'), minzoom: 10, size: { 11: 11, 13: 14 } },
	{ id: 'hamlet', filter: byClass('hamlet'), minzoom: 13, size: { 10: 11, 12: 14 } },
	{ id: 'village', filter: byClass('village'), minzoom: 10, size: { 9: 11, 12: 14 } },
	{ id: 'town', filter: ['all', byClass('town'), ['!', ['has', 'capital']]], minzoom: 7, size: { 8: 11, 12: 14 } },
];

// `capital` is an admin level, not a boolean: 2 marks a national capital, 4 a state capital. A city that
// is neither keeps the plain `city` label, which is why each filter excludes the levels above it.
const PLACES_LARGE: PlaceLabelDef[] = [
	{
		id: 'city',
		filter: ['all', byClass('city'), ['!', ['in', ['get', 'capital'], ['literal', [2, 4]]]]],
		minzoom: 6,
		maxzoom: 14,
		size: { 7: 11, 10: 14 },
	},
	{
		id: 'statecapital',
		filter: ['==', ['get', 'capital'], 4],
		minzoom: 4,
		maxzoom: 14,
		size: { 6: 11, 10: 15 },
	},
	{ id: 'capital', filter: ['==', ['get', 'capital'], 2], minzoom: 4, maxzoom: 12, size: { 5: 12, 10: 16 } },
];

/**
 * Country label bands. Replaces Shortbread's three `way_area` buckets with `rank` (finding 1).
 *
 * The zooms follow the data Shortbread's tiles carry, not its style: its `boundary_labels` hold only the
 * largest countries at z2, the first medium ones at z3 and small ones from z5, so its map thins out
 * country names at low zoom whatever the style says. Starting the medium bucket at z3 and the small one
 * at z5 gives this schema the same density: in the world view at z2 its tiles hold 171 country names,
 * Shortbread's 13.
 */
const COUNTRIES: { id: string; rank: ExpressionSpecification; minzoom: number; maxzoom: number; size: b.SizeValue }[] =
	[
		{ id: 'large', rank: ['<=', ['get', 'rank'], 1], minzoom: 2, maxzoom: 9, size: { 2: 8, 5: 13 } },
		{ id: 'medium', rank: ['==', ['get', 'rank'], 2], minzoom: 3, maxzoom: 10, size: { 3: 8, 5: 12 } },
		{ id: 'small', rank: ['>=', ['get', 'rank'], 3], minzoom: 5, maxzoom: 10, size: { 4: 8, 5: 11 } },
	];

/** Street classes that carry a name worth drawing — Shortbread's list, with `minor` for its three. */
const STREET_CLASSES = ['minor', 'tertiary', 'secondary', 'primary', 'trunk', 'track'];

// House numbers. `housenumber` is the whole layer and its only field — OpenMapTiles carries no `unit`,
// so Shortbread's `housenumber/unit` concatenation for sub-addresses (issue #118) has nothing to read
// and the number is drawn alone.
export function* addresses(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield b.symbol('label-address-housenumber', {
		sourceLayer: 'housenumber',
		filter: ['has', 'housenumber'],
		layout: { 'text-field': ['get', 'housenumber'] },
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

	// Motorway exit numbers. Every point feature in `transportation_name` is a `subclass: junction`, so
	// the geometry filter and the subclass say the same thing twice — deliberately, because a future
	// subclass with point geometry would otherwise silently start drawing exit numbers.
	yield b.symbol('label-motorway-exit', {
		sourceLayer: 'transportation_name',
		filter: ['all', POINTS, ['==', ['get', 'subclass'], 'junction'], ['has', 'ref']] as FilterSpecification,
		layout: { 'text-field': ['get', 'ref'] },
		color: c.label,
		textHaloColor: c.labelHalo,
		symbolPlacement: 'point',
		textAnchor: 'center',
		minzoom: 14,
		size: { 14: 9, 18: 11 },
		group: 'labels.streets.exits',
	});
	yield b.symbol('label-motorway-shield', {
		sourceLayer: 'transportation_name',
		filter: ['all', LINES, ['==', ['get', 'class'], 'motorway'], ['has', 'ref']] as FilterSpecification,
		layout: { 'text-field': ['get', 'ref'] },
		color: c.labelShield,
		textHaloColor: c.roadMotorway,
		symbolPlacement: 'line',
		textAnchor: 'center',
		minzoom: 14,
		size: { 14: 10, 18: 12, 20: 16 },
		group: 'labels.streets.refs',
	});

	// Street name labels. `pedestrian` is a `path` subclass here rather than a class of its own, and the
	// same layer carries the names of pedestrian squares — Shortbread's `label-street-pedestrian-zone`
	// has no separate source to read, so it folds in here (finding 3).
	yield b.symbol('label-street-pedestrian', {
		sourceLayer: 'transportation_name',
		filter: ['all', ['==', ['get', 'class'], 'path'], ['==', ['get', 'subclass'], 'pedestrian']] as FilterSpecification,
		layout: { 'text-field': ctx.nameField },
		...streetBase,
		group: 'labels.streets.names',
	});
	for (const cls of STREET_CLASSES) {
		yield b.symbol('label-street-' + cls, {
			sourceLayer: 'transportation_name',
			filter: ['all', LINES, ['==', ['get', 'class'], cls]] as FilterSpecification,
			layout: { 'text-field': ctx.nameField },
			...streetBase,
			group: 'labels.streets.names',
		});
	}

	// ── Water labels ────────────────────────────────────────────────────────────
	const waterBase = labelStyles(ctx).water;

	// Bucketed by `class`, not by area — see finding 2, and the regression it records. Larger classes come
	// first so they win symbol collisions, as in the Shortbread module.
	const WATER_AREAS: { id: string; classes: string[]; appear: number; size: Record<number, number> }[] = [
		{ id: 'major', classes: ['sea', 'strait'], appear: 4, size: { 4: 11, 10: 14 } },
		{ id: 'large', classes: ['bay'], appear: 8, size: { 8: 10, 12: 13 } },
		{ id: 'medium', classes: ['lake', 'pond', 'dock'], appear: 11, size: { 11: 10, 14: 12 } },
	];
	for (const bucket of WATER_AREAS) {
		yield b.symbol('label-water-area-' + bucket.id, {
			sourceLayer: 'water_name',
			filter: byClass(...bucket.classes),
			layout: { 'text-field': ctx.nameField },
			...waterBase,
			symbolPlacement: 'point',
			appear: bucket.appear,
			size: bucket.size,
			group: 'labels.water.lakes',
		});
	}

	// River and stream names come from `waterway` itself, which carries its own `name` — there is no
	// separate line-label layer to pair with, as Shortbread's `water_lines_labels`.
	yield b.symbol('label-water-river', {
		sourceLayer: 'waterway',
		filter: ['in', ['get', 'class'], ['literal', ['river', 'canal']]],
		layout: { 'text-field': ctx.nameField },
		...waterBase,
		symbolPlacement: 'line',
		minzoom: 12,
		size: { 12: 10, 15: 12 },
		group: 'labels.water.rivers',
	});
	yield b.symbol('label-water-stream', {
		sourceLayer: 'waterway',
		filter: ['in', ['get', 'class'], ['literal', ['stream', 'ditch', 'drain']]],
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

	// State labels come from `place` (class `state`, 1267 features in the sample) rather than a
	// boundary-label layer. `province` joins it: OpenMapTiles files the same administrative level under
	// either name depending on the country.
	yield b.symbol('label-boundary-state', {
		sourceLayer: 'place',
		filter: byClass('state', 'province'),
		layout: { 'text-field': ctx.nameField, 'symbol-sort-key': RANK_SORT_KEY },
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
			sourceLayer: 'place',
			filter: ['all', byClass('country'), country.rank] as FilterSpecification,
			layout: { 'text-field': ctx.nameField, 'symbol-sort-key': RANK_SORT_KEY },
			...boundaryBase,
			minzoom: country.minzoom,
			maxzoom: country.maxzoom,
			size: country.size,
			group: 'labels.boundaries.countries',
		});
	}
}

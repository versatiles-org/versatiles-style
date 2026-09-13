import type { ExpressionSpecification, FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';
import { labelStyles, placeLabel, placeSecondary, type PlaceLabelDef } from '../../cartography/labels.js';

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
const AREAS: ExpressionSpecification = ['==', ['geometry-type'], 'Polygon'];

/** Shortbread's sort key, which Protomaps can reproduce exactly. */
const POP_SORT_KEY = ['-', ['to-number', ['get', 'population'], 0]];
const PLACE_SOURCE = { sourceLayer: 'places', sortKey: POP_SORT_KEY };

const byKind = (...kinds: string[]): ExpressionSpecification =>
	kinds.length === 1 ? ['==', ['get', 'kind'], kinds[0]] : ['in', ['get', 'kind'], ['literal', [...kinds]]];

const PLACES_SMALL: PlaceLabelDef[] = [
	{ id: 'neighbourhood', filter: byKind('neighbourhood'), minzoom: 14, size: 12, uppercase: true },
	{ id: 'quarter', filter: byKind('quarter'), minzoom: 13, size: 13, uppercase: true },
	{ id: 'suburb', filter: byKind('suburb'), minzoom: 10, size: { 11: 11, 13: 14 }, uppercase: true },
	{ id: 'hamlet', filter: byKind('hamlet'), minzoom: 13, size: { 10: 11, 12: 14 }, uppercase: true },
	{ id: 'village', filter: byKind('village'), minzoom: 10, size: { 9: 11, 12: 14 } },
	{ id: 'town', filter: byKind('town'), minzoom: 7, size: { 8: 11, 12: 14 } },
];

// `capital` marks a national capital; Protomaps has no separate state-capital flag, so that layer
// matches nothing rather than being dropped — the group's layer list stays the same across schemas.
const PLACES_LARGE: PlaceLabelDef[] = [
	{
		id: 'city',
		filter: ['all', byKind('city'), ['!', ['has', 'capital']]],
		minzoom: 6,
		maxzoom: 14,
		size: { 7: 11, 10: 14 },
	},
	{ id: 'statecapital', filter: ['==', ['get', 'capital'], 4], minzoom: 4, maxzoom: 14, size: { 6: 11, 10: 15 } },
	{ id: 'capital', filter: ['==', ['get', 'capital'], 2], minzoom: 4, maxzoom: 12, size: { 5: 12, 10: 16 } },
];

/** Country bands by `population_rank`, the nearest thing to Shortbread's `way_area` buckets. */
const COUNTRIES: { id: string; rank: ExpressionSpecification; minzoom: number; maxzoom: number; size: b.SizeValue }[] =
	[
		{ id: 'large', rank: ['>=', ['get', 'population_rank'], 14], minzoom: 2, maxzoom: 9, size: { 2: 8, 5: 13 } },
		{
			id: 'medium',
			rank: ['all', ['<', ['get', 'population_rank'], 14], ['>=', ['get', 'population_rank'], 11]],
			minzoom: 2,
			maxzoom: 10,
			size: { 3: 8, 5: 12 },
		},
		{ id: 'small', rank: ['<', ['get', 'population_rank'], 11], minzoom: 4, maxzoom: 10, size: { 4: 8, 5: 11 } },
	];

const STREET_KINDS = ['minor_road', 'major_road', 'highway'];

// House numbers: an attribute of the building, not a layer of its own, and there is no `unit`.
export function* addresses(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield b.symbol('label-address-housenumber', {
		sourceLayer: 'buildings',
		filter: ['has', 'addr_housenumber'],
		layout: { 'text-field': ['get', 'addr_housenumber'] },
		font: ctx.fonts.normal,
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
		font: ctx.fonts.bold,
		textHaloColor: c.roadMotorway,
		textHaloWidth: 0.1,
		textHaloBlur: 1,
		symbolPlacement: 'line',
		textAnchor: 'center',
		minzoom: 14,
		size: { 14: 10, 18: 12, 20: 16 },
		group: 'labels.streets',
	});

	for (const kind of STREET_KINDS) {
		yield b.symbol('label-street-' + kind.replace(/_/g, ''), {
			sourceLayer: 'roads',
			filter: ['all', LINES, ['==', ['get', 'kind'], kind]] as FilterSpecification,
			layout: { 'text-field': ctx.nameField },
			...streetBase,
			group: 'labels.streets',
		});
	}
	// No `label-street-pedestrian-zone`: the pedestrian area is a `landuse` polygon here, and `landuse`
	// carries only `kind` and `sort_rank` — no name to draw. Emitting it would filter on a field the tiles
	// do not have, which renders nothing and hides the fact.

	// Water areas, bucketed by kind — no `way_area` here either. See the header.
	const WATER_AREAS: { id: string; kinds: string[]; appear: number; size: Record<number, number> }[] = [
		{ id: 'major', kinds: ['ocean', 'sea'], appear: 4, size: { 4: 11, 10: 14 } },
		{ id: 'large', kinds: ['bay', 'strait'], appear: 8, size: { 8: 10, 12: 13 } },
		{ id: 'medium', kinds: ['lake', 'water', 'dock'], appear: 11, size: { 11: 10, 14: 12 } },
	];
	for (const bucket of WATER_AREAS) {
		yield b.symbol('label-water-area-' + bucket.id, {
			sourceLayer: 'water',
			filter: ['all', AREAS, byKind(...bucket.kinds)] as FilterSpecification,
			layout: { 'text-field': ctx.nameField },
			...waterBase,
			symbolPlacement: 'point',
			appear: bucket.appear,
			size: bucket.size,
			group: 'labels.water',
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
		group: 'labels.water',
	});
	yield b.symbol('label-water-stream', {
		sourceLayer: 'water',
		filter: ['all', LINES, byKind('stream', 'ditch')] as FilterSpecification,
		layout: { 'text-field': ctx.nameField },
		...waterBase,
		symbolPlacement: 'line',
		minzoom: 14,
		size: { 14: 9, 17: 11 },
		group: 'labels.water',
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
		group: 'labels.states',
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
			group: 'labels.countries',
		});
	}
}

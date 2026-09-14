import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';
import { labelStyles, placeLabel, placeSecondary, type PlaceLabelDef } from '../../cartography/labels.js';

// Text labels, rendered topmost above the icons. They come in two bands, because MapLibre resolves
// symbol collisions in layer order and the transit stops belong between them: `featureLabels`
// (motorway refs/shields, street names, water names), then transit stops, then `placeLabels`
// (settlement and state/country names). House numbers are a separate, lowest-priority symbol (see
// `addresses`) emitted below POIs so they yield to them in collisions.

const POP_SORT_KEY = ['-', ['to-number', ['get', 'population'], 0]];

/** Where settlement labels come from, and what decides which one survives a collision. */
const PLACE_SOURCE = { sourceLayer: 'place_labels', sortKey: POP_SORT_KEY };

// Old VersaTiles place labels: settlement text is a dark blue-grey; districts/quarters are a lighter
// variant, uppercased. Text sizes restored from the old style.
const byKind = (kind: string): FilterSpecification => ['==', ['get', 'kind'], kind];

const PLACES_SMALL: PlaceLabelDef[] = [
	{ id: 'neighbourhood', filter: byKind('neighbourhood'), minzoom: 14, size: 12, uppercase: true },
	{ id: 'quarter', filter: byKind('quarter'), minzoom: 13, size: 13, uppercase: true },
	{ id: 'suburb', filter: byKind('suburb'), minzoom: 10, size: { 11: 11, 13: 14 }, uppercase: true },
	{ id: 'hamlet', filter: byKind('hamlet'), minzoom: 13, size: { 10: 11, 12: 14 }, uppercase: true },
	{ id: 'village', filter: byKind('village'), minzoom: 10, size: { 9: 11, 12: 14 } },
	{ id: 'town', filter: byKind('town'), minzoom: 7, size: { 8: 11, 12: 14 } },
];
// minzoom = the Shortbread place_labels schema minzoom for each kind.
const PLACES_LARGE: PlaceLabelDef[] = [
	{ id: 'city', filter: byKind('city'), minzoom: 6, maxzoom: 14, size: { 7: 11, 10: 14 } },
	{ id: 'statecapital', filter: byKind('state_capital'), minzoom: 4, maxzoom: 14, size: { 6: 11, 10: 15 } },
	{ id: 'capital', filter: byKind('capital'), minzoom: 4, maxzoom: 12, size: { 5: 12, 10: 16 } },
];

// Old VersaTiles settlement text is a dark blue-grey; districts/state are a lighter variant. Both are
// derived from the `label` palette colour (so they invert correctly in dark mode) with its saturation
// boosted to bring back the blue tint the OSM-Bright variant had desaturated away.
const STREET_KINDS = [
	'pedestrian',
	'living_street',
	'residential',
	'unclassified',
	'tertiary',
	'secondary',
	'primary',
	'trunk',
	'track',
];

const ADMIN2: FilterSpecification = ['in', ['get', 'admin_level'], ['literal', [2, '2']]];

// House numbers. Emitted at the bottom of the symbol stack by the assembler (below markings/POIs),
// so they are placed last and therefore have the lowest collision priority — a colliding POI icon,
// transit stop, road marking or other label always wins over a house number.
export function* addresses(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield b.symbol('label-address-housenumber', {
		sourceLayer: 'addresses',
		filter: ['has', 'housenumber'],
		layout: {
			// Where one house number covers several spread-out units, the number alone is ambiguous —
			// the Shortbread `addresses` layer carries `unit` for exactly this, and OSM Carto renders
			// it. Joined with `/`, the compact form used for sub-addresses (issue #118).
			'text-field': [
				'case',
				['has', 'unit'],
				['concat', ['get', 'housenumber'], '/', ['get', 'unit']],
				['get', 'housenumber'],
			],
		},
		color: ctx.c.labelHousenumber,
		symbolPlacement: 'point',
		textAnchor: 'center',
		minzoom: 17,
		size: { 17: 8, 19: 10 },
		group: 'labels.addresses',
	});
}

// Names for the features themselves: motorway refs, street names, water names. They sit at the
// bottom of the label stack, so every symbol emitted after them — transit stops included — wins the
// collision when the two compete for the same spot.
export function* featureLabels(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	const streetBase = labelStyles(ctx).street;
	// motorway exit number + shield
	yield b.symbol('label-motorway-exit', {
		sourceLayer: 'street_labels_points',
		filter: ['==', ['get', 'kind'], 'motorway_junction'],
		layout: { 'text-field': '{ref}' },
		color: c.label,
		textHaloColor: c.labelHalo,
		textHaloWidth: 1,
		textHaloBlur: 1,
		symbolPlacement: 'point',
		textAnchor: 'center',
		minzoom: 14,
		size: { 14: 9, 18: 11 },
		group: 'labels.streets.exits',
	});
	yield b.symbol('label-motorway-shield', {
		sourceLayer: 'street_labels',
		filter: ['==', ['get', 'kind'], 'motorway'],
		layout: { 'text-field': '{ref}' },
		color: c.labelShield,
		textHaloColor: c.roadMotorway,
		textHaloWidth: 0.1,
		textHaloBlur: 1,
		symbolPlacement: 'line',
		textAnchor: 'center',
		minzoom: 14,
		size: { 14: 10, 18: 12, 20: 16 },
		group: 'labels.streets.refs',
	});

	// street name labels
	for (const kind of STREET_KINDS) {
		yield b.symbol('label-street-' + kind.replace(/_/g, ''), {
			sourceLayer: 'street_labels',
			filter: ['==', ['get', 'kind'], kind],
			layout: { 'text-field': ctx.nameField },
			...streetBase,
			group: 'labels.streets.names',
		});
	}

	// Named pedestrian squares and plazas. Shortbread keeps the labelling points for street polygons
	// in `streets_polygons_labels` — note the plural `streets_`, where the geometry layer is
	// `street_polygons`; that inconsistency is why this pairing was overlooked until the schema
	// audit. The layer also carries `runway`, `taxiway` and `service` kinds, which are deliberately
	// left unlabelled: it holds only `name` (no `ref`), so runways would almost never label, and
	// service polygons are not drawn at all.
	yield b.symbol('label-street-pedestrian-zone', {
		sourceLayer: 'streets_polygons_labels',
		filter: ['==', ['get', 'kind'], 'pedestrian'],
		layout: { 'text-field': ctx.nameField },
		color: c.label,
		textHaloColor: c.labelHalo,
		textHaloWidth: 2,
		textHaloBlur: 1,
		symbolPlacement: 'point',
		textAnchor: 'center',
		minzoom: 14,
		size: { 14: 10, 17: 12 },
		group: 'labels.streets.names',
	});

	// ── Water labels ────────────────────────────────────────────────────────────
	// Shortbread carries names for water separately from the geometry: `water_polygons_labels`
	// (points, z4+, pre-sorted by `way_area` so the largest win collisions) and `water_lines_labels`
	// (lines, canals/rivers z12+, streams/ditches z14+). Neither was rendered before, so the map had
	// no lake, sea or river names at all.
	const waterBase = labelStyles(ctx).water;

	// Water-area labels are bucketed by `way_area`, because a name alone says nothing about whether a
	// feature deserves a label at continental zoom. Berlin's "Wasserkaskaden am Fernsehturm" — a
	// public cascade — is a named `natural=water` polygon of **3325** Mercator m², and without this
	// it labelled from z4 alongside the North Sea.
	//
	// `way_area` is Mercator area, so it inflates by 1/cos²(latitude): roughly 2.7× at Berlin's
	// 52.5°N and ~1× at the equator. The thresholds are therefore approximate by nature — a pond in
	// Norway can carry the same `way_area` as a noticeably larger lake in Kenya.
	//
	// Each bucket declares its appearance zoom with `appear`, so it fades in like everything else and
	// its `minzoom` is derived rather than hand-written. Larger buckets come first: symbol collision
	// is resolved in layer order, so big water wins over small when the two compete.
	//
	// Glaciers are left out. `water_polygons_labels` carries their names too (`kind: glacier`, 225 in the
	// cached tiles), and filtered on `way_area` alone they were lettered in the water style — blue glacier
	// names across the Alps at z10, which neither OpenMapTiles nor Protomaps shows.
	const WATER_AREAS: { id: string; min: number; max?: number; appear: number; size: Record<number, number> }[] = [
		{ id: 'major', min: 1e9, appear: 4, size: { 4: 11, 10: 14 } }, // seas, great lakes
		{ id: 'large', min: 1e7, max: 1e9, appear: 8, size: { 8: 10, 12: 13 } }, // large lakes
		{ id: 'medium', min: 1e5, max: 1e7, appear: 11, size: { 11: 10, 14: 12 } }, // town lakes
		{ id: 'small', min: 0, max: 1e5, appear: 15, size: { 14: 10, 17: 12 } }, // ponds, cascades
	];

	for (const bucket of WATER_AREAS) {
		const area: FilterSpecification[] = [
			['!=', ['get', 'kind'], 'glacier'],
			['>', ['get', 'way_area'], bucket.min],
		];
		if (bucket.max !== undefined) area.push(['<=', ['get', 'way_area'], bucket.max]);
		yield b.symbol('label-water-area-' + bucket.id, {
			sourceLayer: 'water_polygons_labels',
			filter: ['all', ...area] as FilterSpecification,
			layout: { 'text-field': ctx.nameField },
			...waterBase,
			symbolPlacement: 'point',
			appear: bucket.appear,
			size: bucket.size,
			group: 'labels.water.lakes',
		});
	}

	yield b.symbol('label-water-river', {
		sourceLayer: 'water_lines_labels',
		filter: ['in', ['get', 'kind'], ['literal', ['river', 'canal']]],
		layout: { 'text-field': ctx.nameField },
		...waterBase,
		symbolPlacement: 'line',
		minzoom: 12,
		size: { 12: 10, 15: 12 },
		group: 'labels.water.rivers',
	});

	yield b.symbol('label-water-stream', {
		sourceLayer: 'water_lines_labels',
		filter: ['in', ['get', 'kind'], ['literal', ['stream', 'ditch']]],
		layout: { 'text-field': ctx.nameField },
		...waterBase,
		symbolPlacement: 'line',
		minzoom: 14,
		size: { 14: 9, 17: 11 },
		group: 'labels.water.rivers',
	});
}

// Place and administrative names: settlements, states, countries. Emitted at the top of the label
// stack, so a settlement name outranks every other symbol it collides with.
export function* placeLabels(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { place: placeBase, boundary: boundaryBase } = labelStyles(ctx);

	// small place labels
	for (const p of PLACES_SMALL) yield placeLabel(ctx, placeBase, p, PLACE_SOURCE);

	// state boundary label
	yield b.symbol('label-boundary-state', {
		sourceLayer: 'boundary_labels',
		filter: ['in', ['get', 'admin_level'], ['literal', [4, '4']]],
		layout: { 'text-field': ctx.nameField },
		...boundaryBase,
		minzoom: 3,
		maxzoom: 10,
		color: placeSecondary(ctx),
		size: { 5: 8, 8: 12 },
		group: 'labels.boundaries.states',
	});

	// large place labels
	for (const p of PLACES_LARGE) yield placeLabel(ctx, placeBase, p, PLACE_SOURCE);

	// country boundary labels
	yield b.symbol('label-boundary-country-small', {
		sourceLayer: 'boundary_labels',
		filter: ['all', ADMIN2, ['<=', ['get', 'way_area'], 10000000]] as FilterSpecification,
		layout: { 'text-field': ctx.nameField },
		...boundaryBase,
		minzoom: 4,
		maxzoom: 10,
		size: { 4: 8, 5: 11 },
		group: 'labels.boundaries.countries',
	});
	yield b.symbol('label-boundary-country-medium', {
		sourceLayer: 'boundary_labels',
		filter: [
			'all',
			ADMIN2,
			['<', ['get', 'way_area'], 90000000],
			['>', ['get', 'way_area'], 10000000],
		] as FilterSpecification,
		layout: { 'text-field': ctx.nameField },
		...boundaryBase,
		minzoom: 2,
		maxzoom: 10,
		size: { 3: 8, 5: 12 },
		group: 'labels.boundaries.countries',
	});
	yield b.symbol('label-boundary-country-large', {
		sourceLayer: 'boundary_labels',
		filter: ['all', ADMIN2, ['>=', ['get', 'way_area'], 90000000]] as FilterSpecification,
		layout: { 'text-field': ctx.nameField },
		...boundaryBase,
		minzoom: 2,
		maxzoom: 9,
		size: { 2: 8, 5: 13 },
		group: 'labels.boundaries.countries',
	});
}

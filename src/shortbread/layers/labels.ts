import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import type { Color } from '../../color/index.js';
import * as b from '../build.js';

// Text labels: house numbers, motorway refs/shields, street names, place names, and
// administrative (state/country) names. Rendered topmost, above icons.

const POP_SORT_KEY = ['-', ['to-number', ['get', 'population'], 0]];

type PlaceDef = {
	kind: string;
	minzoom: number;
	size: Record<number, number>;
	color?: (ctx: LayerContext) => Color;
	uppercase?: boolean;
};

// OSM Bright settlement labels are neutral dark grey; districts/quarters (place-other) are a
// warm dark red and uppercased. Sizes mirror OSM Bright's place layers.
const PLACES_SMALL: PlaceDef[] = [
	{ kind: 'neighbourhood', minzoom: 14, size: { 12: 10, 15: 14 }, color: placeWarm, uppercase: true },
	{ kind: 'quarter', minzoom: 13, size: { 12: 10, 15: 14 }, color: placeWarm, uppercase: true },
	{ kind: 'suburb', minzoom: 10, size: { 12: 10, 15: 14 }, color: placeWarm, uppercase: true },
	{ kind: 'hamlet', minzoom: 13, size: { 12: 10, 15: 14 }, color: placeWarm, uppercase: true },
	{ kind: 'village', minzoom: 10, size: { 10: 12, 15: 22 } },
	{ kind: 'town', minzoom: 7, size: { 10: 14, 15: 24 } },
];
// minzoom = the Shortbread place_labels schema minzoom for each kind (matches OSM Bright).
const PLACES_LARGE: PlaceDef[] = [
	{ kind: 'city', minzoom: 6, size: { 7: 14, 11: 24 } },
	{ kind: 'state_capital', minzoom: 4, size: { 7: 14, 11: 24 } },
	{ kind: 'capital', minzoom: 4, size: { 7: 14, 11: 24 } },
];

// Neutral settlement text (~#333) and warm district/state text (~#633), derived from the palette.
function placeText(ctx: LayerContext): Color {
	return ctx.c.label.saturate(-1);
}
function placeWarm(ctx: LayerContext): Color {
	return ctx.c.label.rotateHue(120).saturate(1.6).lighten(0.08);
}

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

export function* labels(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	const placeBase: b.StyleProps = {
		color: placeText(ctx),
		font: ctx.fonts.normal,
		textHaloColor: c.labelHalo,
		textHaloWidth: 1.2,
		textHaloBlur: 1,
	};
	const boundaryBase: b.StyleProps = {
		color: c.label,
		font: ctx.fonts.normal,
		textTransform: 'uppercase',
		textHaloColor: c.labelHalo,
		textHaloWidth: 1.2,
		textHaloBlur: 1,
		textAnchor: 'top',
		textOffset: [0, 0.2],
		textPadding: 0,
		textOptional: true,
	};
	const streetBase: b.StyleProps = {
		color: c.label,
		font: ctx.fonts.normal,
		textHaloColor: c.labelHalo,
		textHaloWidth: 1.2,
		textHaloBlur: 1,
		symbolPlacement: 'line',
		textAnchor: 'center',
		minzoom: 12,
		size: { 12: 10, 15: 13 },
	};

	// house numbers
	yield b.symbol('label-address-housenumber', {
		sourceLayer: 'addresses',
		filter: ['has', 'housenumber'],
		layout: { 'text-field': '{housenumber}' },
		font: ctx.fonts.normal,
		color: c.land.invertLuminosity().fade(0.7),
		symbolPlacement: 'point',
		textAnchor: 'center',
		minzoom: 17,
		appear: 17,
		size: { 17: 8, 19: 10 },
		group: 'labels.addresses',
	});

	// motorway exit number + shield
	yield b.symbol('label-motorway-exit', {
		sourceLayer: 'street_labels_points',
		filter: ['==', ['get', 'kind'], 'motorway_junction'],
		layout: { 'text-field': '{ref}' },
		font: ctx.fonts.normal,
		color: c.label,
		textHaloColor: c.labelHalo,
		textHaloWidth: 1,
		textHaloBlur: 1,
		symbolPlacement: 'point',
		textAnchor: 'center',
		minzoom: 14,
		appear: 14,
		size: { 14: 9, 18: 11 },
		group: 'labels.streets',
	});
	yield b.symbol('label-motorway-shield', {
		sourceLayer: 'street_labels',
		filter: ['==', ['get', 'kind'], 'motorway'],
		layout: { 'text-field': '{ref}' },
		color: c.labelShield,
		font: ctx.fonts.bold,
		textHaloColor: c.roadMotorway,
		textHaloWidth: 0.1,
		textHaloBlur: 1,
		symbolPlacement: 'line',
		textAnchor: 'center',
		minzoom: 14,
		appear: 14,
		size: { 14: 10, 18: 12, 20: 16 },
		group: 'labels.streets',
	});

	// street name labels
	for (const kind of STREET_KINDS) {
		yield b.symbol('label-street-' + kind.replace(/_/g, ''), {
			sourceLayer: 'street_labels',
			filter: ['==', ['get', 'kind'], kind],
			layout: { 'text-field': ctx.nameField },
			...streetBase,
			appear: 12,
			group: 'labels.streets',
		});
	}

	// small place labels
	for (const p of PLACES_SMALL) yield placeLabel(ctx, placeBase, p);

	// state boundary label
	yield b.symbol('label-boundary-state', {
		sourceLayer: 'boundary_labels',
		filter: ['in', ['get', 'admin_level'], ['literal', [4, '4']]],
		layout: { 'text-field': ctx.nameField },
		...boundaryBase,
		minzoom: 3,
		appear: 3,
		color: placeWarm(ctx),
		size: { 5: 10, 8: 12 },
		group: 'labels.states',
	});

	// large place labels
	for (const p of PLACES_LARGE) yield placeLabel(ctx, placeBase, p);

	// country boundary labels
	yield b.symbol('label-boundary-country-small', {
		sourceLayer: 'boundary_labels',
		filter: ['all', ADMIN2, ['<=', ['get', 'way_area'], 10000000]] as FilterSpecification,
		layout: { 'text-field': ctx.nameField },
		...boundaryBase,
		minzoom: 4,
		appear: 4,
		size: { 4: 11, 5: 13 },
		textHaloWidth: 2,
		group: 'labels.countries',
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
		appear: 2,
		size: { 3: 11, 5: 14 },
		textHaloWidth: 2,
		group: 'labels.countries',
	});
	yield b.symbol('label-boundary-country-large', {
		sourceLayer: 'boundary_labels',
		filter: ['all', ADMIN2, ['>=', ['get', 'way_area'], 90000000]] as FilterSpecification,
		layout: { 'text-field': ctx.nameField },
		...boundaryBase,
		minzoom: 2,
		appear: 2,
		size: { 2: 11, 5: 15 },
		textHaloWidth: 2,
		group: 'labels.countries',
	});
}

function placeLabel(ctx: LayerContext, base: b.StyleProps, p: PlaceDef): b.TaggedLayer {
	return b.symbol('label-place-' + p.kind.replace(/_/g, ''), {
		sourceLayer: 'place_labels',
		filter: ['==', ['get', 'kind'], p.kind],
		layout: { 'text-field': ctx.nameField, 'symbol-sort-key': POP_SORT_KEY },
		...base,
		minzoom: p.minzoom,
		appear: p.minzoom,
		size: p.size,
		...(p.color ? { color: p.color(ctx) } : {}),
		...(p.uppercase ? { textTransform: 'uppercase' } : {}),
		group: 'labels.places',
	});
}

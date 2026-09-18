import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';

// Point-of-interest icons for OpenMapTiles.
//
// Shortbread emits nine layers, one per raw OSM tag key (`amenity`, `shop`, `tourism`, …), each with a
// `match` on that key's value. OpenMapTiles has pre-classified everything into `class` + `subclass`, so
// this is **one layer** with one match — the single largest structural simplification in the port.
//
// ── The two constraints that shaped this ──────────────────────────────────────
//
// 1. **Only icons `base` already carries.** The sprite sheet must not grow for a schema
//    the CDN does not serve, because every map downloads it. `base` has 120 icons; every entry below
//    resolves to one of them, and `scripts/sprite-coverage.test.ts` fails if that stops being true.
//
// 2. **No generic fallback for unlisted classes.** This is the one place the port deliberately does *not*
//    copy Shortbread's behaviour. Shortbread's `amenity` match ends in a generic marker, which is safe
//    because its `pois` layer is curated. OpenMapTiles' `poi` is not: `npm run schema-values -- omt poi
//    --all` found 90 classes, and the four most common after `restaurant` are `bicycle_parking` (2220),
//    `garden` (1754), `bollard` (1670) and `waste_basket` (1654). A generic marker per bollard and gate
//    would bury the map in dots. So the layer filters to the classes it has an icon for, and the rest
//    draw nothing.
//
// ── How each entry was chosen ─────────────────────────────────────────────────
//
// An OpenMapTiles class earns an icon only where Shortbread maps the equivalent OSM tag to that same
// icon — the table below is a re-keying of Shortbread's nine, not a fresh set of cartographic opinions.
// Classes with no Shortbread counterpart (`museum`, `aquarium`, `escape_game`, `hackerspace`, `yoga`,
// `chess`, the sport classes) are left undrawn rather than assigned a near-miss glyph, because a wrong
// icon reads as a wrong fact.

/** `class` → icon, for the classes drawn as a plain icon. Nested matches follow. */
const CLASS_ICONS: Record<string, string> = {
	// food and drink
	restaurant: 'base:icon-restaurant',
	fast_food: 'base:icon-fast_food',
	cafe: 'base:icon-cafe',
	bar: 'base:icon-bar',
	// `beer` covers pub and biergarten, which Shortbread maps to a pint and a mug respectively; the pint
	// is the one that reads at icon size.
	beer: 'base:icon-pint_glass',
	// money, post, communication
	atm: 'base:icon-atm',
	bank: 'base:icon-bank',
	post: 'base:icon-post',
	telephone: 'base:icon-telephone',
	// shops with a class of their own (the residual `shop` class is matched on `subclass` below)
	bakery: 'base:icon-bakery',
	butcher: 'base:icon-butcher',
	alcohol_shop: 'base:icon-alcohol_shop',
	clothing_store: 'base:icon-clothes',
	hairdresser: 'base:icon-scissors_and_comb',
	laundry: 'base:icon-laundry',
	// health
	pharmacy: 'base:icon-pill',
	doctors: 'base:icon-doctor',
	dentist: 'base:icon-dentist',
	veterinary: 'base:icon-veterinary',
	hospital: 'base:icon-hospital',
	// civic
	police: 'base:icon-police_officer',
	fire_station: 'base:icon-fire_station',
	prison: 'base:icon-prison',
	town_hall: 'base:icon-town_hall',
	school: 'base:icon-school',
	college: 'base:icon-college',
	library: 'base:icon-library',
	cemetery: 'base:icon-cemetery',
	// culture and leisure
	theatre: 'base:icon-theater',
	cinema: 'base:icon-cinema',
	art_gallery: 'base:icon-art_gallery',
	monument: 'base:icon-monument',
	castle: 'base:icon-castle',
	picnic_site: 'base:icon-picnic_site',
	playground: 'base:icon-seesaw',
	pitch: 'base:icon-pitch',
	stadium: 'base:icon-stadium',
	sports_centre: 'base:icon-sports',
	swimming_pool: 'base:icon-swimming',
	swimming: 'base:icon-swimming',
	dog_park: 'base:icon-dog',
	zoo: 'base:icon-zoo',
	// street furniture and services
	toilets: 'base:icon-restrooms',
	drinking_water: 'base:icon-drinking_water',
	shelter: 'base:icon-shelter',
	recycling: 'base:icon-recycling',
	waste_basket: 'base:icon-waste_basket',
	fuel: 'base:icon-fuel_pump',
	bicycle_rental: 'base:icon-bicycle_share',
	information: 'base:transport-information',
};

/**
 * `place_of_worship`'s `subclass` is the religion, so Shortbread's nested `religion` match ports across
 * unchanged — including its fallback for a missing or unrecognised faith. Sampling found christian,
 * buddhist, shinto, jewish, muslim, taoist and several one-offs; `shinto` has no glyph in `base`, so it
 * takes the same fallback as an unrecognised religion.
 */
const WORSHIP_ICON: unknown = [
	'match',
	['get', 'subclass'],
	'christian',
	'base:icon-latin_cross',
	'muslim',
	'base:icon-star_and_crescent',
	'jewish',
	'base:icon-star_of_david',
	'buddhist',
	'base:icon-dharma_wheel',
	'hindu',
	'base:icon-om',
	'sikh',
	'base:icon-khanda',
	'taoist',
	'base:icon-yin_yang',
	'base:icon-person_kneeling_and_praying',
];

/** The residual `shop` class, keyed on `subclass` — Shortbread's `shop` match, re-keyed. */
const SHOP_ICON: unknown = [
	'match',
	['get', 'subclass'],
	'beauty',
	'base:icon-beauty',
	'beverages',
	'base:icon-beverages',
	'books',
	'base:icon-books',
	'chemist',
	'base:icon-tube_and_toothbrush',
	'doityourself',
	'base:icon-do_it_yourself',
	'dry_cleaning',
	'base:icon-dry_cleaning',
	'florist',
	'base:icon-florist',
	'furniture',
	'base:icon-furniture',
	'garden_centre',
	'base:icon-garden_center',
	'gift',
	'base:icon-gift',
	'greengrocer',
	'base:icon-greengrocer',
	'hardware',
	'base:icon-hardware',
	'jewelry',
	'base:icon-ring',
	'kiosk',
	'base:icon-newspaper',
	'newsagent',
	'base:icon-newsagent',
	'optician',
	'base:icon-optician',
	'outdoor',
	'base:icon-outdoor',
	'shoes',
	'base:icon-shoes',
	'sports',
	'base:icon-sports',
	'stationery',
	'base:icon-stationery',
	'toys',
	'base:icon-rocking_horse',
	'travel_agency',
	'base:icon-travel_agent',
	'video',
	'base:icon-video',
	'base:icon-shop',
];

/** `attraction` is vague; only its `viewpoint` subclass has a Shortbread counterpart. */
const ATTRACTION_ICON: unknown = [
	'match',
	['get', 'subclass'],
	'viewpoint',
	'base:icon-viewpoint',
	'artwork',
	'base:icon-artwork',
	'base:transport-information',
];

/** `office` draws only the diplomatic one, exactly as Shortbread's `office` match does. */
const OFFICE_ICON: unknown = ['match', ['get', 'subclass'], 'diplomatic', 'base:icon-embassy', ''];

/** Classes matched on `subclass` rather than mapped straight to an icon. */
const SUBCLASS_MATCHES: Record<string, unknown> = {
	place_of_worship: WORSHIP_ICON,
	shop: SHOP_ICON,
	attraction: ATTRACTION_ICON,
	office: OFFICE_ICON,
};

/** Every class this layer draws — the filter, so nothing else reaches the match. */
export const DRAWN_CLASSES: string[] = [...Object.keys(CLASS_ICONS), ...Object.keys(SUBCLASS_MATCHES)].sort();

/** `['match', ['get','class'], <class>, <icon>, …, '']` over both tables. */
function buildIconMatch(): unknown {
	const cases: unknown[] = [];
	for (const [cls, icon] of Object.entries(CLASS_ICONS)) cases.push(cls, icon);
	for (const [cls, match] of Object.entries(SUBCLASS_MATCHES)) cases.push(cls, match);
	// The fallback is unreachable while the filter and these tables agree, and is an empty image — never a
	// generic marker — so a class added to one and not the other draws nothing rather than a wrong dot.
	return ['match', ['get', 'class'], ...cases, ''];
}

export function* pois(ctx: LayerContext): Generator<b.TaggedLayer> {
	// POI icons are SDF sprites: their translucency lives in the `labelPoi` token's alpha, applied via
	// symbol `opacity` — which covers both the icon and the label, so they share the opaque `labelPoi`
	// colour and the same alpha.
	const iconColor = ctx.c.labelPoi.opaque();
	const iconOpacity = ctx.c.labelPoi.alpha;

	yield b.symbol('poi', {
		sourceLayer: 'poi',
		filter: ['in', ['get', 'class'], ['literal', DRAWN_CLASSES]],
		// OpenMapTiles serves `poi` from z11, but the icons are sized for z14+ exactly as in Shortbread.
		minzoom: 14,
		iconSize: { base: 2, stops: { 16: 0.4, 20: 1.2 } },
		iconOpacity: { 16: 0, 17: iconOpacity },
		textOpacity: { 18: 0, 18.5: iconOpacity },
		// Name label under the icon from z19+. `text-size` is 0 below z18 so the label adds no collision
		// box at mid zoom, and an empty name renders nothing. Style block identical to the Shortbread
		// module's — only the icon expression and the source-layer differ.
		text: ctx.nameField,
		size: { 17: 0, 18: 11, 22: 13 },
		textAnchor: 'top',
		textOffset: [0, 1.2],
		textOptional: true,
		symbolPlacement: 'point',
		iconOptional: true,
		color: iconColor,
		textHaloColor: ctx.bg, // OSM Bright POI halos are opaque (≈ white in light mode)
		image: buildIconMatch(),
		group: 'pois',
	});
}

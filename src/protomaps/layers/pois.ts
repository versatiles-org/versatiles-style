import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';

// Point-of-interest icons for Protomaps — one layer, as in the OpenMapTiles port, keyed on `kind`.
//
// The same two constraints apply and for the same reasons: only icons `base` already carries,
// and no generic fallback for unlisted kinds, because `pois` carries street furniture that would bury
// the map in dots. A kind earns an icon only where Shortbread maps the equivalent OSM tag to it.
//
// Kinds are from `npm run schema-values -- protomaps pois --all`. Protomaps names them after the OSM
// value directly, which makes this the most legible of the three mappings — `place_of_worship`,
// `post_office`, `supermarket` and `library` are the tag values, not a re-classification.

const KIND_ICONS: Record<string, string> = {
	// food and drink
	restaurant: 'base:icon-restaurant',
	fast_food: 'base:icon-fast_food',
	cafe: 'base:icon-cafe',
	bar: 'base:icon-bar',
	pub: 'base:icon-pint_glass',
	biergarten: 'base:icon-beer_mug',
	// money, post, communication
	atm: 'base:icon-atm',
	bank: 'base:icon-bank',
	post_office: 'base:icon-post',
	post_box: 'base:icon-postbox',
	telephone: 'base:icon-telephone',
	// shops
	supermarket: 'base:icon-greengrocer',
	bakery: 'base:icon-bakery',
	butcher: 'base:icon-butcher',
	alcohol: 'base:icon-alcohol_shop',
	clothes: 'base:icon-clothes',
	hairdresser: 'base:icon-scissors_and_comb',
	laundry: 'base:icon-laundry',
	florist: 'base:icon-florist',
	books: 'base:icon-books',
	jewelry: 'base:icon-ring',
	shoes: 'base:icon-shoes',
	optician: 'base:icon-optician',
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
	townhall: 'base:icon-town_hall',
	school: 'base:icon-school',
	college: 'base:icon-college',
	university: 'base:icon-college',
	library: 'base:icon-library',
	cemetery: 'base:icon-cemetery',
	embassy: 'base:icon-embassy',
	// culture and leisure
	theatre: 'base:icon-theater',
	cinema: 'base:icon-cinema',
	artwork: 'base:icon-artwork',
	monument: 'base:icon-monument',
	castle: 'base:icon-castle',
	picnic_site: 'base:icon-picnic_site',
	playground: 'base:icon-seesaw',
	pitch: 'base:icon-pitch',
	stadium: 'base:icon-stadium',
	swimming_pool: 'base:icon-swimming',
	dog_park: 'base:icon-dog',
	zoo: 'base:icon-zoo',
	viewpoint: 'base:icon-viewpoint',
	// lodging
	hotel: 'base:icon-lodging',
	hostel: 'base:icon-lodging',
	guest_house: 'base:icon-lodging',
	motel: 'base:icon-lodging',
	camp_site: 'base:icon-campsite',
	// street furniture and services
	toilets: 'base:icon-restrooms',
	drinking_water: 'base:icon-drinking_water',
	shelter: 'base:icon-shelter',
	recycling: 'base:icon-recycling',
	waste_basket: 'base:icon-waste_basket',
	bench: 'base:icon-bench',
	fuel: 'base:icon-fuel_pump',
	bicycle_rental: 'base:icon-bicycle_share',
	car_rental: 'base:icon-car_rental',
	car_wash: 'base:icon-car_wash',
	information: 'base:transport-information',
	lighthouse: 'base:icon-lighthouse',
	windmill: 'base:icon-windmill',
	watermill: 'base:icon-watermill',
	fountain: 'base:icon-fountain',
	marketplace: 'base:icon-marketplace',
	nightclub: 'base:icon-nightclub',
	community_centre: 'base:icon-community',
};

/**
 * `place_of_worship`'s religion is in `kind_detail`, the same shape OpenMapTiles uses for its
 * `subclass` — so Shortbread's religion match ports across a second time unchanged.
 */
const WORSHIP_ICON: unknown = [
	'match',
	['get', 'kind_detail'],
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

export const DRAWN_KINDS: string[] = [...Object.keys(KIND_ICONS), 'place_of_worship'].sort();

function buildIconMatch(): unknown {
	const cases: unknown[] = [];
	for (const [kind, icon] of Object.entries(KIND_ICONS)) cases.push(kind, icon);
	cases.push('place_of_worship', WORSHIP_ICON);
	return ['match', ['get', 'kind'], ...cases, ''];
}

export function* pois(ctx: LayerContext): Generator<b.TaggedLayer> {
	const iconColor = ctx.c.labelPoi.opaque();
	const iconOpacity = ctx.c.labelPoi.alpha;

	yield b.symbol('poi', {
		sourceLayer: 'pois',
		filter: ['in', ['get', 'kind'], ['literal', DRAWN_KINDS]],
		// Protomaps serves `pois` from z5, far earlier than the other two, but the icons are sized for
		// z14+ as everywhere else.
		minzoom: 14,
		iconSize: { base: 2, stops: { 16: 0.4, 20: 1.2 } },
		iconOpacity: { 16: 0, 17: iconOpacity },
		textOpacity: { 18: 0, 18.5: iconOpacity },
		text: ctx.nameField,
		size: { 17: 0, 18: 11, 22: 13 },
		textAnchor: 'top',
		textOffset: [0, 1.2],
		textOptional: true,
		symbolPlacement: 'point',
		iconOptional: true,
		color: iconColor,
		textHaloColor: ctx.bg,
		image: buildIconMatch(),
		group: 'pois',
	});
}

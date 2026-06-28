import { SLOT_BELOW_FILLS, SLOT_BELOW_LABELS, SLOT_BELOW_STREETS, SLOT_BELOW_SYMBOLS } from './layers.js';

// ── Slot IDs for osm.slots ────────────────────────────────────────────────────

export const SLOT_IDS = {
	belowFills: SLOT_BELOW_FILLS,
	belowStreets: SLOT_BELOW_STREETS,
	belowSymbols: SLOT_BELOW_SYMBOLS,
	belowLabels: SLOT_BELOW_LABELS,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Generates tunnel/surface/bridge variants of a street-type layer.
// links: also generate -link variants; bicycle: also generate -bicycle overlay.
function streetIds(types: string[], opts: { links?: boolean; bicycle?: boolean } = {}): string[] {
	const ids: string[] = [];
	const configs: [string, string[]][] = [
		['', [':outline', '']],
		['tunnel-', [':outline', '']],
		['bridge-', [':bridge', ':outline', '']],
	];
	for (const t of types) {
		const tid = t.replace(/_/g, '');
		for (const [prefix, suffixes] of configs) {
			for (const s of suffixes) {
				if (opts.links) ids.push(`${prefix}street-${tid}-link${s}`);
				ids.push(`${prefix}street-${tid}${s}`);
			}
			if (opts.bicycle) ids.push(`${prefix}street-${tid}-bicycle`);
		}
	}
	return ids;
}

// Generates tunnel/surface/bridge variants of a way- (path) layer.
function pathIds(types: string[]): string[] {
	const ids: string[] = [];
	const configs: [string, string[]][] = [
		['', [':outline', '']],
		['tunnel-', [':outline', '']],
		['bridge-', [':bridge', ':outline', '']],
	];
	for (const t of types) {
		const tid = t.replace(/_/g, '');
		for (const [prefix, suffixes] of configs) {
			for (const s of suffixes) ids.push(`${prefix}way-${tid}${s}`);
		}
	}
	return ids;
}

// Generates tunnel/surface/bridge variants of a transport- (rail) layer.
// withService: also generate -service variants for rail/subway/tram etc.
function railIds(types: string[], withService = false): string[] {
	const ids: string[] = [];
	const configs: [string, string[]][] = [
		['', [':outline', '']],
		['tunnel-', [':outline', '']],
		['bridge-', [':outline', '']],
	];
	for (const t of types) {
		const tid = t.replace(/_/g, '');
		for (const [prefix, suffixes] of configs) {
			for (const s of suffixes) {
				ids.push(`${prefix}transport-${tid}${s}`);
				if (withService) ids.push(`${prefix}transport-${tid}-service${s}`);
			}
		}
	}
	return ids;
}

// ── Precomputed sub-lists ─────────────────────────────────────────────────────

// Pedestrian zone polygons (fill) appear once per level, in the ':outline' pass.
const pedestrianZoneIds = ['street-pedestrian-zone', 'tunnel-street-pedestrian-zone', 'bridge-street-pedestrian-zone'];

const poiIds = [
	'poi-amenity',
	'poi-leisure',
	'poi-tourism',
	'poi-shop',
	'poi-man_made',
	'poi-historic',
	'poi-emergency',
	'poi-highway',
	'poi-office',
];

const stopIds = [
	'symbol-transit-bus',
	'symbol-transit-tram',
	'symbol-transit-subway',
	'symbol-transit-lightrail',
	'symbol-transit-station',
	'symbol-transit-airfield',
	'symbol-transit-airport',
];

const markingIds = ['marking-oneway', 'marking-oneway-reverse', 'marking-bicycle'];

const aerialwayIds = [
	'cable_car',
	'gondola',
	'goods',
	'chair_lift',
	'drag_lift',
	't-bar',
	'j-bar',
	'platter',
	'rope-tow',
].flatMap((t) => {
	const tid = t.replace(/[_-]+/g, '');
	return [`aerialway-${tid}:outline`, `aerialway-${tid}`];
});

// ── Layer group registry ──────────────────────────────────────────────────────

export const layerGroups = {
	land: {
		forest: ['land-forest'],
		vegetation: ['land-grass', 'land-vegetation'],
		rock: ['land-rock'],
		wetland: ['land-wetland'],
		sand: ['land-sand'],
		glacier: ['land-glacier'],
		agriculture: ['land-agriculture'],
		urban: [
			'land-commercial',
			'land-industrial',
			'land-residential',
			'land-park',
			'land-garden',
			'land-burial',
			'land-leisure',
			'land-waste',
		],
	},

	water: {
		ocean: ['water-ocean'],
		rivers: ['water-river', 'water-canal', 'water-stream', 'water-ditch', 'water-area-river'],
		lakes: ['water-area', 'water-area-small'],
		piers: ['water-pier-area', 'water-pier', 'water-dam-area', 'water-dam'],
	},

	roads: {
		// bridge fill polygon is included with motorways (visually tied to arterial bridges)
		motorways: ['bridge', ...streetIds(['motorway', 'trunk'], { links: true })],
		highways: streetIds(['primary', 'secondary', 'tertiary'], { links: true }),
		streets: {
			residential: streetIds(['residential', 'living_street', 'unclassified'], { bicycle: true }),
			service: streetIds(['service'], { bicycle: true }),
			pedestrian: [...pedestrianZoneIds, ...streetIds(['pedestrian'], { bicycle: true })],
			track: streetIds(['track'], { bicycle: true }),
			bus: streetIds(['busway', 'bus_guideway']),
		},
		paths: pathIds(['footway', 'steps', 'path', 'cycleway']),
	},

	transit: {
		rail: [
			...railIds(['rail', 'light_rail', 'subway', 'narrow_gauge', 'tram'], true),
			...railIds(['funicular', 'monorail'], false),
		],
		aerialways: aerialwayIds,
		ferries: ['transport-ferry:outline', 'transport-ferry'],
		stops: stopIds,
	},

	buildings: ['building:outline', 'building', 'building-3d'],

	sites: [
		'site-dangerarea',
		'site-sportscenter',
		'site-university',
		'site-college',
		'site-school',
		'site-hospital',
		'site-prison',
		'site-parking',
		'site-bicycleparking',
		'site-construction',
	],

	airport: ['airport-area', 'airport-taxiway:outline', 'airport-runway:outline', 'airport-taxiway', 'airport-runway'],

	pois: poiIds,

	boundaries: {
		country: [
			'boundary-country:outline',
			'boundary-country-disputed:outline',
			'boundary-country-maritime:outline',
			'boundary-country',
			'boundary-country-disputed',
			'boundary-country-maritime',
		],
		state: ['boundary-state:outline', 'boundary-state'],
	},

	markings: markingIds,

	labels: {
		places: [
			'label-place-neighbourhood',
			'label-place-quarter',
			'label-place-suburb',
			'label-place-hamlet',
			'label-place-village',
			'label-place-town',
			'label-place-city',
			'label-place-statecapital',
			'label-place-capital',
		],
		streets: [
			'label-street-pedestrian',
			'label-street-livingstreet',
			'label-street-residential',
			'label-street-unclassified',
			'label-street-tertiary',
			'label-street-secondary',
			'label-street-primary',
			'label-street-trunk',
			'label-street-track',
			'label-motorway-exit',
			'label-motorway-shield',
		],
		states: ['label-boundary-state'],
		countries: ['label-boundary-country-small', 'label-boundary-country-medium', 'label-boundary-country-large'],
		addresses: ['label-address-housenumber'],
	},

	// convenience alias: all icon-type symbols combined
	icons: [...poiIds, ...stopIds, ...markingIds],
} as const;

export type LayerGroups = typeof layerGroups;

/**
 * The Mapbox half of the probes: the feature that stands for each probe in Mapbox's tiles.
 *
 * Apart from `probes.ts`, where the other three schemas sit side by side on every probe, because Mapbox
 * is the one schema the package reads without building: there is no `mapbox()` (issue #137), so these
 * features cannot be held to a style of our own, only to the list of Mapbox's layers and fields in
 * `mapbox-layers.ts`. Everything Mapbox-specific the importer knows is in these two files.
 */
import type { ProbeFeature } from './probes.js';

const f = (sourceLayer: string, props: ProbeFeature['props'] = {}, extra?: Partial<ProbeFeature>): ProbeFeature => ({
	sourceLayer,
	props,
	...extra,
});

/**
 * Properties Mapbox's tiles carry on every feature of a source-layer, which its styles filter on — see
 * `DEFAULT_PROPS` in `probes.ts`.
 *
 * Mapbox writes its flags as the strings 'true' and 'false', and its styles filter labels on the
 * two ranks: `filterrank` (how readily a label gives way, 0–5) and `symbolrank`/`sizerank`.
 */
export const MAPBOX_DEFAULT_PROPS: Record<string, ProbeFeature['props']> = {
	admin: { disputed: 'false', maritime: 'false', worldview: 'all' },
	airport_label: { sizerank: 1, worldview: 'all' },
	building: { extrude: 'true', underground: 'false', height: 10, min_height: 0 },
	natural_label: { filterrank: 1, sizerank: 1, worldview: 'all' },
	place_label: { filterrank: 1, worldview: 'all' },
	poi_label: { filterrank: 1, sizerank: 16 },
	road: { structure: 'none', oneway: 'false', layer: 0, len: 5000 },
	transit_stop_label: { filterrank: 1 },
};

/** A Mapbox road: every road, rail and path is one `road` layer, told apart by `class` and `type`. */
const mb = (cls: string, type: string = cls, extra?: Partial<ProbeFeature>): ProbeFeature =>
	f('road', { class: cls, type }, extra);
/** A Mapbox land fill: `class` is Mapbox's own grouping, `type` the OpenStreetMap value behind it. */
const mbLand = (cls: string, type: string = cls): ProbeFeature => f('landuse', { class: cls, type });
const mbPlace = (cls: string, type: string, symbolrank: number, extra: ProbeFeature['props'] = {}): ProbeFeature =>
	f('place_label', { class: cls, type, symbolrank, ...extra });

/**
 * The Mapbox feature of each probe, by probe id — Mapbox Streets v8, with Terrain v2's `landcover`.
 *
 * A table of its own rather than a fourth entry on every probe in `probes.ts`. The other three schemas have a
 * builder in this package, and `probes.test.ts` holds each of their features to the layer of that id
 * in the package's own style; Mapbox has none (issue #137), so its features can only be held to the
 * list of Mapbox's layers and fields (`mapbox-layers.ts`) — and to Mapbox's own styles, which is what
 * they were written against. Keeping them together keeps that difference in one place.
 *
 * A probe left out is one Mapbox's tiles have no feature for: its styles cannot say anything about it,
 * and the importer leaves that setting at the theme's own.
 */
export const MAPBOX: Readonly<Record<string, ProbeFeature | ProbeFeature[]>> = {
	// water has no fields: ocean, lake and river polygon are one thing to a Mapbox style
	'water-ocean': f('water'),
	'water-area': f('water'),
	'water-river': f('waterway', { class: 'river', type: 'river' }),
	'water-stream': f('waterway', { class: 'stream', type: 'stream' }),

	// `landuse` from OpenStreetMap at high zoom, `landcover` from satellite classification below it
	'land-glacier': [mbLand('glacier'), f('landcover', { class: 'snow' })],
	'land-forest': [mbLand('wood'), f('landcover', { class: 'wood' })],
	'land-grass': [mbLand('grass'), f('landcover', { class: 'grass' })],
	'land-vegetation': [mbLand('scrub'), f('landcover', { class: 'scrub' })],
	'land-park': mbLand('park'),
	'land-garden': mbLand('park', 'garden'),
	'land-agriculture': [mbLand('agriculture', 'farmland'), f('landcover', { class: 'crop' })],
	'land-sand': mbLand('sand'),
	'land-rock': mbLand('rock', 'bare_rock'),
	'land-wetland': f('landuse_overlay', { class: 'wetland', type: 'marsh' }),
	'land-residential': mbLand('residential'),
	'land-commercial': mbLand('commercial_area', 'commercial'),
	'land-industrial': mbLand('industrial'),
	'land-burial': mbLand('cemetery'),
	'land-leisure': mbLand('park', 'playground'),

	'site-hospital': mbLand('hospital'),
	'site-education': mbLand('school'),
	'site-sportscentre': mbLand('pitch'),
	'site-parking': mbLand('parking'),

	'airport-area': f('aeroway', { type: 'runway' }),
	building: f('building', { type: 'building' }),

	'street-motorway': mb('motorway'),
	'street-trunk': mb('trunk'),
	'street-primary': mb('primary'),
	'street-secondary': mb('secondary'),
	'street-tertiary': mb('tertiary'),
	'street-minor': mb('street', 'residential'),
	'street-service': mb('service'),
	'street-track': mb('track'),
	'street-pedestrian': mb('pedestrian'),
	'way-footway': mb('path', 'footway'),
	'way-cycleway': mb('path', 'cycleway'),
	'way-path': mb('path'),
	'way-steps': mb('path', 'steps'),
	'transport-rail': mb('major_rail', 'rail'),
	'transport-subway': mb('minor_rail', 'subway'),
	'transport-ferry': mb('ferry'),
	aerialway: mb('aerialway', 'aerialway:cablecar'),
	'airport-runway': f('aeroway', { type: 'runway' }, { geometry: 'LineString' }),

	// countries are level 0 and states level 1, where OpenStreetMap counts 2 and 4
	'boundary-country': f('admin', { admin_level: 0 }),
	'boundary-country-disputed': f('admin', { admin_level: 0, disputed: 'true' }),
	'boundary-state': f('admin', { admin_level: 1 }),

	'label-place-capital': mbPlace('settlement', 'city', 5, { capital: 2 }),
	'label-place-city': mbPlace('settlement', 'city', 8),
	'label-place-town': mbPlace('settlement', 'town', 11),
	'label-place-village': mbPlace('settlement', 'village', 14),
	'label-place-suburb': mbPlace('settlement_subdivision', 'suburb', 15),
	'label-boundary-state': mbPlace('state', 'state', 5),
	'label-boundary-country-large': mbPlace('country', 'country', 1),
	'label-street-primary': mb('primary', 'primary', { geometry: 'LineString' }),
	'label-street-residential': mb('street', 'residential', { geometry: 'LineString' }),
	'label-water-river': f('natural_label', { class: 'river' }, { geometry: 'LineString' }),
	'label-address-housenumber': f('housenum_label', { house_num: '12' }),
	'poi-amenity': f('poi_label', { class: 'food_and_drink', maki: 'restaurant', type: 'Restaurant' }),
	'symbol-transit-bus': f('transit_stop_label', { mode: 'bus', stop_type: 'stop', maki: 'bus' }),
};

/** What Mapbox tells apart that the target draws as one — see `Probe.variants`. */
export const MAPBOX_VARIANTS: Readonly<Record<string, ProbeFeature[]>> = {
	'poi-amenity': [
		f('poi_label', { class: 'store_like', maki: 'shop', type: 'Supermarket' }),
		f('poi_label', { class: 'lodging', maki: 'lodging', type: 'Hotel' }),
		f('poi_label', { class: 'park_like', maki: 'park', type: 'Park' }),
	],
};

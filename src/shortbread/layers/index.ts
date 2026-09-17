import type { LayerContext } from '../context.js';
import type { MaplibreLayer } from '../../types/index.js';
import { slot, type TaggedLayer, buildLayers, mergeIdenticalLayers, type MergeTable } from '../../dsl/index.js';
import { background } from './background.js';
import { landcover } from './landcover.js';
import { water } from './water.js';
import { sites } from './sites.js';
import { airport } from './airport.js';
import { buildings, buildings3d } from './buildings.js';
import { roads } from './roads.js';
import { pois } from './pois.js';
import { boundaries } from './boundaries.js';
import { markings } from './markings.js';
import { transitStops } from './transitstops.js';
import { featureLabels, placeLabels, addresses } from './labels.js';
import { SHORTBREAD_SCHEMA } from '../schema.js';

// Slot anchor layers — stable IDs used as MapLibre `beforeId` targets.
export const SLOT_BELOW_FILLS = 'slot-below-fills';
export const SLOT_BELOW_STREETS = 'slot-below-streets';
export const SLOT_BELOW_SYMBOLS = 'slot-below-symbols';
export const SLOT_BELOW_LABELS = 'slot-below-labels';

/**
 * Every group's decorated layers in render order (bottom → top), with slot anchors at the four
 * stable positions. Each group module owns both the structure and style of its layers.
 *
 * Wrapped by `shortbreadLayers` below, which is what callers use: runs that draw identically are
 * collapsed there rather than here, because which kinds share a style is decided by the style
 * functions, not by the structure list that names them.
 */
export function* assembleLayers(ctx: LayerContext): Generator<TaggedLayer> {
	yield* background(ctx);
	yield slot(SLOT_BELOW_FILLS);
	yield* landcover(ctx);
	// OSM Bright renders site areas (hospital/school/…) as low `landuse` fills, beneath water.
	yield* sites(ctx);
	yield* water(ctx);
	// OSM Bright draws aeroway (runways/taxiways) above buildings, below the street network.
	yield* airport(ctx);
	yield* buildings(ctx);
	yield slot(SLOT_BELOW_STREETS);
	yield* roads(ctx);
	yield slot(SLOT_BELOW_SYMBOLS);
	// OSM Bright overlay order is boundaries → markings → POIs (POIs sit above road markings).
	yield* boundaries(ctx);
	// House numbers sit at the very bottom of the symbol stack, so they are placed last and have the
	// lowest collision priority — markings, POIs, transit stops and all other labels win over them.
	yield* addresses(ctx);
	yield* markings(ctx);
	yield* pois(ctx);
	yield slot(SLOT_BELOW_LABELS);
	// MapLibre resolves symbol collisions in layer order, and the later layer wins. Transit stops sit
	// between the two label bands so a bus or tram stop outranks the street and water names it stands
	// on, while a settlement name still outranks the stop. Emitting the stops before the labels (as
	// the icon stack would suggest) is what silently dropped most of them at city zooms.
	yield* featureLabels(ctx);
	yield* transitStops(ctx);
	yield* placeLabels(ctx);
	// Extruded 3D buildings render last (above labels) so tall buildings are not occluded.
	yield* buildings3d(ctx);
}

/**
 * The assembled layers, with identically-drawn runs merged (see `mergeIdenticalLayers`).
 *
 * Every caller goes through this — the style build and `getLayerGroupMap()` alike — so the IDs a
 * consumer sees in the style are the IDs `osm.layerGroups` reports.
 */
export function* shortbreadLayers(ctx: LayerContext): Generator<TaggedLayer> {
	yield* mergeIdenticalLayers(MERGES, assembleLayers(ctx));
}

/**
 * The built Shortbread layer list: merged, gated on the resolved `layers:` option, floored at each
 * source-layer's data zoom, and sourced. The machinery is `src/dsl/assemble.ts`; what this adds is the
 * two Shortbread-specific inputs — the render order above and `MERGES` below.
 */
export function buildStyleLayers(ctx: LayerContext): MaplibreLayer[] {
	return buildLayers(ctx, SHORTBREAD_SCHEMA, shortbreadLayers(ctx));
}

// ── Merges: which layers Shortbread draws identically (issue #51) ────────────

/**
 * Layers drawn as one, by merged ID, with their members in draw order.
 *
 * Merges are listed by member rather than detected from computed paint. Detecting them made layer IDs
 * depend on colour values: two neighbouring layers whose colours merely happened to match — a user
 * setting `transitCycle` equal to `transitFoot`, say — formed a run nobody had named, and `osm()`
 * threw; and a matching neighbour could be pulled into a named merge, silently losing its ID. Every
 * entry here is identical by construction, because its members share one style rule. The tests in
 * `assemble.test.ts` check both directions: a default build leaves no identical run unregistered, and
 * the IDs stay the same for every theme, arbitrary colours and recolor options.
 */
const MERGES: MergeTable = {
	// sites: the three education kinds share the `siteEducation` colour, and both parking kinds
	// share `siteParking`.
	'site-education': ['site-university', 'site-college', 'site-school'],
	'site-parking': ['site-parking', 'site-bicycleparking'],
	// residential + unclassified (+ living street on bicycle overlays and bridge decks) are one visual
	// class ("minor"), as are the two bus-only kinds, across all three structure bands.
	'tunnel-street-minor:outline': ['tunnel-street-residential:outline', 'tunnel-street-unclassified:outline'],
	'tunnel-street-bus:outline': ['tunnel-street-busway:outline', 'tunnel-street-busguideway:outline'],
	'tunnel-street-minor': ['tunnel-street-residential', 'tunnel-street-unclassified'],
	'tunnel-street-bus': ['tunnel-street-busway', 'tunnel-street-busguideway'],
	'tunnel-street-minor-bicycle': [
		'tunnel-street-livingstreet-bicycle',
		'tunnel-street-residential-bicycle',
		'tunnel-street-unclassified-bicycle',
	],
	'street-minor:outline': ['street-residential:outline', 'street-unclassified:outline'],
	'street-bus:outline': ['street-busway:outline', 'street-busguideway:outline'],
	'street-minor': ['street-residential', 'street-unclassified'],
	'street-bus': ['street-busway', 'street-busguideway'],
	'street-minor-bicycle': ['street-livingstreet-bicycle', 'street-residential-bicycle', 'street-unclassified-bicycle'],
	'bridge-street-minor:bridge': [
		'bridge-street-livingstreet:bridge',
		'bridge-street-residential:bridge',
		'bridge-street-unclassified:bridge',
	],
	'bridge-street-bus:bridge': ['bridge-street-busway:bridge', 'bridge-street-busguideway:bridge'],
	'bridge-street-minor:outline': ['bridge-street-residential:outline', 'bridge-street-unclassified:outline'],
	'bridge-street-bus:outline': ['bridge-street-busway:outline', 'bridge-street-busguideway:outline'],
	'bridge-street-minor': ['bridge-street-residential', 'bridge-street-unclassified'],
	'bridge-street-bus': ['bridge-street-busway', 'bridge-street-busguideway'],
	'bridge-street-minor-bicycle': [
		'bridge-street-livingstreet-bicycle',
		'bridge-street-residential-bicycle',
		'bridge-street-unclassified-bicycle',
	],
	// primary + secondary links. `roads.ts` reserves "arterial" for exactly the yellow/orange
	// classes and explicitly excludes tertiary, which is why this is not named after its
	// `roads.highways` group — `street-tertiary-link` sits in that group too, styled differently.
	'tunnel-street-arterial-link:outline': ['tunnel-street-secondary-link:outline', 'tunnel-street-primary-link:outline'],
	'tunnel-street-arterial-link': ['tunnel-street-secondary-link', 'tunnel-street-primary-link'],
	'street-arterial-link:outline': ['street-secondary-link:outline', 'street-primary-link:outline'],
	'street-arterial-link': ['street-secondary-link', 'street-primary-link'],
	'bridge-street-arterial-link:bridge': ['bridge-street-secondary-link:bridge', 'bridge-street-primary-link:bridge'],
	'bridge-street-arterial-link:outline': ['bridge-street-secondary-link:outline', 'bridge-street-primary-link:outline'],
	'bridge-street-arterial-link': ['bridge-street-secondary-link', 'bridge-street-primary-link'],
	// tram / narrowgauge / funicular / monorail share one style — `wayStyle` handles all four in a
	// single branch.
	'tunnel-transport-minorrail:outline': [
		'tunnel-transport-narrowgauge:outline',
		'tunnel-transport-tram:outline',
		'tunnel-transport-funicular:outline',
		'tunnel-transport-monorail:outline',
	],
	'tunnel-transport-minorrail': [
		'tunnel-transport-narrowgauge',
		'tunnel-transport-tram',
		'tunnel-transport-funicular',
		'tunnel-transport-monorail',
	],
	'transport-minorrail:outline': [
		'transport-narrowgauge:outline',
		'transport-tram:outline',
		'transport-funicular:outline',
		'transport-monorail:outline',
	],
	'transport-minorrail': ['transport-narrowgauge', 'transport-tram', 'transport-funicular', 'transport-monorail'],
	'bridge-transport-minorrail:outline': [
		'bridge-transport-narrowgauge:outline',
		'bridge-transport-tram:outline',
		'bridge-transport-funicular:outline',
		'bridge-transport-monorail:outline',
	],
	'bridge-transport-minorrail': [
		'bridge-transport-narrowgauge',
		'bridge-transport-tram',
		'bridge-transport-funicular',
		'bridge-transport-monorail',
	],
	// all nine aerialway kinds are drawn identically
	'aerialway:outline': [
		'aerialway-cablecar:outline',
		'aerialway-gondola:outline',
		'aerialway-goods:outline',
		'aerialway-chairlift:outline',
		'aerialway-draglift:outline',
		'aerialway-tbar:outline',
		'aerialway-jbar:outline',
		'aerialway-platter:outline',
		'aerialway-ropetow:outline',
	],
	aerialway: [
		'aerialway-cablecar',
		'aerialway-gondola',
		'aerialway-goods',
		'aerialway-chairlift',
		'aerialway-draglift',
		'aerialway-tbar',
		'aerialway-jbar',
		'aerialway-platter',
		'aerialway-ropetow',
	],
	// path + cycleway — the two kinds of the `roads.paths` group (footway and steps have their own
	// groups, so they stay separate even though the bridge deck draws them the same).
	'bridge-way-paths:bridge': ['bridge-way-path:bridge', 'bridge-way-cycleway:bridge'],
	// the disputed-country casing is identical to the country casing
	'boundary-country:outline': ['boundary-country:outline', 'boundary-country-disputed:outline'],
};

export { LANDCOVER_LAYERS, LAND_APPEAR_MIN } from './landcover.js';

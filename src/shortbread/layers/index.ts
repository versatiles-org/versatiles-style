import type { LayerContext } from '../context.js';
import type { MaplibreLayer } from '../../types/index.js';
import { slot, gate, type TaggedLayer } from '../../dsl/index.js';
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
	yield* mergeIdenticalLayers(assembleLayers(ctx));
}

// Materialize the assembled layers, adding the source to every non-background layer (background +
// slot anchors carry no source), ready to drop into a style. Per-group visibility/opacity from the
// `layers:` option is applied here in a single pass by `gate`: hidden groups are dropped, fractional
// opacity is merged into each affected layer.
export function buildStyleLayers(ctx: LayerContext): MaplibreLayer[] {
	const layers: MaplibreLayer[] = [];
	for (const { layer } of gate(ctx.layers, shortbreadLayers(ctx))) {
		if (layer.type !== 'background') applyDataFloor(layer);
		layers.push(layer.type === 'background' ? layer : ({ ...layer, source: ctx.source } as MaplibreLayer));
	}
	return layers;
}

/**
 * Raise a layer's `minzoom` to the zoom where its source-layer's data actually begins.
 *
 * `make()` derives `minzoom` from a layer's transition, which covers everything that fades or grows
 * in. Layers with no transition had no gate at all, so MapLibre processed them from z0 while the
 * tiles carried nothing — `water-river` was live from z0 although `water_lines` starts at z9.
 *
 * Only ever raises, never lowers: a layer deliberately gated later than its data keeps that.
 * `addLandcover` runs after this and clears the gate on the fills it reveals, which is what lets
 * the low-zoom landcover extension supply those kinds below their plain-Shortbread zoom (#124).
 */
function applyDataFloor(layer: MaplibreLayer): void {
	const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
	if (!sourceLayer) return;
	const dataFrom = SHORTBREAD_SCHEMA[sourceLayer]?.minzoom;
	if (dataFrom === undefined) return;
	const l = layer as { minzoom?: number };
	if ((l.minzoom ?? 0) < dataFrom) l.minzoom = dataFrom;
}

// ── Merging layers that render identically (issue #51) ───────────────────────

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
const MERGES: Readonly<Record<string, readonly string[]>> = {
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

const MERGE_BY_FIRST_MEMBER = new Map(Object.entries(MERGES).map(([id, members]) => [members[0], { id, members }]));

/** Everything that decides how a layer draws — its identity and its filter aside. */
function renderKey(layer: MaplibreLayer): string {
	const { id, filter, ...rest } = layer as MaplibreLayer & { filter?: unknown };
	void id;
	void filter;
	return JSON.stringify(rest);
}

/**
 * Combine the filters of a merged run.
 *
 * `['any', …]` is always correct, but the run is nearly always a set of layers selecting one `kind`
 * each out of an otherwise identical clause list, so that case collapses to a single `in` test and
 * keeps the emitted filter readable (and small — halving the style's filter text was part of the
 * point of #51). Anything else falls back to `any`.
 */
function mergeFilters(filters: unknown[]): unknown {
	// a layer with no filter draws every feature, so the union is "everything"
	if (filters.some((f) => f === undefined)) return undefined;

	const all = filters as [string, ...unknown[]][];
	if (all.every((f) => f[0] === 'all' && f.length === all[0].length)) {
		const differing: number[] = [];
		for (let i = 1; i < all[0].length; i++) {
			const first = JSON.stringify(all[0][i]);
			if (!all.every((f) => JSON.stringify(f[i]) === first)) differing.push(i);
		}
		if (differing.length === 1) {
			const i = differing[0];
			const clauses = all.map((f) => f[i]) as [string, unknown, unknown][];
			const getter = JSON.stringify(clauses[0]?.[1]);
			if (clauses.every((c) => c[0] === '==' && JSON.stringify(c[1]) === getter)) {
				const merged = [...all[0]];
				merged[i] = ['in', clauses[0][1], ['literal', clauses.map((c) => c[2])]];
				return merged;
			}
		}
	}
	return ['any', ...filters];
}

/**
 * Collapse the registered merges (`MERGES`) into single layers (issue #51: v6 emitted 355 layers
 * against v5's 324).
 *
 * A registered merge is applied when its members arrive **adjacent**, in the **same group**, and
 * identical in every property **except their filter** — so the merged layer paints exactly the pixels
 * they did, and `osm.layerGroups` keeps controlling the same features. Feature order within the
 * merged layer differs from the old layer-by-layer order, which cannot matter: the paint is the same
 * for all of them. Layers that are not registered are never merged, however they are drawn.
 *
 * Symbol layers are never registered: MapLibre resolves label collisions in layer order, so folding
 * `label-street-*` together would change which street name survives a collision.
 *
 * This runs over the assembled generator rather than over the built style so that
 * `getLayerGroupMap()` — which walks the same generator — reports the merged IDs. Merging before
 * `gate()` is safe because a merge is single-group: whatever `gate` does to one member it does to all.
 */
export function* mergeIdenticalLayers(source: Iterable<TaggedLayer>): Generator<TaggedLayer> {
	const layers = [...source];
	for (let i = 0; i < layers.length; i++) {
		const merge = MERGE_BY_FIRST_MEMBER.get(layers[i].layer.id);
		const run = merge ? layers.slice(i, i + merge.members.length) : [];
		const applies =
			merge !== undefined &&
			run.length === merge.members.length &&
			run.every(
				(tagged, k) =>
					tagged.layer.id === merge.members[k] &&
					tagged.group === run[0].group &&
					renderKey(tagged.layer) === renderKey(run[0].layer)
			);
		if (!applies) {
			yield layers[i];
			continue;
		}
		const filter = mergeFilters(run.map((t) => (t.layer as { filter?: unknown }).filter));
		const merged = { ...run[0].layer, id: merge.id } as MaplibreLayer & { filter?: unknown };
		if (filter === undefined) delete merged.filter;
		else merged.filter = filter;
		yield { layer: merged, group: run[0].group };
		i += merge.members.length - 1;
	}
}

import type { LayerContext } from '../context.js';
import type { MaplibreLayer } from '../../types/index.js';
import { slot, gate, type TaggedLayer } from '../build.js';
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
function* assembleLayers(ctx: LayerContext): Generator<TaggedLayer> {
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
 * Chosen ID for each merged run, keyed by the run's shared prefix + shared suffix.
 *
 * Derived names would be unusable — `site-university` + `site-college` + `site-school` share the
 * prefix `site-` and no suffix, giving `site-`. So every merge names itself here, and
 * `mergeIdenticalLayers` throws on a run that is missing, which turns a future style change that
 * creates a new merge into a naming decision rather than a silently invented ID.
 */
const MERGED_IDS: Readonly<Record<string, string>> = {
	// sites: the three education kinds share the `siteEducation` colour, and both parking kinds
	// share `siteParking`.
	'site-': 'site-education',
	'site-parking': 'site-parking',
	// residential + unclassified are one visual class ("minor"), as are the two bus-only kinds,
	// across all three structure bands.
	'tunnel-street-:outline': 'tunnel-street-minor:outline',
	'tunnel-street-': 'tunnel-street-minor',
	'tunnel-street--bicycle': 'tunnel-street-minor-bicycle',
	'tunnel-street-busway:outline': 'tunnel-street-bus:outline',
	'tunnel-street-busway': 'tunnel-street-bus',
	'street-:outline': 'street-minor:outline',
	'street-': 'street-minor',
	'street--bicycle': 'street-minor-bicycle',
	'street-busway:outline': 'street-bus:outline',
	'street-busway': 'street-bus',
	'bridge-street-:bridge': 'bridge-street-minor:bridge',
	'bridge-street-:outline': 'bridge-street-minor:outline',
	'bridge-street-': 'bridge-street-minor',
	'bridge-street--bicycle': 'bridge-street-minor-bicycle',
	'bridge-street-busway:bridge': 'bridge-street-bus:bridge',
	'bridge-street-busway:outline': 'bridge-street-bus:outline',
	'bridge-street-busway': 'bridge-street-bus',
	// tram / narrowgauge / funicular / monorail share one style — see `wayStyle`, which handles all
	// four in a single branch.
	'tunnel-transport-:outline': 'tunnel-transport-minorrail:outline',
	'tunnel-transport-': 'tunnel-transport-minorrail',
	'transport-:outline': 'transport-minorrail:outline',
	'transport-': 'transport-minorrail',
	'bridge-transport-:outline': 'bridge-transport-minorrail:outline',
	'bridge-transport-': 'bridge-transport-minorrail',
	// all nine aerialway kinds are drawn identically
	'aerialway-:outline': 'aerialway:outline',
	'aerialway-': 'aerialway',
	// primary + secondary links. `roads.ts` reserves "arterial" for exactly the yellow/orange
	// classes and explicitly excludes tertiary, which is why this is not named after its
	// `roads.highways` group — `street-tertiary-link` sits in that group too, styled differently.
	// (trunk and motorway links are arterial as well but live in `roads.motorways`, and neither
	// shares this style: motorway links appear a zoom earlier.)
	'tunnel-street-ary-link:outline': 'tunnel-street-arterial-link:outline',
	'tunnel-street-ary-link': 'tunnel-street-arterial-link',
	'street-ary-link:outline': 'street-arterial-link:outline',
	'street-ary-link': 'street-arterial-link',
	'bridge-street-ary-link:bridge': 'bridge-street-arterial-link:bridge',
	'bridge-street-ary-link:outline': 'bridge-street-arterial-link:outline',
	'bridge-street-ary-link': 'bridge-street-arterial-link',
	// path + cycleway — the two kinds of the `roads.paths` group (footway and steps have their own
	// groups, so they stay separate even though the bridge deck draws them the same).
	'bridge-way-:bridge': 'bridge-way-paths:bridge',
	// the disputed-country casing is identical to the country casing
	'boundary-country:outline': 'boundary-country:outline',
};

/** Length of the run of characters every string shares, from the front or the back. */
function sharedAffix(ids: string[], fromEnd: boolean): number {
	const shortest = Math.min(...ids.map((s) => s.length));
	const at = (s: string, i: number): string => (fromEnd ? s[s.length - 1 - i] : s[i]);
	let n = 0;
	while (n < shortest && ids.every((s) => at(s, n) === at(ids[0], n))) n++;
	return n;
}

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
 * Collapse adjacent layers that MapLibre would draw identically into one (issue #51: v6 emitted 355
 * layers against v5's 324).
 *
 * A run qualifies only when every member is **adjacent**, carries the **same group**, and is
 * identical in every property **except its filter** — so the merged layer paints exactly the pixels
 * the run did, and `osm.layerGroups` keeps controlling the same features. Feature order within the
 * merged layer differs from the old layer-by-layer order, which cannot matter: the paint is by
 * definition the same for all of them.
 *
 * Two exclusions, both about ordering:
 * - **`symbol` layers are never merged.** MapLibre resolves label collisions in layer order, so
 *   folding `label-street-pedestrian` … `label-street-motorway` into one layer would change which
 *   street name survives a collision. That is a real rendering change, not a merge.
 * - **Layers with no `source-layer`** (background, slot anchors) are left alone; the slots exist to
 *   be addressed by ID.
 *
 * This runs over the assembled generator rather than over the built style so that
 * `getLayerGroupMap()` — which walks the same generator — reports the merged IDs. Merging before
 * `gate()` is safe precisely because a run is single-group: whatever `gate` does to one member it
 * does to all of them.
 */
export function* mergeIdenticalLayers(source: Iterable<TaggedLayer>): Generator<TaggedLayer> {
	let run: TaggedLayer[] = [];

	function* flush(): Generator<TaggedLayer> {
		if (run.length === 0) return;
		if (run.length === 1) {
			yield run[0];
			run = [];
			return;
		}
		const ids = run.map((t) => t.layer.id);
		const prefix = sharedAffix(ids, false);
		const suffix = sharedAffix(ids, true);
		const shortest = Math.min(...ids.map((s) => s.length));
		const key = prefix + suffix <= shortest ? ids[0].slice(0, prefix) + ids[0].slice(ids[0].length - suffix) : ids[0];
		const id = MERGED_IDS[key];
		if (id === undefined) {
			throw new Error(
				`mergeIdenticalLayers: ${ids.length} layers render identically (${ids.join(', ')}) but no merged ID is ` +
					`registered for "${key}" — add one to MERGED_IDS in shortbread/layers/index.ts`
			);
		}
		const filter = mergeFilters(run.map((t) => (t.layer as { filter?: unknown }).filter));
		const merged = { ...run[0].layer, id } as MaplibreLayer & { filter?: unknown };
		if (filter === undefined) delete merged.filter;
		else merged.filter = filter;
		yield { layer: merged, group: run[0].group };
		run = [];
	}

	for (const tagged of source) {
		const { layer, group } = tagged;
		const mergeable = layer.type !== 'symbol' && (layer as { 'source-layer'?: string })['source-layer'] !== undefined;
		const joins = mergeable && run.length > 0 && run[0].group === group && renderKey(run[0].layer) === renderKey(layer);
		if (joins) {
			run.push(tagged);
			continue;
		}
		yield* flush();
		if (mergeable) run = [tagged];
		else yield tagged;
	}
	yield* flush();
}

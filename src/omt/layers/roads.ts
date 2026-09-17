import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import { emitRoads, type RoadVocabulary } from '../../cartography/index.js';
import type { MaplibreLayerDefinition } from '../../types/index.js';
import * as b from '../../dsl/index.js';

// Roads, paths, rail, aerialways and ferries — the OpenMapTiles half.
//
// Only the *structure* is here. The styling that used to be duplicated below now lives once in
// `src/cartography/roads.ts`: 314 of its ~330 lines were byte-identical between the two schemas, and
// every line that differed was the vocabulary in `VOCAB` (SCHEMA-SUPPORT-PLAN.md §7 step 8).
//
// ── What the tiles say ────────────────────────────────────────────────────────
//
// Everything structural here is from `npm run schema-values -- omt transportation`. Seven findings, in
// descending order of how much they changed the port:
//
//  1. **`minor` collapses three Shortbread kinds into one.** `residential`, `unclassified` and
//     `living_street` are all `class: minor`. Shortbread emits three layers and then merges two of them;
//     here there is one layer and nothing to merge. This is the port's largest single loss of fidelity,
//     and it is in the data, not in the style: no filter can separate a living street from a
//     residential one.
//  2. **`class: path` is the whole pedestrian family**, distinguished by `subclass`: footway, steps,
//     cycleway, pedestrian, path, corridor, platform. Shortbread gives each its own `kind`, so the
//     distinction survives — one level deeper.
//  3. **Mixed geometry.** `class: path` carries 598 polygons and 1291 lines; `bridge` is polygon-only;
//     `pier` is both. A line layer paints polygon boundaries, so every line structure filters
//     `LineString` and every area filters `Polygon`. Shortbread needed none of this: it separates
//     `streets` from `street_polygons`.
//  4. **The bridge deck area is `class: bridge`**, a polygon class of the same layer — not the separate
//     `bridges` source-layer Shortbread reads, and not gone as the gate first assumed.
//  5. **`oneway` is `1` / `-1`, not two booleans.** Shortbread carries `oneway` and `oneway_reverse`;
//     `-1` was observed, so the reverse case is expressible after all.
//  6. **`link` is `ramp: 1`**, and `tunnel`/`bridge` are the one `brunnel` enum.
//  7. **Aerialways need no per-kind layers.** Shortbread emits nine (cable_car, gondola, goods,
//     chair_lift, drag_lift, t-bar, j-bar, platter, rope-tow) and then merges all nine into one, because
//     they draw identically. `class: aerialway` is a single filter that does the same job, so the
//     `MERGES` entry that collapsed eighteen ids has no counterpart here.
//
// ── Layer structures (tunnel / surface / bridge levels + rail/aerialway/ferry) ──

/** One source-layer carries both geometries, so every structure must say which one it wants (finding 3). */
const LINES: FilterSpecification = ['==', ['geometry-type'], 'LineString'];
const AREAS: FilterSpecification = ['==', ['geometry-type'], 'Polygon'];

/** `class` + `subclass` pairs for the path family, keyed by the layer id Shortbread uses (finding 2). */
const PATH_SUBCLASS: Record<string, string> = {
	footway: 'footway',
	steps: 'steps',
	path: 'path',
	cycleway: 'cycleway',
};

/** Rail-ish types: the id suffix, and the `class`/`subclass` pair that selects it (findings from zermatt). */
const RAIL_TYPES: { id: string; class: string; subclass: string; hasService: boolean }[] = [
	{ id: 'rail', class: 'rail', subclass: 'rail', hasService: true },
	{ id: 'lightrail', class: 'transit', subclass: 'light_rail', hasService: true },
	{ id: 'subway', class: 'transit', subclass: 'subway', hasService: true },
	{ id: 'narrowgauge', class: 'rail', subclass: 'narrow_gauge', hasService: true },
	{ id: 'tram', class: 'transit', subclass: 'tram', hasService: true },
	// Not observed in the sample; OpenMapTiles documents both as `transit` subclasses, and an unmatched
	// filter costs nothing where a missing one would lose the feature.
	{ id: 'funicular', class: 'transit', subclass: 'funicular', hasService: false },
	{ id: 'monorail', class: 'transit', subclass: 'monorail', hasService: false },
];

function buildStructures(): MaplibreLayerDefinition[] {
	return (['tunnel', 'street', 'bridge'] as const).flatMap((c): MaplibreLayerDefinition[] => {
		let filter: FilterSpecification[];
		let prefix: string;
		let suffixes: string[];

		switch (c) {
			case 'tunnel':
				filter = [['==', ['get', 'brunnel'], 'tunnel'] as FilterSpecification];
				prefix = 'tunnel-';
				suffixes = [':outline', ''];
				break;
			case 'street':
				filter = [
					['!=', ['get', 'brunnel'], 'bridge'] as FilterSpecification,
					['!=', ['get', 'brunnel'], 'tunnel'] as FilterSpecification,
				];
				prefix = '';
				suffixes = [':outline', ''];
				break;
			case 'bridge':
				filter = [['==', ['get', 'brunnel'], 'bridge'] as FilterSpecification];
				prefix = 'bridge-';
				suffixes = [':bridge', ':outline', ''];
				break;
		}

		const results: MaplibreLayerDefinition[] = [];
		const line = (id: string, ...clauses: FilterSpecification[]) =>
			results.push({
				id,
				type: 'line',
				'source-layer': 'transportation',
				filter: ['all', LINES, ...clauses, ...filter] as FilterSpecification,
			});

		// The bridge deck area: `class: bridge` polygons, where Shortbread reads a whole source-layer.
		// Emitted once (in the surface pass) as there, and carrying no `brunnel` clause — the deck *is* the
		// bridge, so it is not additionally flagged as one.
		if (c === 'street')
			results.push({
				id: 'bridge',
				type: 'fill',
				'source-layer': 'transportation',
				filter: ['all', AREAS, ['==', ['get', 'class'], 'bridge']] as FilterSpecification,
			});

		for (const suffix of suffixes) {
			if (suffix === ':outline')
				results.push({
					id: prefix + 'street-pedestrian-zone',
					type: 'fill',
					'source-layer': 'transportation',
					filter: [
						'all',
						AREAS,
						...filter,
						['==', ['get', 'class'], 'path'],
						['==', ['get', 'subclass'], 'pedestrian'],
					] as FilterSpecification,
				});

			for (const [id, subclass] of Object.entries(PATH_SUBCLASS)) {
				line(prefix + 'way-' + id + suffix, ['==', ['get', 'class'], 'path'], ['==', ['get', 'subclass'], subclass]);
			}

			// `minor` in place of Shortbread's residential / unclassified / livingstreet (finding 1);
			// `busguideway` has no OpenMapTiles class and is dropped.
			for (const t of ['track', 'pedestrian', 'service', 'minor', 'busway']) {
				if (t === 'pedestrian') {
					line(
						prefix + 'street-pedestrian' + suffix,
						['==', ['get', 'class'], 'path'],
						['==', ['get', 'subclass'], 'pedestrian']
					);
				} else {
					line(prefix + 'street-' + t + suffix, ['==', ['get', 'class'], t]);
				}
			}

			if (suffix === '')
				for (const t of ['track', 'pedestrian', 'service', 'minor']) {
					const classClauses: FilterSpecification[] =
						t === 'pedestrian'
							? [
									['==', ['get', 'class'], 'path'],
									['==', ['get', 'subclass'], 'pedestrian'],
								]
							: [['==', ['get', 'class'], t]];
					line(prefix + 'street-' + t + '-bicycle', ...classClauses, ['==', ['get', 'bicycle'], 'designated']);
				}

			// `link` is `ramp: 1` (finding 6).
			for (const t of ['tertiary', 'secondary', 'primary', 'trunk', 'motorway']) {
				line(prefix + 'street-' + t + '-link' + suffix, ['==', ['get', 'class'], t], ['==', ['get', 'ramp'], 1]);
			}
			for (const t of ['tertiary', 'secondary', 'primary', 'trunk', 'motorway']) {
				line(prefix + 'street-' + t + suffix, ['==', ['get', 'class'], t], ['!=', ['get', 'ramp'], 1]);
			}
		}

		for (const suffix of [':outline', ''] as const) {
			for (const rail of [...RAIL_TYPES].reverse()) {
				const pair: FilterSpecification[] = [
					['==', ['get', 'class'], rail.class],
					['==', ['get', 'subclass'], rail.subclass],
				];
				if (rail.hasService) {
					line(prefix + 'transport-' + rail.id + suffix, ...pair, ['!', ['has', 'service']]);
					line(prefix + 'transport-' + rail.id + '-service' + suffix, ...pair, ['has', 'service']);
				} else {
					line(prefix + 'transport-' + rail.id + suffix, ...pair);
				}
			}

			if (c === 'street') {
				// One layer, not nine plus a merge (finding 7). No `...filter`: the `brunnel` clauses were
				// always true for an aerialway in Shortbread's separate source-layer, and remain irrelevant.
				results.push({
					id: 'aerialway' + suffix,
					type: 'line',
					'source-layer': 'transportation',
					filter: ['all', LINES, ['==', ['get', 'class'], 'aerialway']] as FilterSpecification,
				});
				results.push({
					id: 'transport-ferry' + suffix,
					type: 'line',
					'source-layer': 'transportation',
					filter: ['all', LINES, ['==', ['get', 'class'], 'ferry']] as FilterSpecification,
				});
			}
		}

		return results;
	});
}

/**
 * OpenMapTiles collapses residential, unclassified and living_street into one `minor` class and has no
 * `busguideway` at all — the port's largest single loss of fidelity, and the whole of what separates its
 * road styling from Shortbread's.
 *
 * The appearance zooms are **carried over from the Shortbread table, not measured**: confirming which
 * classes exist took a dozen tiles, confirming when each starts needs a zoom sweep the value sample
 * cannot give. They are this module's least evidence-backed numbers.
 */
const VOCAB: RoadVocabulary = {
	minorBases: ['minor'],
	serviceBases: ['service', 'busway'],
	appear: {
		motorway: 5,
		trunk: 6,
		primary: 8,
		secondary: 9,
		tertiary: 10,
		// `minor` stands for residential / unclassified / living_street, which appeared at 12, 12 and 13;
		// the earliest of the three is the honest choice for the merged class.
		minor: 12,
		busway: 12,
		pedestrian: 13,
		service: 13,
		track: 13,
	},
};

export function* roads(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield* emitRoads(ctx, buildStructures(), VOCAB);
}

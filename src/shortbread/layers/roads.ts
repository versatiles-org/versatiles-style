import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import { emitRoads, type RoadVocabulary } from '../../cartography/index.js';
import type { MaplibreLayerDefinition } from '../../types/index.js';
import * as b from '../../dsl/index.js';

// Roads, paths, rail, aerialways and ferries — the Shortbread half.
//
// Only the *structure* is here: which source-layer and filter select each road type, at each of the
// three levels (tunnel / surface / bridge). The styling is shared with every other schema in
// `src/cartography/roads.ts`, which dispatches on the layer ids this file names; see that module for
// why it is shared and what `RoadVocabulary` carries.

// ── Layer structures (tunnel / surface / bridge levels + rail/aerialway/ferry) ──

/** A street layer: the id after `street-`, and the Shortbread kinds it draws. */
type StreetClass = { id: string; kinds: string[] };

const kindFilter = (kinds: string[]): FilterSpecification =>
	kinds.length === 1 ? ['==', ['get', 'kind'], kinds[0]] : ['in', ['get', 'kind'], ['literal', kinds]];

/** One class per kind, its id the kind without underscores. */
const single = (...kinds: string[]): StreetClass[] => kinds.map((k) => ({ id: k.replace(/_/g, ''), kinds: [k] }));

/**
 * Street lines and casings. `minor` and `bus` are the `minorBases` and `serviceBases` classes of `VOCAB`
 * below, which is how the shared cartography styles them like the kinds they draw.
 */
const STREET_CLASSES: StreetClass[] = [
	...single('track', 'pedestrian', 'service', 'living_street'),
	{ id: 'minor', kinds: ['residential', 'unclassified'] },
	{ id: 'bus', kinds: ['busway', 'bus_guideway'] },
];
/** Bridge decks: as above, with living streets drawn on the minor deck. */
const DECK_CLASSES: StreetClass[] = [
	...single('track', 'pedestrian', 'service'),
	{ id: 'minor', kinds: ['living_street', 'residential', 'unclassified'] },
	{ id: 'bus', kinds: ['busway', 'bus_guideway'] },
];
/** Bicycle overlays, with living streets in the minor overlay. */
const BICYCLE_CLASSES: StreetClass[] = [
	...single('track', 'pedestrian', 'service'),
	{ id: 'minor', kinds: ['living_street', 'residential', 'unclassified'] },
];
/** Ramps (`link: true`). `arterial` is the cartography's name for the secondary and primary class. */
const LINK_CLASSES: StreetClass[] = [
	...single('tertiary'),
	{ id: 'arterial', kinds: ['secondary', 'primary'] },
	...single('trunk', 'motorway'),
];

function buildStructures(): MaplibreLayerDefinition[] {
	return (['tunnel', 'street', 'bridge'] as const).flatMap((c): MaplibreLayerDefinition[] => {
		let filter: FilterSpecification[];
		let prefix: string;
		let suffixes: string[];

		switch (c) {
			case 'tunnel':
				filter = [['==', ['get', 'tunnel'], true] as FilterSpecification];
				prefix = 'tunnel-';
				suffixes = [':outline', ''];
				break;
			case 'street':
				filter = [
					['!=', ['get', 'bridge'], true] as FilterSpecification,
					['!=', ['get', 'tunnel'], true] as FilterSpecification,
				];
				prefix = '';
				suffixes = [':outline', ''];
				break;
			case 'bridge':
				filter = [['==', ['get', 'bridge'], true] as FilterSpecification];
				prefix = 'bridge-';
				suffixes = [':bridge', ':outline', ''];
				break;
		}

		const results: MaplibreLayerDefinition[] = [];

		if (c === 'street') results.push({ id: 'bridge', type: 'fill', 'source-layer': 'bridges' });

		for (const suffix of suffixes) {
			if (suffix === ':outline')
				results.push({
					id: prefix + 'street-pedestrian-zone',
					type: 'fill',
					'source-layer': 'street_polygons',
					filter: ['all', ...filter, ['==', ['get', 'kind'], 'pedestrian']] as FilterSpecification,
				});

			for (const t of ['footway', 'steps', 'path', 'cycleway']) {
				// One deck serves both kinds of `roads.paths`: path and cycleway differ in colour on top,
				// not in the bridge beneath them. Footway and steps draw the same deck too, but each has a
				// layer group of its own, so their decks stay separate layers.
				if (suffix === ':bridge' && t === 'cycleway') continue;
				if (suffix === ':bridge' && t === 'path') {
					results.push({
						id: prefix + 'way-paths' + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: [
							'all',
							...filter,
							['in', ['get', 'kind'], ['literal', ['path', 'cycleway']]],
						] as FilterSpecification,
					});
					continue;
				}
				results.push({
					id: prefix + 'way-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ...filter, ['==', ['get', 'kind'], t]] as FilterSpecification,
				});
			}

			// The street classes this pass draws: kinds drawn alike share one layer. The road line and its
			// casing keep living streets apart, because they fade in a zoom later than the other minor
			// streets; the bridge deck does not fade by kind, so there they join `minor`.
			const classes = suffix === ':bridge' ? DECK_CLASSES : STREET_CLASSES;
			for (const { id, kinds } of classes) {
				results.push({
					id: prefix + 'street-' + id + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', kindFilter(kinds), ...filter] as FilterSpecification,
				});
			}

			// The bicycle overlay draws minor streets with one fixed fade, so living streets join `minor`
			// here too. Track and service get no overlay; their definitions are skipped by the style.
			if (suffix === '')
				for (const { id, kinds } of BICYCLE_CLASSES) {
					results.push({
						id: prefix + 'street-' + id + '-bicycle',
						type: 'line',
						'source-layer': 'streets',
						filter: [
							'all',
							kindFilter(kinds),
							['==', ['get', 'bicycle'], 'designated'],
							...filter,
						] as FilterSpecification,
					});
				}

			// Secondary and primary ramps draw alike — the arterial link — and so share a layer.
			for (const { id, kinds } of LINK_CLASSES) {
				results.push({
					id: prefix + 'street-' + id + '-link' + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ...filter, kindFilter(kinds), ['==', ['get', 'link'], true]] as FilterSpecification,
				});
			}

			for (const t of ['tertiary', 'secondary', 'primary', 'trunk', 'motorway']) {
				results.push({
					id: prefix + 'street-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ...filter, ['==', ['get', 'kind'], t], ['!=', ['get', 'link'], true]] as FilterSpecification,
				});
			}
		}

		for (const suffix of [':outline', ''] as const) {
			const track = (id: string, kind: FilterSpecification, service: FilterSpecification) =>
				results.push({
					id: prefix + 'transport-' + id + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', kind, service, ...filter] as FilterSpecification,
				});
			const kindIs = (t: string): FilterSpecification => ['==', ['get', 'kind'], t];
			const NOT_SERVICE: FilterSpecification = ['!', ['has', 'service']];
			const SERVICE: FilterSpecification = ['has', 'service'];
			// Rail and light rail share one style (`transportStyle` handles both in one branch), so one
			// layer draws the main lines of both and one the service tracks.
			const RAIL: FilterSpecification = ['in', ['get', 'kind'], ['literal', ['rail', 'light_rail']]];
			track('rail', RAIL, NOT_SERVICE);
			track('rail-service', RAIL, SERVICE);
			track('subway', kindIs('subway'), NOT_SERVICE);
			// Drawn by nothing — `transportStyle` has no subway service track — and so skipped.
			track('subway-service', kindIs('subway'), SERVICE);
			// The minor railways share one style too. Narrow gauge and tram draw their main lines only;
			// funicular and monorail have no service distinction at all, so their clause lists differ and
			// the union stays an `any`.
			results.push({
				id: prefix + 'transport-minorrail' + suffix,
				type: 'line',
				'source-layer': 'streets',
				filter: [
					'any',
					['all', kindIs('narrow_gauge'), NOT_SERVICE, ...filter],
					['all', kindIs('tram'), NOT_SERVICE, ...filter],
					['all', kindIs('funicular'), ...filter],
					['all', kindIs('monorail'), ...filter],
				] as FilterSpecification,
			});

			if (c === 'street') {
				// Every aerialway kind draws alike, so one layer serves them all.
				results.push({
					id: 'aerialway' + suffix,
					type: 'line',
					'source-layer': 'aerialways',
					// No `...filter` here: the shared road filter tests `bridge`/`tunnel`, and the
					// `aerialways` layer carries only `kind`, so those clauses were always true.
					filter: [
						'in',
						['get', 'kind'],
						[
							'literal',
							['cable_car', 'gondola', 'goods', 'chair_lift', 'drag_lift', 't-bar', 'j-bar', 'platter', 'rope-tow'],
						],
					] as FilterSpecification,
				});
				results.push({ id: 'transport-ferry' + suffix, type: 'line', 'source-layer': 'ferries' });
			}
		}

		return results;
	});
}

/**
 * Shortbread names its ordinary streets three ways and its bus ways two, and its `streets` layer serves
 * each kind from its own zoom (https://shortbread-tiles.org/schema/1.0/) — measured against the live
 * tileset rather than the prose spec, which understates when rivers and canals arrive.
 */
const VOCAB: RoadVocabulary = {
	// `minor` and `bus` are the classes the merged street layers are named after (`STREET_CLASSES`).
	minorBases: ['minor', 'residential', 'unclassified', 'livingstreet'],
	serviceBases: ['service', 'bus', 'busway', 'busguideway'],
	appear: {
		motorway: 5,
		trunk: 6,
		primary: 8,
		secondary: 9,
		tertiary: 10,
		residential: 12,
		unclassified: 12,
		minor: 12,
		bus: 12,
		busway: 12,
		busguideway: 12,
		livingstreet: 13,
		pedestrian: 13,
		service: 13,
		track: 13,
	},
};

export function* roads(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield* emitRoads(ctx, buildStructures(), VOCAB);
}

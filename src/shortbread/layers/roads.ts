import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import { emitRoads, type RoadVocabulary } from '../../cartography/roads.js';
import type { MaplibreLayerDefinition } from '../../types/index.js';
import * as b from '../../dsl/index.js';

// Roads, paths, rail, aerialways and ferries — the Shortbread half.
//
// Only the *structure* is here: which source-layer and filter select each road type, at each of the
// three levels (tunnel / surface / bridge). The styling is shared with every other schema in
// `src/cartography/roads.ts`, which dispatches on the layer ids this file names; see that module for
// why it is shared and what `RoadVocabulary` carries (SCHEMA-SUPPORT-PLAN.md §7 step 8).

// ── Layer structures (tunnel / surface / bridge levels + rail/aerialway/ferry) ──

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
				results.push({
					id: prefix + 'way-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ...filter, ['==', ['get', 'kind'], t]] as FilterSpecification,
				});
			}

			for (const t of [
				'track',
				'pedestrian',
				'service',
				'living_street',
				'residential',
				'unclassified',
				'busway',
				'bus_guideway',
			]) {
				results.push({
					id: prefix + 'street-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ['==', ['get', 'kind'], t], ...filter] as FilterSpecification,
				});
			}

			if (suffix === '')
				for (const t of ['track', 'pedestrian', 'service', 'living_street', 'residential', 'unclassified']) {
					results.push({
						id: prefix + 'street-' + t.replace(/_/g, '') + '-bicycle',
						type: 'line',
						'source-layer': 'streets',
						filter: [
							'all',
							['==', ['get', 'kind'], t],
							['==', ['get', 'bicycle'], 'designated'],
							...filter,
						] as FilterSpecification,
					});
				}

			for (const t of ['tertiary', 'secondary', 'primary', 'trunk', 'motorway']) {
				results.push({
					id: prefix + 'street-' + t.replace(/_/g, '') + '-link' + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ...filter, ['==', ['get', 'kind'], t], ['==', ['get', 'link'], true]] as FilterSpecification,
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
			for (const t of ['tram', 'narrow_gauge', 'subway', 'light_rail', 'rail'].reverse()) {
				results.push({
					id: prefix + 'transport-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ['==', ['get', 'kind'], t], ['!', ['has', 'service']], ...filter] as FilterSpecification,
				});
				results.push({
					id: prefix + 'transport-' + t.replace(/_/g, '') + '-service' + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ['==', ['get', 'kind'], t], ['has', 'service'], ...filter] as FilterSpecification,
				});
			}
			for (const t of ['monorail', 'funicular'].reverse()) {
				results.push({
					id: prefix + 'transport-' + t.replace(/_/g, '') + suffix,
					type: 'line',
					'source-layer': 'streets',
					filter: ['all', ['==', ['get', 'kind'], t], ...filter] as FilterSpecification,
				});
			}

			if (c === 'street') {
				for (const t of [
					'rope-tow',
					'platter',
					'j-bar',
					't-bar',
					'drag_lift',
					'chair_lift',
					'goods',
					'gondola',
					'cable_car',
				].reverse()) {
					results.push({
						id: 'aerialway-' + t.replace(/[_-]+/g, '') + suffix,
						type: 'line',
						'source-layer': 'aerialways',
						// No `...filter` here: the shared road filter tests `bridge`/`tunnel`, and the
						// `aerialways` layer carries only `kind`, so those clauses were always true.
						filter: ['==', ['get', 'kind'], t] as FilterSpecification,
					});
				}
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
	minorBases: ['residential', 'unclassified', 'livingstreet'],
	serviceBases: ['service', 'busway', 'busguideway'],
	appear: {
		motorway: 5,
		trunk: 6,
		primary: 8,
		secondary: 9,
		tertiary: 10,
		residential: 12,
		unclassified: 12,
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

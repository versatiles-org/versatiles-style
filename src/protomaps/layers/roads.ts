import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import type { MaplibreLayerDefinition } from '../../types/index.js';
import * as b from '../../dsl/index.js';
import { emitRoads, type RoadVocabulary } from '../../cartography/roads.js';

// Roads, paths, rail, aerialways and ferries — the Protomaps half.
//
// Only the *structure* is here; the styling is shared (`src/cartography/roads.ts`).
//
// ── Where this port is the easy one ───────────────────────────────────────────
//
// From `npm run schema-values -- protomaps roads`: `kind` is nine coarse buckets (path, minor_road,
// major_road, highway, rail, aeroway, ferry, aerialway, other) and `kind_detail` carries the original
// OSM value — residential, unclassified, service, footway, steps, cycleway, pedestrian, motorway,
// trunk, primary, secondary, tertiary, subway, tram, runway, taxiway, pier, and the `_link` variants.
//
// That makes Protomaps the **closest of the three to Shortbread on roads**, and the shared vocabulary
// shows it: `minorBases` is `residential`/`unclassified`/`living_street`, the same three Shortbread
// names, where OpenMapTiles has to collapse them into one `minor`. `is_bridge`, `is_tunnel` and
// `is_link` are booleans too, exactly Shortbread's shape.
//
// One structural loss: there is no bridge *area*. `is_bridge` flags the carriageway and nothing carries
// a deck polygon, so `bridge` — the fill Shortbread reads from its own source-layer and OpenMapTiles
// from `class: bridge` — is not emitted.

const LINES: FilterSpecification = ['==', ['geometry-type'], 'LineString'];

/** `kind_detail` values per structural type, keyed by the layer id the shared style dispatches on. */
const PATHS: Record<string, string> = { footway: 'footway', steps: 'steps', path: 'path', cycleway: 'cycleway' };
const RAIL: { id: string; detail: string }[] = [
	{ id: 'rail', detail: 'rail' },
	{ id: 'lightrail', detail: 'light_rail' },
	{ id: 'subway', detail: 'subway' },
	{ id: 'narrowgauge', detail: 'narrow_gauge' },
	{ id: 'tram', detail: 'tram' },
	{ id: 'funicular', detail: 'funicular' },
	{ id: 'monorail', detail: 'monorail' },
];

function buildStructures(): MaplibreLayerDefinition[] {
	return (['tunnel', 'street', 'bridge'] as const).flatMap((c): MaplibreLayerDefinition[] => {
		let filter: FilterSpecification[];
		let prefix: string;
		let suffixes: string[];

		switch (c) {
			case 'tunnel':
				filter = [['==', ['get', 'is_tunnel'], true] as FilterSpecification];
				prefix = 'tunnel-';
				suffixes = [':outline', ''];
				break;
			case 'street':
				filter = [
					['!=', ['get', 'is_bridge'], true] as FilterSpecification,
					['!=', ['get', 'is_tunnel'], true] as FilterSpecification,
				];
				prefix = '';
				suffixes = [':outline', ''];
				break;
			case 'bridge':
				filter = [['==', ['get', 'is_bridge'], true] as FilterSpecification];
				prefix = 'bridge-';
				suffixes = [':bridge', ':outline', ''];
				break;
		}

		const results: MaplibreLayerDefinition[] = [];
		const line = (id: string, ...clauses: FilterSpecification[]) =>
			results.push({
				id,
				type: 'line',
				'source-layer': 'roads',
				filter: ['all', LINES, ...clauses, ...filter] as FilterSpecification,
			});

		for (const suffix of suffixes) {
			if (suffix === ':outline')
				results.push({
					// Pedestrian areas are a landuse concept here, not a road one — verified as
					// `landuse` `kind: pedestrian`, 387 polygons in the sample.
					id: prefix + 'street-pedestrian-zone',
					type: 'fill',
					'source-layer': 'landuse',
					filter: ['==', ['get', 'kind'], 'pedestrian'] as FilterSpecification,
				});

			for (const [id, detail] of Object.entries(PATHS)) {
				line(prefix + 'way-' + id + suffix, ['==', ['get', 'kind_detail'], detail]);
			}

			for (const t of ['track', 'pedestrian', 'service', 'residential', 'unclassified', 'livingstreet', 'busway']) {
				const detail = t === 'livingstreet' ? 'living_street' : t;
				line(prefix + 'street-' + t + suffix, ['==', ['get', 'kind_detail'], detail]);
			}

			// No bicycle overlays: Protomaps has no `bicycle` field, so Shortbread's designated-cycleway
			// tint over ordinary streets cannot be expressed. Emitting the layers anyway would filter on a
			// field the tiles lack — matching nothing, silently — so they are left out and
			// `roads.streets.*` simply has fewer layers here.

			for (const t of ['tertiary', 'secondary', 'primary', 'trunk', 'motorway']) {
				line(prefix + 'street-' + t + '-link' + suffix, ['==', ['get', 'kind_detail'], t + '_link']);
			}
			for (const t of ['tertiary', 'secondary', 'primary', 'trunk', 'motorway']) {
				line(prefix + 'street-' + t + suffix, ['==', ['get', 'kind_detail'], t]);
			}
		}

		for (const suffix of [':outline', ''] as const) {
			for (const rail of [...RAIL].reverse()) {
				const detail: FilterSpecification[] = [['==', ['get', 'kind_detail'], rail.detail]];
				line(prefix + 'transport-' + rail.id + suffix, ...detail, ['!', ['has', 'service']]);
				line(prefix + 'transport-' + rail.id + '-service' + suffix, ...detail, ['has', 'service']);
			}

			if (c === 'street') {
				// One layer, as in the OpenMapTiles port: `kind: aerialway` covers every lift type.
				results.push({
					id: 'aerialway' + suffix,
					type: 'line',
					'source-layer': 'roads',
					filter: ['all', LINES, ['==', ['get', 'kind'], 'aerialway']] as FilterSpecification,
				});
				results.push({
					id: 'transport-ferry' + suffix,
					type: 'line',
					'source-layer': 'roads',
					filter: ['all', LINES, ['==', ['get', 'kind'], 'ferry']] as FilterSpecification,
				});
			}
		}

		return results;
	});
}

/**
 * Protomaps keeps `kind_detail` at OSM granularity, so its street vocabulary is Shortbread's — the same
 * three minor names, where OpenMapTiles has one. The appearance zooms are carried over from the
 * Shortbread table and not measured, as in the other port.
 */
const VOCAB: RoadVocabulary = {
	minorBases: ['residential', 'unclassified', 'livingstreet'],
	serviceBases: ['service', 'busway'],
	appear: {
		motorway: 5,
		trunk: 6,
		primary: 8,
		secondary: 9,
		tertiary: 10,
		residential: 12,
		unclassified: 12,
		busway: 12,
		livingstreet: 13,
		pedestrian: 13,
		service: 13,
		track: 13,
	},
};

export function* roads(ctx: LayerContext): Generator<b.TaggedLayer> {
	yield* emitRoads(ctx, buildStructures(), VOCAB);
}

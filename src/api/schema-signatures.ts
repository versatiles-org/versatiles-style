/**
 * Just enough of each schema to recognise its tiles: the source-layer ids, and, for the ids two schemas
 * share, a few fields only one of them carries.
 *
 * ── Why a copy, and not the vendored records ──────────────────────────────────
 *
 * `guessSchema` lives in the root entry and has to know all three schemas. Importing `OMT_SCHEMA` or
 * `PROTOMAPS_SCHEMA` would put `src/omt/` and `src/protomaps/` into the root bundle, which the bundle
 * isolation test forbids, and the records are mostly field lists detection has no use for. This table is
 * a few hundred bytes. `schema-signatures.test.ts` checks it against the three records, so it cannot
 * drift from them unnoticed.
 *
 * ── Why fields, for shared ids ────────────────────────────────────────────────
 *
 * Several ids are used by more than one schema with different data behind them: `boundaries`,
 * `buildings` and `pois` (Shortbread and Protomaps), `landcover`, `landuse` and `water` (OpenMapTiles,
 * Protomaps and Mapbox), and `aeroway`, `building` and `waterway` (OpenMapTiles and Mapbox). By name
 * alone they are evidence for all of them. The fields listed here are structural ones — `class` against
 * `kind`, `admin_level` against `kind_detail` — rather than language fields, which vary with how a
 * tileset was built. A field need not rule out every other schema: OpenMapTiles and Mapbox both put a
 * `class` on `landuse`, which tells either from Protomaps and neither from the other.
 *
 * ── Mapbox ────────────────────────────────────────────────────────────────────
 *
 * Mapbox Streets v8, with the two tilesets its styles load beside it (Terrain v2: `landcover`,
 * `hillshade`, `contour`; Bathymetry v2: `depth`) — a Mapbox style reads all three through one
 * composite source. There is no vendored record behind this one: Mapbox publishes its schema as a
 * documentation page, not as data, so the list is kept by hand. It is here to *recognise* such tiles,
 * which is all reading a Mapbox style needs; there is no builder for them (issue #137).
 */

/** The schemas `guessSchema` recognises. */
export type SchemaName = 'shortbread' | 'openmaptiles' | 'protomaps' | 'mapbox';

/** In the order `guessSchema` reports candidates. */
export const SCHEMA_NAMES: readonly SchemaName[] = ['shortbread', 'openmaptiles', 'protomaps', 'mapbox'];

/** Per schema: every source-layer id → the fields that set it apart, empty for an id no other schema uses. */
export const SCHEMA_SIGNATURES: Readonly<Record<SchemaName, Readonly<Record<string, readonly string[]>>>> = {
	shortbread: {
		addresses: [],
		aerialways: [],
		boundaries: ['admin_level', 'maritime'],
		boundary_labels: [],
		bridges: [],
		buildings: ['dummy', 'hide_3d'],
		dam_lines: [],
		dam_polygons: [],
		ferries: [],
		land: [],
		ocean: [],
		pier_lines: [],
		pier_polygons: [],
		place_labels: [],
		pois: ['amenity', 'leisure', 'shop', 'tourism'],
		public_transport: [],
		sites: [],
		street_labels: [],
		street_labels_points: [],
		street_polygons: [],
		streets: [],
		streets_polygons_labels: [],
		water_lines: [],
		water_lines_labels: [],
		water_polygons: [],
		water_polygons_labels: [],
	},
	openmaptiles: {
		aerodrome_label: [],
		aeroway: ['class'],
		boundary: [],
		building: ['hide_3d', 'render_height'],
		housenumber: [],
		landcover: ['class', 'subclass'],
		landuse: ['class'],
		mountain_peak: [],
		park: [],
		place: [],
		poi: [],
		transportation: [],
		transportation_name: [],
		water: ['brunnel', 'class', 'intermittent'],
		water_name: [],
		waterway: ['brunnel', 'intermittent'],
	},
	protomaps: {
		boundaries: ['kind', 'kind_detail', 'sort_rank'],
		buildings: ['kind', 'kind_detail', 'sort_rank'],
		earth: [],
		landcover: ['kind'],
		landuse: ['kind', 'sort_rank'],
		places: [],
		pois: ['kind', 'kind_detail'],
		roads: [],
		water: ['kind', 'kind_detail', 'sort_rank'],
	},
	mapbox: {
		admin: [],
		aeroway: ['type'],
		airport_label: [],
		building: ['extrude', 'underground'],
		contour: [],
		depth: [],
		hillshade: [],
		housenum_label: [],
		landcover: ['class'],
		landuse: ['class', 'type'],
		landuse_overlay: [],
		motorway_junction: [],
		natural_label: [],
		place_label: [],
		poi_label: [],
		road: [],
		structure: [],
		transit_stop_label: [],
		// carries no fields at all, so nothing here can speak for it; the ids around it decide
		water: [],
		waterway: ['type'],
	},
};

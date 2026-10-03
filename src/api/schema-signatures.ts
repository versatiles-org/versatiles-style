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
 * Six ids are used by two schemas with different data behind them: `boundaries`, `buildings` and
 * `pois` (Shortbread and Protomaps), and `landcover`, `landuse` and `water` (OpenMapTiles and
 * Protomaps). By name alone they are evidence for both. The fields listed here are structural ones —
 * `class` against `kind`, `admin_level` against `kind_detail` — rather than language fields, which
 * vary with how a tileset was built.
 */

/** The schemas `guessSchema` recognises. */
export type SchemaName = 'shortbread' | 'openmaptiles' | 'protomaps';

/** In the order `guessSchema` reports candidates. */
export const SCHEMA_NAMES: readonly SchemaName[] = ['shortbread', 'openmaptiles', 'protomaps'];

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
		aeroway: [],
		boundary: [],
		building: [],
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
		waterway: [],
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
};

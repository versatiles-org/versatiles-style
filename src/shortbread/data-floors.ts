import type { DataFloors } from '../dsl/index.js';

/**
 * The zoom each Shortbread source-layer begins at, which is all a style needs to know about the schema at
 * run time: it gates layers on it (`applyDataFloor`), and its keys are how `guessStyle` recognises the tiles.
 *
 * A copy of what `schema.ts` says, because `schema.ts` also lists every field, and everything `osm()` reaches
 * lands in the CDN bundle. Those fields are only for the tests and `src/migrate/`. `schema.test.ts` checks this
 * table against the record, so it cannot drift unnoticed.
 */
export const SHORTBREAD_DATA_FLOORS: DataFloors = {
	addresses: { minzoom: 14 },
	aerialways: { minzoom: 12 },
	boundaries: { minzoom: 0 },
	boundary_labels: { minzoom: 2 },
	bridges: { minzoom: 12 },
	buildings: { minzoom: 14 },
	dam_lines: { minzoom: 12 },
	dam_polygons: { minzoom: 12 },
	ferries: { minzoom: 10 },
	land: { minzoom: 0 },
	ocean: { minzoom: 0 },
	pier_lines: { minzoom: 12 },
	pier_polygons: { minzoom: 12 },
	place_labels: { minzoom: 4 },
	pois: { minzoom: 14 },
	public_transport: { minzoom: 11 },
	sites: { minzoom: 14 },
	street_labels: { minzoom: 10 },
	street_labels_points: { minzoom: 12 },
	street_polygons: { minzoom: 11 },
	streets: { minzoom: 5 },
	streets_polygons_labels: { minzoom: 14 },
	water_lines: { minzoom: 9 },
	water_lines_labels: { minzoom: 12 },
	water_polygons: { minzoom: 0 },
	water_polygons_labels: { minzoom: 4 },
};

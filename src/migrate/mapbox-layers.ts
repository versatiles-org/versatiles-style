/**
 * The source-layers of Mapbox's tiles and the fields each carries: Mapbox Streets v8, with Terrain v2
 * (`landcover`, `hillshade`, `contour`) and Bathymetry v2 (`depth`), which a Mapbox style loads beside
 * it through one composite source.
 *
 * Kept by hand, where the other three schemas are vendored from a record their projects publish:
 * Mapbox describes its tiles on a documentation page, not as data. Read off that page on 2026-10-06
 * (https://docs.mapbox.com/data/tilesets/reference/mapbox-streets-v8/ and …/mapbox-terrain-v2/), with
 * the fields Mapbox Streets v12 reads that the page does not list — `sizerank` on `landuse`, the
 * `*_beta` shield fields on `road`. Language fields (`name_en`, …) are left as the two a style reads.
 *
 * Not a schema the package builds a style for (issue #137). It is what the tests hold the Mapbox
 * signature in `api/schema-signatures.ts` and the Mapbox probe features to, as the vendored records
 * are for the other schemas.
 */
export const MAPBOX_LAYERS: Readonly<Record<string, { readonly fields: readonly string[] }>> = {
	admin: { fields: ['admin_level', 'disputed', 'iso_3166_1', 'maritime', 'worldview'] },
	aeroway: { fields: ['ref', 'type'] },
	airport_label: { fields: ['class', 'maki', 'name', 'name_en', 'ref', 'sizerank', 'worldview'] },
	building: { fields: ['building_id', 'extrude', 'height', 'min_height', 'type', 'underground'] },
	contour: { fields: ['ele', 'index'] },
	depth: { fields: ['min_depth'] },
	hillshade: { fields: ['class', 'level'] },
	housenum_label: { fields: ['house_num'] },
	landcover: { fields: ['class'] },
	landuse: { fields: ['class', 'name', 'name_en', 'sizerank', 'type', 'worldview'] },
	landuse_overlay: { fields: ['class', 'name', 'name_en', 'type', 'worldview'] },
	motorway_junction: { fields: ['class', 'filterrank', 'maki_beta', 'name', 'name_en', 'ref', 'reflen', 'type'] },
	natural_label: {
		fields: [
			'class',
			'elevation_ft',
			'elevation_m',
			'filterrank',
			'maki',
			'maki_beta',
			'name',
			'name_en',
			'sizerank',
			'worldview',
		],
	},
	place_label: {
		fields: [
			'abbr',
			'capital',
			'class',
			'filterrank',
			'iso_3166_1',
			'iso_3166_2',
			'name',
			'name_en',
			'symbolrank',
			'text_anchor',
			'type',
			'worldview',
		],
	},
	poi_label: {
		fields: [
			'brand',
			'category_en',
			'class',
			'filterrank',
			'maki',
			'maki_beta',
			'maki_modifier',
			'name',
			'name_en',
			'sizerank',
			'type',
		],
	},
	road: {
		fields: [
			'access',
			'bike_lane',
			'class',
			'dual_carriageway',
			'iso_3166_1',
			'iso_3166_2',
			'lane_count',
			'layer',
			'len',
			'name',
			'name_en',
			'oneway',
			'ref',
			'reflen',
			'shield',
			'shield_beta',
			'shield_text_color',
			'shield_text_color_beta',
			'structure',
			'toll',
			'type',
		],
	},
	structure: { fields: ['class', 'type'] },
	transit_stop_label: {
		fields: ['filterrank', 'maki', 'mode', 'name', 'name_en', 'network', 'network_beta', 'stop_type'],
	},
	water: { fields: [] },
	waterway: { fields: ['class', 'name', 'name_en', 'type'] },
};

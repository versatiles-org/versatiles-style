import { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import { VectorLayer } from "../types/vector_layer.js";

export function getTilesetsTemplate(): StyleSpecification {
	return {
		version: 8,
		name: 'versatiles',
		metadata: {
			license: 'https://creativecommons.org/publicdomain/zero/1.0/',
		},
		glyphs: 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf',
		sprite: [{ id: 'basics', url: 'https://tiles.versatiles.org/assets/sprites/basics/sprites' }],
		sources: {

			'versatiles-shortbread': {
				attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				tiles: [
					'https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}',
				],
				type: 'vector',
				scheme: 'xyz',
				bounds: [
					-180,
					-85.0511287798066,
					180,
					85.0511287798066,
				],
				minzoom: 0,
				maxzoom: 14,
				vector_layers: [
					{
						id: 'place_labels',
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							population: 'Number',
						},
						minzoom: 3,
						maxzoom: 14,
					},
					{
						id: 'boundaries',
						fields: {
							admin_level: 'Number',
							coastline: 'Boolean',
							disputed: 'Boolean',
							maritime: 'Boolean',
						},
						minzoom: 0,
						maxzoom: 14,
					},
					{
						id: 'boundary_labels',
						fields: {
							admin_level: 'Number',
							land_area: 'Number',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							name_single: 'String',
							way_area: 'Number',
						},
						minzoom: 2,
						maxzoom: 14,
					},
					{
						id: 'addresses',
						fields: {
							housename: 'String',
							housenumber: 'String',
						},
						minzoom: 14,
						maxzoom: 14,
					},
					{
						id: 'water_lines',
						fields: {
							bridge: 'Boolean',
							kind: 'String',
							tunnel: 'Boolean',
						},
						minzoom: 4,
						maxzoom: 14,
					},
					{
						id: 'water_lines_labels',
						fields: {
							bridge: 'Boolean',
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							tunnel: 'Boolean',
						},
						minzoom: 4,
						maxzoom: 14,
					},
					{
						id: 'dam_lines',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom: 14,
					},
					{
						id: 'dam_polygons',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom: 14,
					},
					{
						id: 'pier_lines',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom: 14,
					},
					{
						id: 'pier_polygons',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom: 14,
					},
					{
						id: 'bridges',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom: 14,
					},
					{
						id: 'street_polygons',
						fields: {
							bridge: 'Boolean',
							kind: 'String',
							rail: 'Boolean',
							service: 'String',
							surface: 'String',
							tunnel: 'Boolean',
						},
						minzoom: 11,
						maxzoom: 14,
					},
					{
						id: 'streets_polygons_labels',
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
						},
						minzoom: 14,
						maxzoom: 14,
					},
					{
						id: 'ferries',
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
						},
						minzoom: 8,
						maxzoom: 14,
					},
					{
						id: 'streets',
						fields: {
							bicycle: 'String',
							bridge: 'Boolean',
							horse: 'String',
							kind: 'String',
							link: 'Boolean',
							oneway: 'Boolean',
							oneway_reverse: 'Boolean',
							rail: 'Boolean',
							service: 'String',
							surface: 'String',
							tracktype: 'String',
							tunnel: 'Boolean',
						},
						minzoom: 5,
						maxzoom: 14,
					},
					{
						id: 'street_labels',
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							ref: 'String',
							ref_cols: 'Number',
							ref_rows: 'Number',
							tunnel: 'Boolean',
						},
						minzoom: 10,
						maxzoom: 14,
					},
					{
						id: 'street_labels_points',
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							ref: 'String',
						},
						minzoom: 12,
						maxzoom: 14,
					},
					{
						id: 'aerialways',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom: 14,
					},
					{
						id: 'public_transport',
						fields: {
							iata: 'String',
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							station: 'String',
						},
						minzoom: 11,
						maxzoom: 14,
					},
					{
						id: 'buildings',
						fields: {
							amenity: 'String',
							dummy: 'Number',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
						},
						minzoom: 14,
						maxzoom: 14,
					},
					{
						id: 'water_polygons',
						fields: {
							kind: 'String',
							way_area: 'Number',
						},
						minzoom: 4,
						maxzoom: 14,
					},
					{
						id: 'ocean',
						fields: {
							x: 'Number',
							y: 'Number',
						},
						minzoom: 0,
						maxzoom: 14,
					},
					{
						id: 'water_polygons_labels',
						fields: {
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							way_area: 'Number',
						},
						minzoom: 14,
						maxzoom: 14,
					},
					{
						id: 'land',
						fields: {
							kind: 'String',
						},
						minzoom: 7,
						maxzoom: 14,
					},
					{
						id: 'sites',
						fields: {
							amenity: 'String',
							kind: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
						},
						minzoom: 14,
						maxzoom: 14,
					},
					{
						id: 'pois',
						fields: {
							amenity: 'String',
							atm: 'Boolean',
							cuisine: 'String',
							denomination: 'String',
							emergency: 'String',
							highway: 'String',
							historic: 'String',
							information: 'String',
							leisure: 'String',
							man_made: 'String',
							name: 'String',
							name_de: 'String',
							name_en: 'String',
							'recycling:clothes': 'Boolean',
							'recycling:glass_bottles': 'Boolean',
							'recycling:paper': 'Boolean',
							'recycling:scrap_metal': 'Boolean',
							religion: 'String',
							shop: 'String',
							sport: 'String',
							tourism: 'String',
							'tower:type': 'String',
							vending: 'String',
						},
						minzoom: 14,
						maxzoom: 14,
					},
				],
			},

			"versatiles-hillshade": {
				tilejson: "3.0.0",
				name: "VersaTiles Hillshade Vectors",
				description: "VersaTiles Hillshade Vectors based on Mapzen Jörð Terrain Tiles",
				attribution: "<a href=\"https://github.com/tilezen/joerd/blob/master/docs/attribution.md\">Mapzen Terrain Tiles, DEM Sources</a>",
				version: "1.0.0",
				tiles: [
					"https://tiles.versatiles.org/tiles/hillshade-vectors/{z}/{x}/{y}"
				],
				type: "vector",
				scheme: "xyz",
				format: "pbf",
				bounds: [ -180, -85.0511287798066, 180, 85.0511287798066 ],
				minzoom: 0,
				maxzoom: 12,
				vector_layers: [
					{
						id: "hillshade-vectors",
						fields: { shade: "String" },
						minzoom: 0,
						maxzoom: 12,
					},
				],
			},

			"versatiles-landcover": {
				tilejson: "3.0.0",
				name: "VersaTiles Landcover Vectors",
				description: "VersaTiles Hillshade Vectors based on ESA Worldcover 2021",
				attribution: "<a href=\"https://esa-worldcover.org/en/data-access\">© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021)</a>",
				version: "1.0.0",
				tiles: [
					"https://tiles.versatiles.org/tiles/landcover-vectors/{z}/{x}/{y}"
				],
				type: "vector",
				scheme: "xyz",
				format: "pbf",
				bounds: [ -180, -85.0511287798066, 180, 85.0511287798066 ],
				minzoom: 0,
				maxzoom: 8,
				vector_layers: [
					{
						id: "landcover-vectors",
						fields: { kind: "String" },
						minzoom: 0,
						maxzoom: 12
					},
				],

			},

			"versatiles-bathymetry": {
				tilejson: "3.0.0",
				name: "OpenDEM GEBCO Bathymetry",
				description: "Bathymetry Vectors based on GEBCO 2021 derived contour polys provided by OpenDEM",
				attribution: "Derived product from the <a href=\"https://www.gebco.net/data_and_products/historical_data_sets/#gebco_2019\">GEBCO 2019 Grid</a>, made with <a href=\"https://www.naturalearthdata.com/\">NaturalEarth</a> by <a href=\"https://opendem.info\">OpenDEM</a>",
				version: "1.0.0",
				tiles: [
					"https://tiles.versatiles.org/tiles/batymetry-vectors/{z}/{x}/{y}"
				],
				type: "vector",
				scheme: "xyz",
				format: "pbf",
				bounds: [ -180, -85.0511287798066, 180, 85.0511287798066 ],
				minzoom: 0,
				maxzoom: 10,
				vector_layers: [
					{
						id: "bathymetry",
						fields: { mindepth: "Number" },
						minzoom: 0,
						maxzoom: 10
					},
				],
			},

			// TODO add raster layers here

		},
		layers: [],
	};
};

// this is only used in guess_style/guess_style.test.ts
export function getTilesetsVectorLayers(String: source = "versatiles-shortbread"): VectorLayer[] {
	return getTilesetsTemplate().sources[source].vector_layers;
};
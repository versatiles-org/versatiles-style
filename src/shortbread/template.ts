 

import type { MaplibreStyleVector } from '../types/index.js';

const maxzoom = 14;

export function getShortbreadTemplate(): MaplibreStyleVector {
	return {
		version: 8,
		name: 'versatiles',
		metadata: {
			'maputnik:renderer': 'mbgljs',
			license: 'https://creativecommons.org/publicdomain/zero/1.0/',
		},
		glyphs: 'https://tiles.versatiles.org/fonts/{fontstack}/{range}.pbf',
		sprite: 'https://tiles.versatiles.org/sprites/sprites',
		sources: {
			'versatiles-shortbread': {
				tilejson: '3.0.0',
				attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
				tiles: [
					'https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}',
				],
				type: 'vector',
				scheme: 'xyz',
				format: 'pbf',
				bounds: [
					-180,
					-85.0511287798066,
					180,
					85.0511287798066,
				],
				minzoom: 0,
				maxzoom,
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
						maxzoom,
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
						maxzoom,
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
						maxzoom,
					},
					{
						id: 'addresses',
						fields: {
							housename: 'String',
							housenumber: 'String',
						},
						minzoom: 14,
						maxzoom,
					},
					{
						id: 'water_lines',
						fields: {
							bridge: 'Boolean',
							kind: 'String',
							tunnel: 'Boolean',
						},
						minzoom: 4,
						maxzoom,
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
						maxzoom,
					},
					{
						id: 'dam_lines',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom,
					},
					{
						id: 'dam_polygons',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom,
					},
					{
						id: 'pier_lines',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom,
					},
					{
						id: 'pier_polygons',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom,
					},
					{
						id: 'bridges',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom,
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
						maxzoom,
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
						maxzoom,
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
						maxzoom,
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
						maxzoom,
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
						maxzoom,
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
						maxzoom,
					},
					{
						id: 'aerialways',
						fields: {
							kind: 'String',
						},
						minzoom: 12,
						maxzoom,
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
						maxzoom,
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
						maxzoom,
					},
					{
						id: 'water_polygons',
						fields: {
							kind: 'String',
							way_area: 'Number',
						},
						minzoom: 4,
						maxzoom,
					},
					{
						id: 'ocean',
						fields: {
							x: 'Number',
							y: 'Number',
						},
						minzoom: 0,
						maxzoom,
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
						maxzoom,
					},
					{
						id: 'land',
						fields: {
							kind: 'String',
						},
						minzoom: 7,
						maxzoom,
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
						maxzoom,
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
						maxzoom,
					},
				],
			},
		},
		layers: [],
	};
}
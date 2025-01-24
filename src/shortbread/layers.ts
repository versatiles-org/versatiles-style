 

import type { LegacyFilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { Language } from '../style_builder/index';
import type { MaplibreLayerDefinition } from '../types/index';

export function getShortbreadLayers(option: { readonly language: Language }): MaplibreLayerDefinition[] {
	const { language } = option;
	const nameField = language ? '{name_' + language + '}' : '{name}';
	
	return [

		// background
		{ id: 'background', type: 'background' },

		// ocean
		{ id: 'water-ocean', type: 'fill', 'source-layer': 'ocean' },

		// land
		{
			id: 'land-glacier',
			type: 'fill', 'source-layer': 'water_polygons',
			filter: ['all', ['==', 'kind', 'glacier']],
		},

		...[
			{ id: 'commercial', kinds: ['commercial', 'retail'] },
			{ id: 'industrial', kinds: ['industrial', 'quarry', 'railway'] },
			{ id: 'residential', kinds: ['garages', 'residential'] },
			{ id: 'agriculture', kinds: ['brownfield', 'farmland', 'farmyard', 'greenfield', 'greenhouse_horticulture', 'orchard', 'plant_nursery', 'vineyard'] },
			{ id: 'waste', kinds: ['landfill'] },
			{ id: 'park', kinds: ['park', 'village_green', 'recreation_ground'] },
			{ id: 'garden', kinds: ['allotments', 'garden'] },
			{ id: 'burial', kinds: ['cemetery', 'grave_yard'] },
			{ id: 'leisure', kinds: ['miniature_golf', 'playground', 'golf_course'] },
			{ id: 'rock', kinds: ['bare_rock', 'scree', 'shingle'] },
			{ id: 'forest', kinds: ['forest'] },
			{ id: 'grass', kinds: ['grass', 'grassland', 'meadow', 'wet_meadow'] },
			{ id: 'vegetation', kinds: ['heath', 'scrub'] },
			{ id: 'sand', kinds: ['beach', 'sand'] },
			{ id: 'wetland', kinds: ['bog', 'marsh', 'string_bog', 'swamp'] },
		].map(({ id, kinds }: { readonly id: string; readonly kinds: readonly string[] }): MaplibreLayerDefinition => ({
			id: 'land-' + id,
			type: 'fill',
			'source-layer': 'land',
			filter: ['all',
				['in', 'kind', ...kinds],
			],
		})),

		// water-lines
		...['river', 'canal', 'stream', 'ditch'].map((t: string): MaplibreLayerDefinition => ({
			id: 'water-' + t,
			type: 'line',
			'source-layer': 'water_lines',
			filter: ['all',
				['in', 'kind', t],
				['!=', 'tunnel', true],
				['!=', 'bridge', true],
			],
		})),

		// water polygons
		{
			id: 'water-area',
			type: 'fill', 'source-layer': 'water_polygons',
			filter: ['==', 'kind', 'water'],
		},
		{
			id: 'water-area-river',
			type: 'fill', 'source-layer': 'water_polygons',
			filter: ['==', 'kind', 'river'],
		},
		{
			id: 'water-area-small',
			type: 'fill', 'source-layer': 'water_polygons',
			filter: ['in', 'kind', 'reservoir', 'basin', 'dock'],
		},


		// dam
		{ id: 'water-dam-area', type: 'fill', 'source-layer': 'dam_polygons', filter: ['==', 'kind', 'dam'] },
		{ id: 'water-dam', type: 'line', 'source-layer': 'dam_lines', filter: ['==', 'kind', 'dam'] },

		// pier
		{ id: 'water-pier-area', type: 'fill', 'source-layer': 'pier_polygons', filter: ['in', 'kind', 'pier', 'breakwater', 'groyne'] },
		{ id: 'water-pier', type: 'line', 'source-layer': 'pier_lines', filter: ['in', 'kind', 'pier', 'breakwater', 'groyne'] },

		// site
		...['danger_area', 'sports_center', 'university', 'college', 'school', 'hospital', 'prison', 'parking', 'bicycle_parking', 'construction'].map((t): MaplibreLayerDefinition => ({
			id: 'site-' + t.replace(/_/g, ''),
			type: 'fill',
			'source-layer': 'sites',
			filter: ['in', 'kind', t],
		})),

		// airport
		{
			id: 'airport-area',
			type: 'fill', 'source-layer': 'street_polygons', filter: ['in', 'kind', 'runway', 'taxiway'],
		},
		{
			id: 'airport-taxiway:outline',
			type: 'line', 'source-layer': 'streets', filter: ['==', 'kind', 'taxiway'],
		},
		{
			id: 'airport-runway:outline',
			type: 'line', 'source-layer': 'streets', filter: ['==', 'kind', 'runway'],
		},
		{
			id: 'airport-taxiway',
			type: 'line', 'source-layer': 'streets', filter: ['==', 'kind', 'taxiway'],
		},
		{
			id: 'airport-runway',
			type: 'line', 'source-layer': 'streets', filter: ['==', 'kind', 'runway'],
		},

		// building
		{
			id: 'building:outline',
			type: 'fill', 'source-layer': 'buildings',
		},
		{
			id: 'building',
			type: 'fill', 'source-layer': 'buildings',
		},

		// tunnel-, street-, bridges-bridge
		...['tunnel', 'street', 'bridge'].flatMap((c): MaplibreLayerDefinition[] => {
			let filter: LegacyFilterSpecification[];
			let prefix: string;
			let suffixes: Array<string> = [];
			const results: MaplibreLayerDefinition[] = [];
			switch (c) {
				case 'tunnel':
					filter = [['==', 'tunnel', true]];
					prefix = 'tunnel-';
					suffixes = [':outline', ''];
					break;
				case 'street':
					filter = [['!=', 'bridge', true], ['!=', 'tunnel', true]];
					prefix = '';
					suffixes = [':outline', ''];
					break;
				case 'bridge':
					filter = [['==', 'bridge', true]];
					prefix = 'bridge-';
					suffixes = [':bridge', ':outline', ''];
					break;
			}


			// in osm data streets on bridges are often not tagged as such
			// to be able to have multiple levels of bridges cross over each
			// other in the right order without using a secondary property.
			// this results in bridge-polygons being rendered above streets.
			// therefore bridge polygons are *under* surface streets here.
			// this workaround is also wrong, but everyone is using it since
			// it's simpler than removing all these tagging hacks from osm.

			// bridges, above tunnel, below street
			if (c === 'street') results.push({
				id: 'bridge',
				type: 'fill',
				'source-layer': 'bridges',
			});

			suffixes.forEach(suffix => {

				// pedestrian zone — no outline
				if (suffix === ':outline') results.push({
					id: prefix + 'street-pedestrian-zone',
					type: 'fill',
					'source-layer': 'street_polygons',
					filter: ['all',
						...filter,
						['==', 'kind', 'pedestrian'],
					],
				});

				// non-car streets
				['footway', 'steps', 'path', 'cycleway'].forEach(t => {
					results.push({
						id: prefix + 'way-' + t.replace(/_/g, '') + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all',
							...filter,
							['in', 'kind', t],
						],
					});
				});

				// no links
				const noDrivewayExpression: LegacyFilterSpecification = ['!=', 'service', 'driveway'];
				['track', 'pedestrian', 'service', 'living_street', 'residential', 'unclassified'].forEach(t => {
					results.push({
						id: prefix + 'street-' + t.replace(/_/g, '') + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all',
							['==', 'kind', t],
							...filter,
							...(t === 'service') ? [noDrivewayExpression] : [], // ignore driveways
						],
					});
				});

				// no links, bicycle=designated
				if (suffix === '') ['track', 'pedestrian', 'service', 'living_street', 'residential', 'unclassified'].forEach(t => {
					results.push({
						id: prefix + 'street-' + t.replace(/_/g, '') + '-bicycle',
						type: 'line',
						'source-layer': 'streets',
						filter: ['all',
							['==', 'kind', t],
							['==', 'bicycle', 'designated'],
							...filter,
							...(t === 'service') ? [noDrivewayExpression] : [], // ignore driveways
						],
					});
				});

				// links
				['tertiary', 'secondary', 'primary', 'trunk', 'motorway'].forEach(t => {
					results.push({
						id: prefix + 'street-' + t.replace(/_/g, '') + '-link' + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all',
							...filter,
							['in', 'kind', t],
							['==', 'link', true],
						],
					});
				});

				// main
				['tertiary', 'secondary', 'primary', 'trunk', 'motorway'].forEach(t => {
					results.push({
						id: prefix + 'street-' + t.replace(/_/g, '') + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all',
							...filter,
							['in', 'kind', t],
							['!=', 'link', true],
						],
					});
				});

			});

			// separate outline for trains
			[':outline', ''].forEach(suffix => {
				// transport
				['rail', 'light_rail', 'subway', 'narrow_gauge', 'tram', 'funicular', 'monorail', 'bus_guideway', 'busway'].reverse().forEach((t) => {
					results.push({
						id: prefix + 'transport-' + t.replace(/_/g, '') + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all',
							['in', 'kind', t],
							['!has', 'service'],
							...filter,
						],
					});
				});

				if (c === 'street') {
					// aerialway, no bridges, above street evel
					['cable_car', 'gondola', 'goods', 'chair_lift', 'drag_lift', 't-bar', 'j-bar', 'platter', 'rope-tow'].reverse().forEach((t) => {
						results.push({
							id: 'aerialway-' + t.replace(/[_-]+/g, '') + suffix,
							type: 'line',
							'source-layer': 'aerialways',
							filter: ['all',
								...filter,
								['in', 'kind', t],
							],
						});
					});

					// ferry — only on street level
					results.push({
						id: 'transport-ferry' + suffix,
						type: 'line',
						'source-layer': 'ferries',
					});
				}
			});

			return results;
		}),

		// poi, one layer per type
		...['amenity', 'leisure', 'tourism', 'shop', 'man_made', 'historic', 'emergency', 'highway', 'office'].map((key): MaplibreLayerDefinition => ({
			id: 'poi-' + key,

			type: 'symbol',
			'source-layer': 'pois',
			filter: ['to-boolean', ['get', key]],
		})),

		// boundary
		...[':outline', ''].flatMap((suffix): MaplibreLayerDefinition[] => [
			{
				id: 'boundary-country' + suffix,
				type: 'line',
				'source-layer': 'boundaries',
				filter: ['all',
					['==', 'admin_level', 2],
					['!=', 'maritime', true],
					['!=', 'disputed', true],
					['!=', 'coastline', true],
				],
			},
			{
				id: 'boundary-country-disputed' + suffix,
				type: 'line',
				'source-layer': 'boundaries',
				filter: ['all',
					['==', 'admin_level', 2],
					['==', 'disputed', true],
					['!=', 'maritime', true],
					['!=', 'coastline', true],
				],
			},
			{
				id: 'boundary-country-maritime' + suffix,
				type: 'line',
				'source-layer': 'boundaries',
				filter: ['all',
					['==', 'admin_level', 2],
					['==', 'maritime', true],
					['!=', 'disputed', true],
					['!=', 'coastline', true],
				],
			},
			{
				id: 'boundary-state' + suffix,
				type: 'line',
				'source-layer': 'boundaries',
				filter: ['all',
					['==', 'admin_level', 4],
					['!=', 'maritime', true],
					['!=', 'disputed', true],
					['!=', 'coastline', true],
				],
			},
		]),

		// label-address
		{
			id: 'label-address-housenumber',
			type: 'symbol',
			'source-layer': 'addresses',
			filter: ['has', 'housenumber'],
			layout: { 'text-field': '{housenumber}' },
		},

		// label-motorway
		{
			id: 'label-motorway-exit',
			type: 'symbol',
			'source-layer': 'street_labels_points', // docs say `streets_labels_points`, but layer is actually called `street_labels_points`
			filter: ['==', 'kind', 'motorway_junction'],
			layout: { 'text-field': '{ref}' },
			// FIXME shield
		},
		{
			id: 'label-motorway-shield',
			type: 'symbol',
			'source-layer': 'street_labels',
			filter: ['==', 'kind', 'motorway'],
			layout: { 'text-field': '{ref}' },
			// FIXME shield
		},

		// label-street
		...['pedestrian', 'living_street', 'residential', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk'].map((t: string): MaplibreLayerDefinition => ({
			id: 'label-street-' + t.replace(/_/g, ''),
			type: 'symbol',
			'source-layer': 'street_labels',
			filter: ['==', 'kind', t],
			layout: { 'text-field': nameField },
		})),

		// label-place of small places
		...[ /*'locality', 'island', 'farm', 'dwelling',*/ 'neighbourhood', 'quarter', 'suburb', 'hamlet', 'village', 'town'].map((id: string): MaplibreLayerDefinition => ({
			id: 'label-place-' + id.replace(/_/g, ''),
			type: 'symbol',
			'source-layer': 'place_labels',
			filter: ['==', 'kind', id],
			layout: { 'text-field': nameField },
		})),

		// label-boundary
		{
			id: 'label-boundary-state',
			type: 'symbol',
			'source-layer': 'boundary_labels',
			filter: ['in', 'admin_level', 4, '4'],
			layout: { 'text-field': nameField },
		},

		// label-place-* of large places
		...['city', 'state_capital', 'capital'].map((id: string): MaplibreLayerDefinition => ({
			id: 'label-place-' + id.replace(/_/g, ''),
			type: 'symbol',
			'source-layer': 'place_labels',
			filter: ['==', 'kind', id],
			layout: { 'text-field': nameField },
		})),

		{
			id: 'label-boundary-country-small',
			type: 'symbol',
			'source-layer': 'boundary_labels',
			filter: ['all',
				['in', 'admin_level', 2, '2'],
				['<=', 'way_area', 10000000],
			],
			layout: { 'text-field': nameField },
		},
		{
			id: 'label-boundary-country-medium',
			type: 'symbol',
			'source-layer': 'boundary_labels',
			filter: ['all',
				['in', 'admin_level', 2, '2'],
				['<', 'way_area', 90000000],
				['>', 'way_area', 10000000],
			],
			layout: { 'text-field': nameField },
		},
		{
			id: 'label-boundary-country-large',
			type: 'symbol',
			'source-layer': 'boundary_labels',
			filter: ['all',
				['in', 'admin_level', 2, '2'],
				['>=', 'way_area', 90000000],
			],
			layout: { 'text-field': nameField },
		},

		// marking
		{
			id: 'marking-oneway', // streets → oneway
			type: 'symbol',
			'source-layer': 'streets',
			filter: ['all',
				['==', 'oneway', true],
				['in', 'kind', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street'],
			],
			layout: {
				'symbol-placement': 'line',
				'symbol-spacing': 175,
				'icon-rotate': 90,
				'icon-rotation-alignment': 'map',
				'icon-padding': 5,
				'symbol-avoid-edges': true,
			},
		},
		{
			id: 'marking-oneway-reverse', // oneway_reverse
			type: 'symbol',
			'source-layer': 'streets',
			filter: ['all',
				['==', 'oneway_reverse', true],
				['in', 'kind', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street'],
			],
			layout: {
				'symbol-placement': 'line',
				'symbol-spacing': 75,
				'icon-rotate': -90,
				'icon-rotation-alignment': 'map',
				'icon-padding': 5,
				'symbol-avoid-edges': true,
			},
		},
		{
			id: 'marking-bicycle', // bicycle=designated or kind=cycleway
			type: 'symbol',
			'source-layer': 'streets',
			filter: ['all',
				['==', 'bicycle', 'designated'],
				['==', 'kind', 'cycleway'],
			],
			layout: {
				'symbol-placement': 'line',
				'symbol-spacing': 50,
			},
		},

		// symbol
		{
			id: 'symbol-transit-bus',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['==', 'kind', 'bus_stop'],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-tram',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['==', 'kind', 'tram_stop'],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-subway',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['all',
				['in', 'kind', 'station', 'halt'],
				['==', 'station', 'subway'],
			],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-lightrail',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['all',
				['in', 'kind', 'station', 'halt'],
				['==', 'station', 'light_rail'],
			],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-station',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['all',
				['in', 'kind', 'station', 'halt'],
				['!in', 'station', 'light_rail', 'subway'],
			],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-airfield',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['all',
				['==', 'kind', 'aerodrome'],
				['!has', 'iata'],
			],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-airport',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['all',
				['==', 'kind', 'aerodrome'],
				['has', 'iata'],
			],
			layout: { 'text-field': nameField },
		},
	];
}
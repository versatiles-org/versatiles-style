import type {
	DataDrivenPropertyValueSpecification,
	FilterSpecification,
	FormattedSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import type { MaplibreLayerDefinition } from '../types/index.js';
import { Language } from '../style_builder/types.js';

export function getShortbreadLayers(option: {
	readonly language: Language;
	readonly languageStrict?: boolean;
}): MaplibreLayerDefinition[] {
	const { language, languageStrict = false } = option;
	let nameField: DataDrivenPropertyValueSpecification<FormattedSpecification>;
	if (!language) {
		nameField = ['get', 'name'];
	} else if (languageStrict) {
		nameField = ['get', 'name_' + language];
	} else {
		nameField = ['coalesce', ['get', 'name_' + language], ['get', 'name']];
	}

	return [
		// background
		{ id: 'background', type: 'background' },

		// ocean
		{ id: 'water-ocean', type: 'fill', 'source-layer': 'ocean' },

		// land
		{
			id: 'land-glacier',
			type: 'fill',
			'source-layer': 'water_polygons',
			filter: ['==', ['get', 'kind'], 'glacier'],
		},

		...[
			{ id: 'commercial', kinds: ['commercial', 'retail'] },
			{ id: 'industrial', kinds: ['industrial', 'quarry', 'railway'] },
			{ id: 'residential', kinds: ['garages', 'residential'] },
			{
				id: 'agriculture',
				kinds: [
					'brownfield',
					'farmland',
					'farmyard',
					'greenfield',
					'greenhouse_horticulture',
					'orchard',
					'plant_nursery',
					'vineyard',
				],
			},
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
		].map(
			({ id, kinds }: { readonly id: string; readonly kinds: readonly string[] }): MaplibreLayerDefinition => ({
				id: 'land-' + id,
				type: 'fill',
				'source-layer': 'land',
				filter: ['in', ['get', 'kind'], ['literal', [...kinds]]],
			})
		),

		// water-lines
		...['river', 'canal', 'stream', 'ditch'].map(
			(t: string): MaplibreLayerDefinition => ({
				id: 'water-' + t,
				type: 'line',
				'source-layer': 'water_lines',
				filter: ['all', ['==', ['get', 'kind'], t], ['!=', ['get', 'tunnel'], true], ['!=', ['get', 'bridge'], true]],
			})
		),

		// water polygons
		{
			id: 'water-area',
			type: 'fill',
			'source-layer': 'water_polygons',
			filter: ['==', ['get', 'kind'], 'water'],
		},
		{
			id: 'water-area-river',
			type: 'fill',
			'source-layer': 'water_polygons',
			filter: ['==', ['get', 'kind'], 'river'],
		},
		{
			id: 'water-area-small',
			type: 'fill',
			'source-layer': 'water_polygons',
			filter: ['in', ['get', 'kind'], ['literal', ['reservoir', 'basin', 'dock']]],
		},

		// dam
		{ id: 'water-dam-area', type: 'fill', 'source-layer': 'dam_polygons', filter: ['==', ['get', 'kind'], 'dam'] },
		{ id: 'water-dam', type: 'line', 'source-layer': 'dam_lines', filter: ['==', ['get', 'kind'], 'dam'] },

		// pier
		{
			id: 'water-pier-area',
			type: 'fill',
			'source-layer': 'pier_polygons',
			filter: ['in', ['get', 'kind'], ['literal', ['pier', 'breakwater', 'groyne']]],
		},
		{
			id: 'water-pier',
			type: 'line',
			'source-layer': 'pier_lines',
			filter: ['in', ['get', 'kind'], ['literal', ['pier', 'breakwater', 'groyne']]],
		},

		// site
		...[
			'danger_area',
			'sports_center',
			'university',
			'college',
			'school',
			'hospital',
			'prison',
			'parking',
			'bicycle_parking',
			'construction',
		].map(
			(t): MaplibreLayerDefinition => ({
				id: 'site-' + t.replace(/_/g, ''),
				type: 'fill',
				'source-layer': 'sites',
				filter: ['==', ['get', 'kind'], t],
			})
		),

		// airport
		{
			id: 'airport-area',
			type: 'fill',
			'source-layer': 'street_polygons',
			filter: ['in', ['get', 'kind'], ['literal', ['runway', 'taxiway']]],
		},
		{
			id: 'airport-taxiway:outline',
			type: 'line',
			'source-layer': 'streets',
			filter: ['==', ['get', 'kind'], 'taxiway'],
		},
		{
			id: 'airport-runway:outline',
			type: 'line',
			'source-layer': 'streets',
			filter: ['==', ['get', 'kind'], 'runway'],
		},
		{
			id: 'airport-taxiway',
			type: 'line',
			'source-layer': 'streets',
			filter: ['==', ['get', 'kind'], 'taxiway'],
		},
		{
			id: 'airport-runway',
			type: 'line',
			'source-layer': 'streets',
			filter: ['==', ['get', 'kind'], 'runway'],
		},

		// building
		{
			id: 'building:outline',
			type: 'fill',
			'source-layer': 'buildings',
		},
		{
			id: 'building',
			type: 'fill',
			'source-layer': 'buildings',
		},
		// tunnel-, street-, bridges-bridge
		...['tunnel', 'street', 'bridge'].flatMap((c): MaplibreLayerDefinition[] => {
			let filter: FilterSpecification[];
			let prefix: string;
			let suffixes: Array<string> = [];
			const results: MaplibreLayerDefinition[] = [];
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

			// in osm data streets on bridges are often not tagged as such
			// to be able to have multiple levels of bridges cross over each
			// other in the right order without using a secondary property.
			// this results in bridge-polygons being rendered above streets.
			// therefore bridge polygons are *under* surface streets here.
			// this workaround is also wrong, but everyone is using it since
			// it's simpler than removing all these tagging hacks from osm.

			// bridges, above tunnel, below street
			if (c === 'street')
				results.push({
					id: 'bridge',
					type: 'fill',
					'source-layer': 'bridges',
				});

			suffixes.forEach((suffix) => {
				// pedestrian zone — no outline
				if (suffix === ':outline')
					results.push({
						id: prefix + 'street-pedestrian-zone',
						type: 'fill',
						'source-layer': 'street_polygons',
						filter: ['all', ...filter, ['==', ['get', 'kind'], 'pedestrian']] as FilterSpecification,
					});

				// non-car streets
				['footway', 'steps', 'path', 'cycleway'].forEach((t) => {
					results.push({
						id: prefix + 'way-' + t.replace(/_/g, '') + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all', ...filter, ['==', ['get', 'kind'], t]] as FilterSpecification,
					});
				});

				// no links
				[
					'track',
					'pedestrian',
					'service',
					'living_street',
					'residential',
					'unclassified',
					'busway',
					'bus_guideway',
				].forEach((t) => {
					results.push({
						id: prefix + 'street-' + t.replace(/_/g, '') + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all', ['==', ['get', 'kind'], t], ...filter] as FilterSpecification,
					});
				});

				// no links, bicycle=designated
				if (suffix === '')
					['track', 'pedestrian', 'service', 'living_street', 'residential', 'unclassified'].forEach((t) => {
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
					});

				// links
				['tertiary', 'secondary', 'primary', 'trunk', 'motorway'].forEach((t) => {
					results.push({
						id: prefix + 'street-' + t.replace(/_/g, '') + '-link' + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: [
							'all',
							...filter,
							['==', ['get', 'kind'], t],
							['==', ['get', 'link'], true],
						] as FilterSpecification,
					});
				});

				// main
				['tertiary', 'secondary', 'primary', 'trunk', 'motorway'].forEach((t) => {
					results.push({
						id: prefix + 'street-' + t.replace(/_/g, '') + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: [
							'all',
							...filter,
							['==', ['get', 'kind'], t],
							['!=', ['get', 'link'], true],
						] as FilterSpecification,
					});
				});
			});

			// separate outline for trains
			[':outline', ''].forEach((suffix) => {
				// with service distinction
				['rail', 'light_rail', 'subway', 'narrow_gauge', 'tram'].reverse().forEach((t) => {
					// main rail
					results.push({
						id: prefix + 'transport-' + t.replace(/_/g, '') + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all', ['==', ['get', 'kind'], t], ['!', ['has', 'service']], ...filter] as FilterSpecification,
					});

					// service rail (crossover, siding, spur, yard)
					results.push({
						id: prefix + 'transport-' + t.replace(/_/g, '') + '-service' + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all', ['==', ['get', 'kind'], t], ['has', 'service'], ...filter] as FilterSpecification,
					});
				});

				// other transport
				['funicular', 'monorail'].reverse().forEach((t) => {
					results.push({
						id: prefix + 'transport-' + t.replace(/_/g, '') + suffix,
						type: 'line',
						'source-layer': 'streets',
						filter: ['all', ['==', ['get', 'kind'], t], ...filter] as FilterSpecification,
					});
				});

				if (c === 'street') {
					// aerialway, no bridges, above street evel
					['cable_car', 'gondola', 'goods', 'chair_lift', 'drag_lift', 't-bar', 'j-bar', 'platter', 'rope-tow']
						.reverse()
						.forEach((t) => {
							results.push({
								id: 'aerialway-' + t.replace(/[_-]+/g, '') + suffix,
								type: 'line',
								'source-layer': 'aerialways',
								filter: ['all', ...filter, ['==', ['get', 'kind'], t]] as FilterSpecification,
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

		// 3D building (fill-extrusion, used with experimental.buildingHeights)
		// Placed after streets/bridges so extrusions render on top of roads.
		// hide_3d filter suppresses footprints covered by building:parts
		{
			id: 'building-3d',
			type: 'fill-extrusion',
			'source-layer': 'buildings',
			filter: ['!=', ['get', 'hide_3d'], true],
		},

		// poi, one layer per type
		...['amenity', 'leisure', 'tourism', 'shop', 'man_made', 'historic', 'emergency', 'highway', 'office'].map(
			(key): MaplibreLayerDefinition => ({
				id: 'poi-' + key,

				type: 'symbol',
				'source-layer': 'pois',
				filter: ['to-boolean', ['get', key]],
			})
		),

		// boundary
		...[':outline', ''].flatMap((suffix): MaplibreLayerDefinition[] => [
			{
				id: 'boundary-country' + suffix,
				type: 'line',
				'source-layer': 'boundaries',
				filter: [
					'all',
					['==', ['get', 'admin_level'], 2],
					['!=', ['get', 'maritime'], true],
					['!=', ['get', 'disputed'], true],
					['!=', ['get', 'coastline'], true],
				],
			},
			{
				id: 'boundary-country-disputed' + suffix,
				type: 'line',
				'source-layer': 'boundaries',
				filter: [
					'all',
					['==', ['get', 'admin_level'], 2],
					['==', ['get', 'disputed'], true],
					['!=', ['get', 'maritime'], true],
					['!=', ['get', 'coastline'], true],
				],
			},
			{
				id: 'boundary-country-maritime' + suffix,
				type: 'line',
				'source-layer': 'boundaries',
				filter: [
					'all',
					['==', ['get', 'admin_level'], 2],
					['==', ['get', 'maritime'], true],
					['!=', ['get', 'disputed'], true],
					['!=', ['get', 'coastline'], true],
				],
			},
			{
				id: 'boundary-state' + suffix,
				type: 'line',
				'source-layer': 'boundaries',
				filter: [
					'all',
					['==', ['get', 'admin_level'], 4],
					['!=', ['get', 'maritime'], true],
					['!=', ['get', 'disputed'], true],
					['!=', ['get', 'coastline'], true],
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
			filter: ['==', ['get', 'kind'], 'motorway_junction'],
			layout: { 'text-field': '{ref}' },
			// FIXME shield
		},
		{
			id: 'label-motorway-shield',
			type: 'symbol',
			'source-layer': 'street_labels',
			filter: ['==', ['get', 'kind'], 'motorway'],
			layout: { 'text-field': '{ref}' },
			// FIXME shield
		},

		// label-street
		...[
			'pedestrian',
			'living_street',
			'residential',
			'unclassified',
			'tertiary',
			'secondary',
			'primary',
			'trunk',
			'track',
		].map(
			(t: string): MaplibreLayerDefinition => ({
				id: 'label-street-' + t.replace(/_/g, ''),
				type: 'symbol',
				'source-layer': 'street_labels',
				filter: ['==', ['get', 'kind'], t],
				layout: { 'text-field': nameField },
			})
		),

		// marking
		{
			id: 'marking-oneway', // streets → oneway
			type: 'symbol',
			'source-layer': 'streets',
			filter: [
				'all',
				['==', ['get', 'oneway'], true],
				[
					'in',
					['get', 'kind'],
					['literal', ['trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street']],
				],
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
			filter: [
				'all',
				['==', ['get', 'oneway_reverse'], true],
				[
					'in',
					['get', 'kind'],
					['literal', ['trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street']],
				],
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
			filter: ['all', ['==', ['get', 'bicycle'], 'designated'], ['==', ['get', 'kind'], 'cycleway']],
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
			filter: ['==', ['get', 'kind'], 'bus_stop'],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-tram',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['==', ['get', 'kind'], 'tram_stop'],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-subway',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['all', ['in', ['get', 'kind'], ['literal', ['station', 'halt']]], ['==', ['get', 'station'], 'subway']],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-lightrail',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: [
				'all',
				['in', ['get', 'kind'], ['literal', ['station', 'halt']]],
				['==', ['get', 'station'], 'light_rail'],
			],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-station',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: [
				'all',
				['in', ['get', 'kind'], ['literal', ['station', 'halt']]],
				['!', ['in', ['get', 'station'], ['literal', ['light_rail', 'subway']]]],
			],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-airfield',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['!', ['has', 'iata']]],
			layout: { 'text-field': nameField },
		},
		{
			id: 'symbol-transit-airport',
			type: 'symbol',
			'source-layer': 'public_transport',
			filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['has', 'iata']],
			layout: { 'text-field': nameField },
		},

		// label-place of small places
		...[
			/*'locality', 'island', 'farm', 'dwelling',*/ 'neighbourhood',
			'quarter',
			'suburb',
			'hamlet',
			'village',
			'town',
		].map(
			(id: string): MaplibreLayerDefinition => ({
				id: 'label-place-' + id.replace(/_/g, ''),
				type: 'symbol',
				'source-layer': 'place_labels',
				filter: ['==', ['get', 'kind'], id],
				layout: {
					'text-field': nameField,
					'symbol-sort-key': ['-', ['to-number', ['get', 'population'], 0]],
				},
			})
		),

		// label-boundary
		{
			id: 'label-boundary-state',
			type: 'symbol',
			'source-layer': 'boundary_labels',
			filter: ['in', ['get', 'admin_level'], ['literal', [4, '4']]],
			layout: { 'text-field': nameField },
		},

		// label-place-* of large places
		...['city', 'state_capital', 'capital'].map(
			(id: string): MaplibreLayerDefinition => ({
				id: 'label-place-' + id.replace(/_/g, ''),
				type: 'symbol',
				'source-layer': 'place_labels',
				filter: ['==', ['get', 'kind'], id],
				layout: {
					'text-field': nameField,
					'symbol-sort-key': ['-', ['to-number', ['get', 'population'], 0]],
				},
			})
		),

		{
			id: 'label-boundary-country-small',
			type: 'symbol',
			'source-layer': 'boundary_labels',
			filter: ['all', ['in', ['get', 'admin_level'], ['literal', [2, '2']]], ['<=', ['get', 'way_area'], 10000000]],
			layout: { 'text-field': nameField },
		},
		{
			id: 'label-boundary-country-medium',
			type: 'symbol',
			'source-layer': 'boundary_labels',
			filter: [
				'all',
				['in', ['get', 'admin_level'], ['literal', [2, '2']]],
				['<', ['get', 'way_area'], 90000000],
				['>', ['get', 'way_area'], 10000000],
			],
			layout: { 'text-field': nameField },
		},
		{
			id: 'label-boundary-country-large',
			type: 'symbol',
			'source-layer': 'boundary_labels',
			filter: ['all', ['in', ['get', 'admin_level'], ['literal', [2, '2']]], ['>=', ['get', 'way_area'], 90000000]],
			layout: { 'text-field': nameField },
		},
	];
}

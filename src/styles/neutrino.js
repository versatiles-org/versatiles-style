import Stylemaker from '../lib/stylemaker.js';

export default class Neutrino extends Stylemaker {
	constructor() {
		super('neutrino');
		this
			.addFont('regular', 'Noto Sans Regular')
			.addFont('bold', 'Noto Sans Bold')

			.addColor('land', '#f6f0f6')
			.addColor('water', '#cbd2df')
			.addColor('grass', '#e7e9e5')
			.addColor('wood', '#d9e3d9') // #dee0dc';
			.addColor('agriculture', '#f8eeee') // '#e9e1e1';
			.addColor('site', '#ebe8e6')
			.addColor('building', '#e0d1d9') // #dfdad7'; // '#e0d9d7';
			.addColor('street', '#ffffff')
			.addColor('boundary', '#e6ccd8')
			.addColor('foot', '#fef8ff') //#e9e5f4';
			.addColor('rail', '#e8d5e0')
			.addColor('label', '#cbb7b7') // '#ffffff';
	}
	getLayers() {
		let getColor = this.getColor;
		let getFont = this.getFont;
		return {
			'background': {
				color: getColor('land'),
			},
			'boundary-{country,state}': {
				color: getColor('boundary'),
			},
			'boundary-country:outline': {
				size: { 2: 2, 10: 6, },
				opacity: { 2: 0, 4: 0.3 },
				color: getColor('land', { lighten: 0.05 }),
				lineBlur: 1,
			},
			'boundary-country': {
				size: { 2: 1, 10: 4, },
				opacity: { 2: 0, 4: 1 },
			},
			'boundary-state:outline': {
				size: { 7: 3, 10: 5, },
				opacity: { 7: 0, 8: 0.3 },
				color: getColor('land', { lighten: 0.05 }),
				lineBlur: 1,
			},
			'boundary-state': {
				size: { 7: 2, 10: 3, },
				opacity: { 7: 0, 8: 1 },
				lineDasharray: [0, 1.5, 1, 1.5],
				lineCap: 'round',
				lineJoin: 'round',
			},
			'water-*': {
				color: getColor('water'),
			},
			'water-area': {
				opacity: { 4: 0, 6: 1 },
			},
			'water-area-*': {
				opacity: { 4: 0, 6: 1 },
			},
			'water-{pier,dam}-area': {
				color: getColor('land'),
				opacity: { 12: 0, 13: 1 },
			},
			'land-*': {
				color: getColor('land'),
			},
			'land-forest': {
				color: getColor('wood'),
				opacity: { 7: 0, 8: 1 },
			},
			'land-grass': {
				color: getColor('grass'),
				opacity: { 11: 0, 12: 1 },
			},
			'land-{park,garden,vegetation}': {
				color: getColor('grass', { darken: 0.05, saturate: 0.05 }),
				opacity: { 11: 0, 12: 1 },
			},
			'land-agriculture': {
				color: getColor('agriculture'),
				opacity: { 10: 0, 11: 1 },
			},
			'land-{commercial,industrial,residential}': {
				color: getColor('land', { darken: 0.03 }),
				opacity: { 10: 0, 11: 1 },
			},
			'site-{bicycleparking,parking}': {
				color: getColor('site'),
			},
			'building': {
				color: getColor('building'),
				opacity: { 14: 0, 15: 1 },
			},
			'bridge': {
				color: getColor('land', { darken: 0.01 }),
			},
			'{tunnel-,bridge-,}street-*': {
				color: getColor('street'),
				size: 1,
				lineJoin: 'round',
				lineCap: 'round',
			},
			'{tunnel-,}street-*:outline': {
				color: getColor('street', { darken: 0.1 }),
				lineJoin: 'round',
				lineCap: 'round',
			},
			'tunnel-street-*': {
				color: getColor('street', { darken: 0.03 }),
			},
			'tunnel-street-*:outline': {
				color: getColor('street', { darken: 0.13 }),
				lineDasharray: [1, 2],
			},
			'bridge-street-*:outline': {
				color: getColor('street', { darken: 0.15 }),
			},
			// motorway
			'{bridge-street,tunnel-street,street}-motorway:outline': {
				size: { 5: 2, 10: 5, 14: 5, 16: 14, 18: 38, 19: 84, 20: 168 },
				opacity: { 5: 0, 6: 1 },
			},
			'{bridge-street,tunnel-street,street}-motorway': {
				size: { 5: 1, 10: 4, 14: 4, 16: 12, 18: 36, 19: 80, 20: 160 },
				opacity: { 5: 0, 6: 1 },
			},

			// trunk
			'{bridge-street,tunnel-street,street}-trunk:outline': {
				size: { 7: 2, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
				opacity: { 7: 0, 8: 1 },
			},
			'{bridge-street,tunnel-street,street}-trunk': {
				size: { 7: 1, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
				opacity: { 7: 0, 8: 1 },
			},

			// primary
			'{bridge-street,tunnel-street,street}-primary:outline': {
				size: { 7: 2, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
				opacity: { 7: 0, 8: 1 },
			},
			'{bridge-street,tunnel-street,street}-primary': {
				size: { 7: 1, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
				opacity: { 7: 0, 8: 1 },
			},

			// secondary
			'{bridge-street,tunnel-street,street}-secondary:outline': {
				size: { 11: 2, 14: 5, 16: 8, 18: 30, 19: 68, 20: 138 },
				opacity: { 11: 0, 12: 1 },
			},
			'{bridge-street,tunnel-street,street}-secondary': {
				size: { 11: 1, 14: 4, 16: 6, 18: 28, 19: 64, 20: 130 },
				opacity: { 11: 0, 12: 1 },
			},

			// links
			'{bridge-street,tunnel-street,street}-motorway-link:outline': {
				minzoom: 12,
				size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
				opacity: { 12: 0, 13: 1 },
			},
			'{bridge-street,tunnel-street,street}-motorway-link': {
				minzoom: 12,
				size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
				opacity: { 12: 0, 13: 1 },
			},

			'{bridge-street,tunnel-street,street}-{trunk,primary,secondary}-link:outline': {
				minzoom: 13,
				size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
				opacity: { 13: 0, 14: 1 },
			},
			'{bridge-street,tunnel-street,street}-{trunk,primary,secondary}-link': {
				minzoom: 13,
				size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
				opacity: { 13: 0, 14: 1 },
			},

			// minor streets
			'{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,living_street,pedestrian}:outline': {
				size: { 12: 2, 14: 3, 16: 6, 18: 26, 19: 64, 20: 128 },
				opacity: { 12: 0, 13: 1 },
			},
			'{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,living_street,pedestrian}': {
				size: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
				opacity: { 12: 0, 13: 1 },
			},
			// service and tracks
			'{bridge-street,tunnel-street,street}-{service,track}:outline': {
				size: { 14: 2, 16: 4, 18: 18, 19: 48, 20: 96 },
				opacity: { 14: 0, 15: 1 },
			},
			'{bridge-street,tunnel-street,street}-{service,track}': {
				size: { 14: 1, 16: 3, 18: 16, 19: 44, 20: 88 },
				opacity: { 14: 0, 15: 1 },
			},
			// ways, surface only
			'way-{footway,path,steps}:outline': {
				size: { 17: 0, 18: 3 },
				opacity: { 17: 0, 18: 1 },
				minzoom: 17,
				color: getColor('foot', { darken: 0.05 }),
			},
			'way-{footway,path,steps}': {
				size: { 17: 0, 18: 2 },
				opacity: { 17: 0, 18: 1 },
				minzoom: 17,
				color: getColor('foot'),
			},
			'street-pedestrian': {
				size: { 13: 1, 15: 3 },
				opacity: { 13: 0, 14: 1 },
				color: getColor('foot'),
			},
			'street-pedestrian-zone': {
				color: getColor('foot'),
				opacity: { 14: 0, 15: 1 },
			},
			// rail
			'{tunnel-,bridge-,}transport-{rail,lightrail}:outline': {
				color: getColor('rail'),
				size: { 8: 1, 12: 1, 15: 3 },
			},
			'{tunnel-,bridge-,}transport-{rail,lightrail}': {
				color: getColor('rail', { lighten: 0.1 }),
				size: { 8: 1, 12: 1, 15: 2 },
				lineDasharray: [2, 2],
			},
			// bridge
			'{bridge-,}transport-rail:outline': {
				opacity: { 8: 0, 9: 1 },
			},
			'{bridge-,}transport-rail': {
				opacity: { 14: 0, 15: 1 },
			},
			'{bridge-,}transport-lightrail:outline': {
				opacity: { 11: 0, 12: 1 },
			},
			'{bridge-,}transport-lightrail': {
				opacity: { 14: 0, 15: 1 },
			},
			// tunnel
			'tunnel-transport-rail:outline': {
				opacity: { 8: 0, 9: 0.3 },
			},
			'tunnel-transport-rail': {
				opacity: { 14: 0, 15: 0.3 },
			},
			'tunnel-transport-lightrail:outline': {
				opacity: { 11: 0, 12: 0.3 },
			},
			'tunnel-transport-lightrail': {
				opacity: { 14: 0, 15: 0.3 },
			},
			// labels
			'label-boundary-*': {
				color: getColor('label'),
				font: getFont('bold'),
				textTransform: 'uppercase',
				textHaloColor: getColor('label', { lighten: 0.5 }),
				textHaloWidth: 0.1,
				textHaloBlur: 1,
			},
			'label-boundary-country-large': {
				minzoom: 2,
				size: { 2: 11, 5: 16 },
			},
			'label-boundary-country-medium': {
				minzoom: 3,
				size: { 3: 11, 5: 15 },
			},
			'label-boundary-country-small': {
				minzoom: 4,
				size: { 4: 11, 5: 14 },
			},
			'label-boundary-state': {
				minzoom: 5,
				color: getColor('label', { lighten: 0.05 }),
				size: { 5: 8, 8: 12 },
			},
			'label-place-*': {
				color: getColor('label', { rotate: -15, saturate: 1, darken: 0.05 }),
				font: getFont('regular'),
				textHaloColor: getColor('label', { lighten: 0.5 }),
				textHaloWidth: 0.1,
				textHaloBlur: 1,
				size: 1,
			},
			'label-place-capital': {
				minzoom: 5,
				size: { 5: 12, 10: 16 },
			},
			'label-place-statecapital': {
				minzoom: 6,
				size: { 6: 11, 10: 15 },
			},
			'label-place-city': {
				minzoom: 7,
				size: { 7: 11, 10: 14 },
			},
			'label-place-city': {
				minzoom: 7,
				size: { 7: 11, 10: 14 },
			},
			'label-place-town': {
				minzoom: 8,
				size: { 8: 11, 12: 14 },
			},
			'label-place-village': {
				minzoom: 9,
				size: { 9: 11, 12: 14 },
			},
			'label-place-hamlet': {
				minzoom: 10,
				size: { 10: 11, 12: 14 },
			},
			// all the city things
			'label-place-suburb': {
				minzoom: 11,
				size: { 11: 11, 13: 14 },
				textTransform: 'uppercase',
				color: getColor('label', { rotate: -30, saturate: 1, darken: 0.05 }),
			},
			'label-place-quarter': {
				minzoom: 13,
				size: { 13: 13 },
				textTransform: 'uppercase',
				color: getColor('label', { rotate: -40, saturate: 1, darken: 0.05 }),
			},
			'label-place-neighbourhood': {
				minzoom: 14,
				size: { 14: 12 },
				textTransform: 'uppercase',
				color: getColor('label', { rotate: -50, saturate: 1, darken: 0.05 }),
			},

			'label-motorway-shield': {
				color: getColor('label'),
				font: getFont('regular'),
				textHaloColor: getColor('label', { desaturate: 0.5, lighten: 0.1 }),
				textHaloWidth: 0.1,
				textHaloBlur: 1,
				symbolPlacement: 'line',
				textAnchor: 'center',
				minzoom: 14,
				size: { 14: 8, 18: 10, 20: 16 },
			},


			'label-street-*': {
				color: getColor('label'),
				font: getFont('regular'),
				textHaloColor: getColor('label', { desaturate: 0.5, lighten: 0.1 }),
				textHaloWidth: 0.1,
				textHaloBlur: 1,
				symbolPlacement: 'line',
				textAnchor: 'center',
				minzoom: 12,
				size: { 12: 10, 15: 13 },
			},

		};

		/*
		{
		  'id': 'label-boundary-country-any',
		  'type': 'symbol',
		  'filter': [
			 'all',
			 ['in', 'admin_level', 2, '2'],
			 ['!has', 'land_area']
		  ],
		  'layout': {
			 'text-field': '{name}',
			 'text-font': [getFont('bold')],
			 'text-size': {
				'stops': [[2, 10], [5, 16]]
			 },
			 'text-transform': 'uppercase',
			 'text-padding': 3
		  },
		  'paint': {
			 'text-color': 'rgba(203, 183, 183, 1)',
			 'text-halo-width': 0.1,
			 'text-halo-blur': 1,
			 'text-halo-color': 'rgba(255, 255, 255, 1)'
		  },
		  'source-layer': 'boundary_labels',
		  'source': 'versatiles-shortbread'
		}
		*/
	}
}


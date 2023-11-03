import StyleDefinition from '../lib/style_definition.js';
import { StyleRules, StyleRulesOptions } from '../lib/types.js';

export default class Colorful extends StyleDefinition {
	constructor() {
		super();

		this.name = 'colorful';

		this.fonts = {
			regular: 'noto_sans_regular',
			bold: 'noto_sans_bold',
		}

		this.colors = {
			land: '#F9F4EE',
			water: '#BEDDF3',
			glacier: '#FFFFFF',
			wood: '#66AA44',
			grass: '#D8E8C8',
			park: '#D9D9A5',
			street: '#FFFFFF',
			streetbg: '#CFCDCA',
			motorway: '#FFCC88',
			motorwaybg: '#E9AC77',
			trunk: '#FFEEAA',
			trunkbg: '#E9AC77',
			buildingbg: '#DFDBD7',
			building: '#F2EAE2',
			boundary: '#A6A6C8',
			disputed: '#BEBCCF',
			residential: '#EAE6E133',
			commercial: '#F7DEED40',
			industrial: '#FFF4C255',
			foot: '#FBEBFF',
			label: '#333344',
			labelHalo: '#FFFFFFCC',
			shield: '#FFFFFF',
			agriculture: '#F0E7D1',
			rail: '#B1BBC4',
			subway: '#A6B8C7',
			cycle: '#EFF9FF',
			waste: '#DBD6BD',
			burial: '#DDDBCA',
			sand: '#FAFAED',
			rock: '#E0E4E5',
			leisure: '#E7EDDE',
			wetland: '#D3E6DB',
			symbol: '#66626A',
			danger: '#FF0000',
			prison: '#FDF2FC',
			parking: '#EBE8E6',
			construction: '#A9A9A9',
			education: '#FFFF80',
			hospital: '#FF6666',
			poi: '#555555',
		}
	}
	getStyleRules(options: StyleRulesOptions): StyleRules {
		const { colors, fonts } = options;
		return {
			// background
			'background': {
				color: colors.land,
			},

			// boundary
			'boundary-{country,state}:outline': {
				color: colors.land.lighten(0.1),
				lineBlur: 1,
				lineCap: 'round',
				lineJoin: 'round',
			},
			'boundary-{country,state}': {
				color: colors.boundary,
				lineCap: 'round',
				lineJoin: 'round',
			},
			'boundary-country{-disputed,}:outline': {
				size: { 2: 0, 3: 2, 10: 8, },
				opacity: 0.75,
				color: colors.land.lighten(0.05),
			},
			'boundary-country{-disputed,}': {
				size: { 2: 0, 3: 1, 10: 4, },
			},
			'boundary-country-disputed': {
				color: colors.disputed,
				lineDasharray: [2, 1],
				lineCap: 'square',
			},
			'boundary-state:outline': {
				size: { 7: 0, 8: 2, 10: 4, },
				opacity: 0.75,
			},
			'boundary-state': {
				size: { 7: 0, 8: 1, 10: 2, },
			},

			// water

			'water-*': {
				color: colors.water,
				lineCap: 'round',
				lineJoin: 'round',
			},
			'water-area': {
				opacity: { 4: 0, 6: 1 },
			},
			'water-area-*': {
				opacity: { 4: 0, 6: 1 },
			},
			'water-{pier,dam}-area': {
				color: colors.land,
				opacity: { 12: 0, 13: 1 },
			},
			'water-river': {
				lineWidth: { 9: 0, 10: 3, 15: 5, 17: 9, 18: 20, 20: 60 },
			},
			'water-canal': {
				lineWidth: { 9: 0, 10: 2, 15: 4, 17: 8, 18: 17, 20: 50 },
			},
			'water-stream': {
				lineWidth: { 13: 0, 14: 1, 15: 2, 17: 6, 18: 12, 20: 30 },
			},
			'water-ditch': {
				lineWidth: { 14: 0, 15: 1, 17: 4, 18: 8, 20: 20 },
			},

			// land

			'land-*': {
				color: colors.land,
			},
			'land-glacier': {
				color: colors.glacier,
			},
			'land-forest': {
				color: colors.wood,
				opacity: { 7: 0, 8: 0.1 },
			},
			'land-grass': {
				color: colors.grass,
				opacity: { 11: 0, 12: 1 },
			},
			'land-{park,garden,vegetation}': {
				color: colors.park,
				opacity: { 11: 0, 12: 1 },
			},
			'land-agriculture': {
				color: colors.agriculture,
				opacity: { 10: 0, 11: 1 },
			},
			'land-residential': {
				color: colors.residential,
				opacity: { 10: 0, 11: 1 },
			},
			'land-commercial': {
				color: colors.commercial,
				opacity: { 10: 0, 11: 1 },
			},
			'land-industrial': {
				color: colors.industrial,
				opacity: { 10: 0, 11: 1 },
			},
			'land-waste': {
				color: colors.waste,
				opacity: { 10: 0, 11: 1 },
			},
			'land-burial': {
				color: colors.burial,
				opacity: { 13: 0, 14: 1 },
			},
			'land-leisure': {
				color: colors.leisure,
			},
			'land-rock': {
				color: colors.rock,
			},
			'land-sand': {
				color: colors.sand,
			},
			'land-wetland': {
				color: colors.wetland,
			},

			// site

			'site-dangerarea': {
				color: colors.danger,
				fillOutlineColor: colors.danger,
				opacity: 0.3,
				image: 'pattern-warning-12',
			},
			'site-hospital': {
				color: colors.hospital,
				opacity: 0.1,
			},
			'site-prison': {
				color: colors.prison,
				image: 'pattern-striped-12',
				opacity: 0.1,
			},
			'site-construction': {
				color: colors.construction,
				image: 'pattern-hatched-thin-12',
				opacity: 0.1,
			},
			'site-{university,college,school}': {
				color: colors.education,
				opacity: 0.1,
			},
			'site-{bicycleparking,parking}': {
				color: colors.parking,
			},

			// building

			'building:outline': {
				color: colors.buildingbg,
				opacity: { 14: 0, 15: 1 },
			},
			'building': { // fake 2.5d with translate
				color: colors.building,
				opacity: { 14: 0, 15: 1 },
				fillTranslate: [-2, -2],
			},

			// airport
			'airport-area': {
				color: colors.street,
				opacity: 0.5,
			},
			'airport-{runway,taxiway}:outline': {
				color: colors.streetbg,
				lineJoin: 'round',
			},
			'airport-{runway,taxiway}': {
				color: colors.street,
				lineJoin: 'round',
			},
			'airport-runway:outline': {
				size: { 11: 0, 12: 6, 13: 9, 14: 16, 15: 24, 16: 40, 17: 100, 18: 160, 20: 300 },
			},
			'airport-runway': {
				size: { 11: 0, 12: 5, 13: 8, 14: 14, 15: 22, 16: 38, 17: 98, 18: 158, 20: 298 },
				opacity: { 11: 0, 12: 1 },
			},
			'airport-taxiway:outline': {
				size: { 13: 0, 14: 2, 15: 10, 16: 14, 18: 20, 20: 40 },
			},
			'airport-taxiway': {
				size: { 13: 0, 14: 1, 15: 8, 16: 12, 18: 18, 20: 36 },
				opacity: { 13: 0, 14: 1 },
			},

			// bridge

			'bridge': {
				color: colors.land.darken(0.02),
				fillAntialias: true,
				opacity: 0.8,
			},

			// street

			// colors and joins
			'{tunnel-,bridge-,}street-*:outline': {
				color: colors.streetbg,
				lineJoin: 'round',
			},
			'{tunnel-,bridge-,}street-*': {
				color: colors.street,
				lineJoin: 'round',
			},
			'tunnel-street-*:outline': {
				color: colors.street.darken(0.13),
			},
			'tunnel-street-*': {
				color: colors.street.darken(0.03),
			},
			'bridge-street-*:outline': {
				color: colors.street.darken(0.15),
			},

			// streets and ways, line caps
			'{tunnel-,}{street,way}-*': {
				lineCap: 'round',
			},
			'{tunnel-,}{street,way}-*:outline': {
				lineCap: 'round',
			},
			'bridge-{street,way}-*': {
				lineCap: 'butt',
			},
			'bridge-{street,way}-*:outline': {
				lineCap: 'butt',
			},

			// special color: motorway
			'{bridge-,}street-motorway{-link,}:outline': {
				color: colors.motorwaybg,
			},
			'{bridge-,}street-motorway{-link,}': {
				color: colors.motorway,
			},
			'{bridge-,}street-{trunk,primary,secondary}{-link,}:outline': {
				color: colors.trunkbg,
			},
			'{bridge-,}street-{trunk,primary,secondary}{-link,}': {
				color: colors.trunk,
			},
			'tunnel-street-motorway{-link,}:outline': {
				color: colors.motorwaybg.lighten(0.05),
				lineDasharray: [1, 0.3],
			},
			'tunnel-street-motorway{-link,}': {
				color: colors.motorway.lighten(0.1),
				lineCap: 'butt',
			},
			'tunnel-street-{trunk,primary,secondary}{-link,}:outline': {
				color: colors.trunkbg.lighten(0.05),
				lineDasharray: [1, 0.3],
			},
			'tunnel-street-{trunk,primary,secondary}{-link,}': {
				color: colors.trunk.lighten(0.1),
				lineCap: 'butt',
			},

			// motorway
			'{bridge-,tunnel-,}street-motorway:outline': {
				size: { 5: 0, 6: 2, 10: 5, 14: 5, 16: 14, 18: 38, 19: 84, 20: 168 },
			},
			'{bridge-,tunnel-,}street-motorway': {
				size: { 5: 0, 6: 1, 10: 4, 14: 4, 16: 12, 18: 36, 19: 80, 20: 160 },
				opacity: { 5: 0, 6: 1 },
			},

			// trunk
			'{bridge-,tunnel-,}street-trunk:outline': {
				size: { 7: 0, 8: 2, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
			},
			'{bridge-,tunnel-,}street-trunk': {
				size: { 7: 0, 8: 1, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
				opacity: { 7: 0, 8: 1 },
			},

			// primary
			'{bridge-,tunnel-,}street-primary:outline': {
				size: { 8: 0, 9: 1, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
			},
			'{bridge-,tunnel-,}street-primary': {
				size: { 8: 0, 9: 2, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
				opacity: { 8: 0, 9: 1 },
			},

			// secondary
			'{bridge-,tunnel-,}street-secondary:outline': {
				size: { 11: 2, 14: 5, 16: 8, 18: 30, 19: 68, 20: 138 },
				opacity: { 11: 0, 12: 1 },
			},
			'{bridge-,tunnel-,}street-secondary': {
				size: { 11: 1, 14: 4, 16: 6, 18: 28, 19: 64, 20: 130 },
				opacity: { 11: 0, 12: 1 },
			},

			// links
			'{bridge-,tunnel-,}street-motorway-link:outline': {
				minzoom: 12,
				size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
				//		opacity: { 12: 0, 13: 1 }, // no fade-in because those are merged in lower zooms
			},
			'{bridge-,tunnel-,}street-motorway-link': {
				minzoom: 12,
				size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
				//		opacity: { 12: 0, 13: 1 }, // no fade-in because those are merged in lower zooms
			},
			'{bridge-,tunnel-,}street-{trunk,primary,secondary}-link:outline': {
				minzoom: 13,
				size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
				//		opacity: { 13: 0, 14: 1 }, // no fade-in because those are merged in lower zooms
			},
			'{bridge-,tunnel-,}street-{trunk,primary,secondary}-link': {
				minzoom: 13,
				size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
				//		opacity: { 13: 0, 14: 1 }, // no fade-in because those are merged in lower zooms
			},

			// minor streets
			'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*:outline': {
				size: { 12: 2, 14: 3, 16: 6, 18: 26, 19: 64, 20: 128 },
				opacity: { 12: 0, 13: 1 },
			},
			'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*': {
				size: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
				opacity: { 12: 0, 13: 1 },
			},

			// service and tracks
			'{bridge-,tunnel-,}street-{service,track}:outline': {
				size: { 14: 2, 16: 4, 18: 18, 19: 48, 20: 96 },
				opacity: { 14: 0, 15: 1 },
			},
			'{bridge-,tunnel-,}street-{service,track}': {
				size: { 14: 1, 16: 3, 18: 16, 19: 44, 20: 88 },
				opacity: { 14: 0, 15: 1 },
			},

			// ways
			'{bridge-,tunnel-,}way-*:outline': {
				size: { 15: 0, 16: 5, 18: 7, 19: 12, 20: 22 },
				minzoom: 15,
			},
			'{bridge-,tunnel-,}way-*': {
				size: { 15: 0, 16: 4, 18: 6, 19: 10, 20: 20 },
				minzoom: 15,
			},

			// foot
			'{bridge-,}way-{footway,path,steps}:outline': {
				color: colors.foot.darken(0.1),
			},
			'{bridge-,}way-{footway,path,steps}': {
				color: colors.foot.lighten(0.02),
			},
			'tunnel-way-{footway,path,steps}:outline': {
				color: colors.foot.darken(0.1).desaturate(0.5),
			},
			'tunnel-way-{footway,path,steps}': {
				color: colors.foot.darken(0.02).desaturate(0.5),
				lineDasharray: [1, 0.2],
			},

			// cycleway
			'{bridge-,}way-cycleway:outline': {
				color: colors.cycle.darken(0.1),
			},
			'{bridge-,}way-cycleway': {
				color: colors.cycle,
			},
			'tunnel-way-cycleway:outline': {
				color: colors.cycle.darken(0.1).desaturate(0.5),
			},
			'tunnel-way-cycleway': {
				color: colors.cycle.darken(0.02).desaturate(0.5),
				lineDasharray: [1, 0.2],
			},

			// cycle streets overlay
			'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}-bicycle': {
				lineCap: 'butt',
				color: colors.cycle,
			},

			// pedestrian
			'street-pedestrian': {
				size: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
				opacity: { 13: 0, 14: 1 },
				color: colors.foot,
			},
			'street-pedestrian-zone': {
				color: colors.foot.lighten(0.02).fade(0.75),
				opacity: { 14: 0, 15: 1 },
			},

			// rail, lightrail
			'{tunnel-,bridge-,}transport-{rail,lightrail}:outline': {
				color: colors.rail,
				size: { 8: 1, 13: 1, 15: 3, 16: 4, 18: 8, 19: 11, 20: 14 },
			},
			'{tunnel-,bridge-,}transport-{rail,lightrail}': {
				color: colors.rail.lighten(0.25),
				size: { 8: 1, 13: 1, 15: 2, 16: 3, 18: 6, 19: 8, 20: 10 },
				lineDasharray: [2, 2],
			},
			// subway
			'{tunnel-,bridge-,}transport-subway:outline': {
				color: colors.subway,
				size: { 11: 0, 12: 1, 15: 3, 16: 3, 18: 6, 19: 8, 20: 10 },
			},
			'{tunnel-,bridge-,}transport-subway': {
				color: colors.subway.lighten(0.25),
				size: { 11: 0, 12: 1, 15: 2, 16: 2, 18: 5, 19: 6, 20: 8 },
				lineDasharray: [2, 2],
			},
			// monorail
			'{tunnel-,bridge-,}transport-{tram,narrowgauge,funicular,monorail}:outline': {
				minzoom: 15,
				color: colors.rail,
				size: { 15: 0, 16: 5, 18: 7, 20: 20 },
				lineDasharray: [0.1, 0.5],
			},
			'{tunnel-,bridge-,}transport-{tram,narrowgauge,funicular,monorail}': {
				minzoom: 13,
				size: { 13: 0, 16: 1, 17: 2, 18: 3, 20: 5 },
				color: colors.rail,
			},

			// bridge
			'{bridge-,}transport-rail:outline': {
				opacity: { 8: 0, 9: 1 },
			},
			'{bridge-,}transport-rail': {
				opacity: { 14: 0, 15: 1 },
			},
			'{bridge-,}transport-{lightrail,subway}:outline': {
				opacity: { 11: 0, 12: 1 },
			},
			'{bridge-,}transport-{lightrail,subway}': {
				opacity: { 14: 0, 15: 1 },
			},

			// tunnel
			'tunnel-transport-rail:outline': {
				opacity: { 8: 0, 9: 0.3 },
			},
			'tunnel-transport-rail': {
				opacity: { 14: 0, 15: 0.3 },
			},
			'tunnel-transport-{lightrail,subway}:outline': {
				opacity: { 11: 0, 12: 0.5 },
			},
			'tunnel-transport-{lightrail,subway}': {
				opacity: { 14: 0, 15: 1 },
			},

			// ferry
			'transport-ferry': {
				minzoom: 10,
				color: colors.water.darken(0.1),
				size: { 10: 1, 13: 2, 14: 3, 16: 4, 17: 6 },
				opacity: { 10: 0, 11: 1 },
				lineDasharray: [1, 1],
			},

			// labels
			'label-boundary-*': {
				color: colors.label,
				font: fonts.regular,
				textTransform: 'uppercase',
				textHaloColor: colors.labelHalo,
				textHaloWidth: 2,
				textHaloBlur: 1,
				textAnchor: 'top',
				textOffset: [0, 0.2],
				textPadding: 0,
				textOptional: true,
			},
			'label-boundary-country-large': {
				minzoom: 2,
				size: { 2: 8, 5: 13 },
			},
			'label-boundary-country-medium': {
				minzoom: 3,
				size: { 3: 8, 5: 12 },
			},
			'label-boundary-country-small': {
				minzoom: 4,
				size: { 4: 8, 5: 11 },
			},
			'label-boundary-state': {
				minzoom: 5,
				color: colors.label.lighten(0.05),
				size: { 5: 8, 8: 12 },
			},
			'label-place-*': {
				color: colors.label.rotate(-15).saturate(1).darken(0.05),
				font: fonts.regular,
				textHaloColor: colors.labelHalo,
				textHaloWidth: 2,
				textHaloBlur: 1,
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
			'label-place-town': {
				minzoom: 9,
				size: { 8: 11, 12: 14 },
			},
			'label-place-village': {
				minzoom: 11,
				size: { 9: 11, 12: 14 },
			},
			'label-place-hamlet': {
				minzoom: 13,
				size: { 10: 11, 12: 14 },
			},
			// all the city things
			'label-place-suburb': {
				minzoom: 11,
				size: { 11: 11, 13: 14 },
				textTransform: 'uppercase',
				color: colors.label.rotate(-30).saturate(1).darken(0.05),
			},
			'label-place-quarter': {
				minzoom: 13,
				size: { 13: 13 },
				textTransform: 'uppercase',
				color: colors.label.rotate(-40).saturate(1).darken(0.05),
			},
			'label-place-neighbourhood': {
				minzoom: 14,
				size: { 14: 12 },
				textTransform: 'uppercase',
				color: colors.label.rotate(-50).saturate(1).darken(0.05),
			},
			'label-motorway-shield': {
				color: colors.shield,
				font: fonts.bold,
				textHaloColor: colors.motorway,
				textHaloWidth: 0.1,
				textHaloBlur: 1,
				symbolPlacement: 'line',
				textAnchor: 'center',
				minzoom: 14,
				size: { 14: 10, 18: 12, 20: 16 },
			},
			'label-street-*': {
				color: colors.label,
				font: fonts.regular,
				textHaloColor: colors.labelHalo,
				textHaloWidth: 2,
				textHaloBlur: 1,
				symbolPlacement: 'line',
				textAnchor: 'center',
				minzoom: 12,
				size: { 12: 10, 15: 13 },
			},
			'label-address-housenumber': {
				font: fonts.regular,
				textHaloColor: colors.building.lighten(0.05),
				textHaloWidth: 2,
				textHaloBlur: 1,
				symbolPlacement: 'point',
				textAnchor: 'center',
				minzoom: 17,
				size: { 17: 8, 19: 10 },
				color: colors.building.darken(0.3),
			},

			// markings
			'marking-oneway{-reverse,}': {
				minzoom: 16,
				image: 'marking-arrow-15',
				opacity: { 16: 0, 17: 0.7 },
				font: fonts.regular,
			},

			// TODO: bicycle and pedestrian

			// transit
			'symbol-*': {
				iconSize: 1,
				symbolPlacement: 'point',
				iconOpacity: 0.7,
				iconKeepUpright: true,
				font: fonts.regular,
				size: 10,
				color: colors.symbol,
				iconAnchor: 'bottom',
				textAnchor: 'top',
				textHaloColor: colors.labelHalo,
				textHaloWidth: 2,
				textHaloBlur: 1,
			},
			'symbol-transit-airport': {
				minzoom: 12,
				image: 'icon-airport-22',
				iconSize: { 12: 0.5, 14: 1 },
			},
			'symbol-transit-airfield': {
				minzoom: 13,
				image: 'icon-airfield-22',
				iconSize: { 13: 0.5, 15: 1 },
			},
			'symbol-transit-station': {
				minzoom: 13,
				image: 'icon-rail-22',
				iconSize: { 13: 0.5, 15: 1 },
			},
			'symbol-transit-lightrail': {
				minzoom: 14,
				image: 'icon-rail-light-22',
				iconSize: { 14: 0.5, 16: 1 },
			},
			'symbol-transit-subway': {
				minzoom: 14,
				image: 'icon-rail-metro-22',
				iconSize: { 14: 0.5, 16: 1 },
			},
			'symbol-transit-tram': {
				minzoom: 15,
				image: 'transport-tram-22',
				iconSize: { 15: 0.5, 17: 1 },
			},
			'symbol-transit-bus': {
				minzoom: 16,
				image: 'icon-bus-22',
				iconSize: { 16: 0.5, 18: 1 },
			},
			// TODO: localized symbols? depends on shortbread

			// pois
			'poi-*': {
				minzoom: 16,
				iconSize: { 16: 0.5, 19: 0.5, 20: 1 },
				opacity: { 16: 0, 17: 0.4 },
				symbolPlacement: 'point',
				iconOptional: true,
				font: fonts.regular,
				color: colors.poi,
			},
			'poi-amenity': {
				image: ['match',
					['get', 'amenity'],
					'arts_centre', 'icon-art_gallery-22',
					'atm', 'icon-atm-22',
					'bank', 'icon-bank-22',
					'bar', 'icon-bar-22',
					'bench', 'icon-bench-22',
					'bicycle_rental', 'icon-bicycle_share-22',
					'biergarten', 'icon-beergarden-22',
					'cafe', 'icon-cafe-22',
					'car_rental', 'icon-car_rental-22',
					'car_sharing', 'icon-car_rental-22',
					'car_wash', 'icon-car_wash-22',
					'cinema', 'icon-cinema-22',
					//'clinic', 'icon-clinic-22',
					'college', 'icon-college-22',
					'community_centre', 'icon-community-22',
					//'courthouse', 'icon-courthouse-22',
					'dentist', 'icon-dentist-22',
					'doctors', 'icon-doctor-22',
					'dog_park', 'icon-dog_park-22',
					'drinking_water', 'icon-drinking_water-22',
					'embassy', 'icon-embassy-22',
					'fast_food', 'icon-fast_food-22',
					'fire_station', 'icon-fire_station-22',
					//'food_court', 'icon-food_court-22',
					'fountain', 'icon-fountain-22',
					'grave_yard', 'icon-cemetery-22',
					'hospital', 'icon-hospital-22',
					'hunting_stand', 'icon-huntingstand-22',
					'library', 'icon-library-22',
					'marketplace', 'icon-marketplace-22',
					'nightclub', 'icon-nightclub-22',
					'nursing_home', 'icon-nursinghome-22',
					'pharmacy', 'icon-pharmacy-22',
					'place_of_worship', 'icon-place_of_worship-22',
					'playground', 'icon-playground-22',
					'police', 'icon-police-22',
					'post_box', 'icon-post_box-22',
					'post_office', 'icon-post-22',
					'prison', 'icon-prison-22',
					'pub', 'icon-beer-22',
					//'public_building', 'icon-public_building-22',
					'recycling', 'icon-recycling-22',
					'restaurant', 'icon-restaurant-22',
					'school', 'icon-school-22',
					'shelter', 'icon-shelter-22',
					'telephone', 'icon-telephone-22',
					'theatre', 'icon-theatre-22',
					'toilets', 'icon-toilet-22',
					'townhall', 'icon-town_hall-22',
					//'university', 'icon-university-22',
					'vending_machine', 'icon-vendingmachine-22',
					'veterinary', 'icon-veterinary-22',
					'waste_basket', 'icon-waste_basket-22',
					'UNDEFINED'
				]
			},
			'poi-leisure': {
				image: ['match',
					['get', 'leisure'],
					'golf_course', 'icon-golf-22',
					'ice_rink', 'icon-icerink-22',
					'pitch', 'icon-pitch-22',
					//'sports_centre', 'icon-sports_centre-22',
					'stadium', 'icon-stadium-22',
					'swimming_pool', 'icon-swimming-22',
					'water_park', 'icon-waterpark-22',
					'icon-sports-22'
				]
			},
			'poi-tourism': {
				image: ['match',
					['get', 'tourism'],
					//'alpine_hut', 'icon-alpine_hut-22',
					//'bed_and_breakfast', 'icon-bed_and_breakfast-22',
					//'camp_site', 'icon-camp_site-22',
					//'caravan_site', 'icon-caravan_site-22',
					'chalet', 'icon-chalet-22',
					//'guest_house', 'icon-guest_house-22',
					//'hostel', 'icon-hostel-22',
					//'hotel', 'icon-hotel-22',
					'information', 'transport-information-22',
					//'motel', 'icon-motel-22',
					'picnic_site', 'icon-picnic_site-22',
					//'theme_park', 'icon-theme_park-22',
					'viewpoint', 'icon-viewpoint-22',
					'zoo', 'icon-zoo-22',
					'UNDEFINED'
				]
			},
			'poi-shop': {
				image: ['match',
					['get', 'shop'],
					'alcohol', 'icon-alcohol_shop-22',
					'bakery', 'icon-bakery-22',
					'beauty', 'icon-beauty-22',
					'beverages', 'icon-beverages-22',
					//'bicycle', 'icon-bicycle-22',
					'books', 'icon-books-22',
					'butcher', 'icon-butcher-22',
					//'car', 'icon-car-22',
					'chemist', 'icon-chemist-22',
					'clothes', 'icon-clothes-22',
					//'computer', 'icon-computer-22',
					//'convinience', 'icon-convinience-22',
					//'department_store', 'icon-department_store-22',
					'doityourself', 'icon-doityourself-22',
					'dry_cleaning', 'icon-drycleaning-22',
					'florist', 'icon-florist-22',
					'furniture', 'icon-furniture-22',
					'garden_centre', 'icon-garden_centre-22',
					'general', 'icon-shop-22',
					'gift', 'icon-gift-22',
					'greengrocer', 'icon-greengrocer-22',
					'hairdresser', 'icon-hairdresser-22',
					'hardware', 'icon-hardware-22',
					'jewelry', 'icon-jewelry_store-22',
					'kiosk', 'icon-kiosk-22',
					'laundry', 'icon-laundry-22',
					//'mall', 'icon-mall-22',
					//'mobile_phone', 'icon-mobile_phone-22',
					'newsagent', 'icon-newsagent-22',
					'optican', 'icon-optician-22',
					'outdoor', 'icon-outdoor-22',
					'shoes', 'icon-shoes-22',
					'sports', 'icon-sports-22',
					'stationery', 'icon-stationery-22',
					//'supermarket', 'icon-supermarket-22',
					'toys', 'icon-toys-22',
					'travel_agency', 'icon-travel_agent-22',
					'video', 'icon-video-22',
					'icon-shop-22'
				]
			},
			'poi-man_made': {
				image: ['match',
					['get', 'man_made'],
					'lighthouse', 'icon-lighthouse-22',
					'surveillance', 'icon-surveillance-22',
					'tower', 'icon-observation_tower-22',
					//'wastewater_plant', 'icon-wastewater_plant-22',
					//'water_well', 'icon-water_well-22',
					//'water_works', 'icon-water_works-22',
					'watermill', 'icon-watermill-22',
					'windmill', 'icon-windmill-22',
					'UNDEFINED'
				]
			},
			'poi-historic': {
				image: ['match',
					['get', 'historic'],
					//'archaelogical_site', 'icon-archaelogical_site-22',
					'artwork', 'icon-artwork-22',
					//'battlefield', 'icon-battlefield-22',
					'castle', 'icon-castle-22',
					//'fort', 'icon-fort-22',
					//'memorial', 'icon-memorial-22',
					'monument', 'icon-monument-22',
					//'ruins', 'icon-ruins-22',
					//'wayside_cross', 'icon-wayside_cross-22',
					'wayside_shrine', 'icon-shrine-22',
					'icon-historic-22'
				]
			},
			'poi-emergency': {
				image: ['match',
					['get', 'emergency'],
					'defibrillator', 'icon-defibrillator-22',
					'fire_hydrant', 'icon-hydrant-22',
					'phone', 'icon-emergency_phone-22',
					'UNDEFINED'
				]
			},
			/*
			'poi-highway': {
				image: ['match',
					['get', 'highway'],
					//'emergency_access_point', 'icon-emergency_access_point-22',
					'UNDEFINED'
				]
			},
			'poi-office': {
				image: ['match',
					['get', 'office'],
					//'diplomatic', 'icon-diplomatic-22',
					'UNDEFINED'
				]
			},
			*/
		}
	}
}

/* eslint-disable @typescript-eslint/naming-convention */

import StyleBuilder from '../lib/build_style.js';
import type { StyleRules, StyleRulesOptions } from '../lib/types.js';

export default class Colorful extends StyleBuilder<Colorful> {
	public readonly name: string = 'Colorful';

	public defaultFonts = {
		regular: 'noto_sans_regular',
		bold: 'noto_sans_bold',
	};

	public defaultColors = {

		/** Color for land areas on the map. */
		land: '#F9F4EE',

		/** Color for water bodies like lakes and rivers. */
		water: '#BEDDF3',

		/** Color for glacier areas, usually shown as white. */
		glacier: '#FFFFFF',

		/** Color for wooded or forested areas. */
		wood: '#66AA44',

		/** Color for grasslands or open fields. */
		grass: '#D8E8C8',

		/** Color for parks and recreational areas. */
		park: '#D9D9A5',

		/** Color for streets and roads on the map. */
		street: '#FFFFFF',

		/** Background color for streets. */
		streetbg: '#CFCDCA',

		/** Color for major highways or motorways. */
		motorway: '#FFCC88',

		/** Background color for motorways. */
		motorwaybg: '#E9AC77',

		/** Color for trunk roads. */
		trunk: '#FFEEAA',

		/** Background color for trunk roads. */
		trunkbg: '#E9AC77',

		/** Background color for buildings. */
		buildingbg: '#DFDBD7',

		/** Primary color for buildings. */
		building: '#F2EAE2',

		/** Color used for boundaries. */
		boundary: '#A6A6C8',

		/** Color used for disputed boundaries. */
		disputed: '#BEBCCF',

		/** Color used for residential areas. */
		residential: '#EAE6E133',

		/** Color used for commercial areas. */
		commercial: '#F7DEED40',

		/** Color used for industrial areas. */
		industrial: '#FFF4C255',

		/** Color used for footpaths and pedestrian areas. */
		foot: '#FBEBFF',

		/** Primary color used for labels. */
		label: '#333344',

		/** Color used for label halos. */
		labelHalo: '#FFFFFFCC',

		/** Color used for shields on maps. */
		shield: '#FFFFFF',

		/** Color used for agriculture areas. */
		agriculture: '#F0E7D1',

		/** Color used for railways. */
		rail: '#B1BBC4',

		/** Color used for subways and underground systems. */
		subway: '#A6B8C7',

		/** Color used for cycle paths. */
		cycle: '#EFF9FF',

		/** Color used for waste areas. */
		waste: '#DBD6BD',

		/** Color used for burial and cemetery areas. */
		burial: '#DDDBCA',

		/** Color used for sand areas like beaches. */
		sand: '#FAFAED',

		/** Color used for rocky terrain. */
		rock: '#E0E4E5',

		/** Color used for leisure areas like parks and gardens. */
		leisure: '#E7EDDE',

		/** Color used for wetland areas like marshes. */
		wetland: '#D3E6DB',

		/** Color used for various symbols on the map. */
		symbol: '#66626A',

		/** Color indicating danger or warning areas. */
		danger: '#FF0000',

		/** Color used for prison areas. */
		prison: '#FDF2FC',

		/** Color used for parking areas. */
		parking: '#EBE8E6',

		/** Color used for construction sites. */
		construction: '#A9A9A9',

		/** Color used for educational facilities. */
		education: '#FFFF80',

		/** Color used for hospitals and medical facilities. */
		hospital: '#FF6666',

		/** Color used for points of interest. */
		poi: '#555555',
	};

	protected getStyleRules(options: StyleRulesOptions<Colorful>): StyleRules {
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
				size: { 2: 0, 3: 2, 10: 8 },
				opacity: 0.75,
				color: colors.land.lighten(0.05),
			},
			'boundary-country{-disputed,}': {
				size: { 2: 0, 3: 1, 10: 4 },
			},
			'boundary-country-disputed': {
				color: colors.disputed,
				lineDasharray: [2, 1],
				lineCap: 'square',
			},
			'boundary-state:outline': {
				size: { 7: 0, 8: 2, 10: 4 },
				opacity: 0.75,
			},
			'boundary-state': {
				size: { 7: 0, 8: 1, 10: 2 },
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
				image: 'pattern-warning',
			},
			'site-hospital': {
				color: colors.hospital,
				opacity: 0.1,
			},
			'site-prison': {
				color: colors.prison,
				image: 'pattern-striped',
				opacity: 0.1,
			},
			'site-construction': {
				color: colors.construction,
				image: 'pattern-hatched_thin',
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
				image: 'marking-arrow',
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
				image: 'icon-airport',
				iconSize: { 12: 0.5, 14: 1 },
			},
			'symbol-transit-airfield': {
				minzoom: 13,
				image: 'icon-airfield',
				iconSize: { 13: 0.5, 15: 1 },
			},
			'symbol-transit-station': {
				minzoom: 13,
				image: 'icon-rail',
				iconSize: { 13: 0.5, 15: 1 },
			},
			'symbol-transit-lightrail': {
				minzoom: 14,
				image: 'icon-rail_light',
				iconSize: { 14: 0.5, 16: 1 },
			},
			'symbol-transit-subway': {
				minzoom: 14,
				image: 'icon-rail_metro',
				iconSize: { 14: 0.5, 16: 1 },
			},
			'symbol-transit-tram': {
				minzoom: 15,
				image: 'transport-tram',
				iconSize: { 15: 0.5, 17: 1 },
			},
			'symbol-transit-bus': {
				minzoom: 16,
				image: 'icon-bus',
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
					'arts_centre', 'icon-art_gallery',
					'atm', 'icon-atm',
					'bank', 'icon-bank',
					'bar', 'icon-bar',
					'bench', 'icon-bench',
					'bicycle_rental', 'icon-bicycle_share',
					'biergarten', 'icon-beergarden',
					'cafe', 'icon-cafe',
					'car_rental', 'icon-car_rental',
					'car_sharing', 'icon-car_rental',
					'car_wash', 'icon-car_wash',
					'cinema', 'icon-cinema',
					//'clinic', 'icon-clinic',
					'college', 'icon-college',
					'community_centre', 'icon-community',
					//'courthouse', 'icon-courthouse',
					'dentist', 'icon-dentist',
					'doctors', 'icon-doctor',
					'dog_park', 'icon-dog_park',
					'drinking_water', 'icon-drinking_water',
					'embassy', 'icon-embassy',
					'fast_food', 'icon-fast_food',
					'fire_station', 'icon-fire_station',
					//'food_court', 'icon-food_court',
					'fountain', 'icon-fountain',
					'grave_yard', 'icon-cemetery',
					'hospital', 'icon-hospital',
					'hunting_stand', 'icon-huntingstand',
					'library', 'icon-library',
					'marketplace', 'icon-marketplace',
					'nightclub', 'icon-nightclub',
					'nursing_home', 'icon-nursinghome',
					'pharmacy', 'icon-pharmacy',
					'place_of_worship', 'icon-place_of_worship',
					'playground', 'icon-playground',
					'police', 'icon-police',
					'post_box', 'icon-postbox',
					'post_office', 'icon-post',
					'prison', 'icon-prison',
					'pub', 'icon-beer',
					//'public_building', 'icon-public_building',
					'recycling', 'icon-recycling',
					'restaurant', 'icon-restaurant',
					'school', 'icon-school',
					'shelter', 'icon-shelter',
					'telephone', 'icon-telephone',
					'theatre', 'icon-theatre',
					'toilets', 'icon-toilet',
					'townhall', 'icon-town_hall',
					//'university', 'icon-university',
					'vending_machine', 'icon-vendingmachine',
					'veterinary', 'icon-veterinary',
					'waste_basket', 'icon-waste_basket',
					'unknown',
				],
			},
			'poi-leisure': {
				image: ['match',
					['get', 'leisure'],
					'golf_course', 'icon-golf',
					'ice_rink', 'icon-icerink',
					'pitch', 'icon-pitch',
					//'sports_centre', 'icon-sports_centre',
					'stadium', 'icon-stadium',
					'swimming_pool', 'icon-swimming',
					'water_park', 'icon-waterpark',
					'icon-sports',
				],
			},
			'poi-tourism': {
				image: ['match',
					['get', 'tourism'],
					//'alpine_hut', 'icon-alpine_hut',
					//'bed_and_breakfast', 'icon-bed_and_breakfast',
					//'camp_site', 'icon-camp_site',
					//'caravan_site', 'icon-caravan_site',
					'chalet', 'icon-chalet',
					//'guest_house', 'icon-guest_house',
					//'hostel', 'icon-hostel',
					//'hotel', 'icon-hotel',
					'information', 'transport-information',
					//'motel', 'icon-motel',
					'picnic_site', 'icon-picnic_site',
					//'theme_park', 'icon-theme_park',
					'viewpoint', 'icon-viewpoint',
					'zoo', 'icon-zoo',
					'unknown',
				],
			},
			'poi-shop': {
				image: ['match',
					['get', 'shop'],
					'alcohol', 'icon-alcohol_shop',
					'bakery', 'icon-bakery',
					'beauty', 'icon-beauty',
					'beverages', 'icon-beverages',
					//'bicycle', 'icon-bicycle',
					'books', 'icon-books',
					'butcher', 'icon-butcher',
					//'car', 'icon-car',
					'chemist', 'icon-chemist',
					'clothes', 'icon-clothes',
					//'computer', 'icon-computer',
					//'convinience', 'icon-convinience',
					//'department_store', 'icon-department_store',
					'doityourself', 'icon-doityourself',
					'dry_cleaning', 'icon-drycleaning',
					'florist', 'icon-florist',
					'furniture', 'icon-furniture',
					'garden_centre', 'icon-garden_centre',
					'general', 'icon-shop',
					'gift', 'icon-gift',
					'greengrocer', 'icon-greengrocer',
					'hairdresser', 'icon-hairdresser',
					'hardware', 'icon-hardware',
					'jewelry', 'icon-jewelry_store',
					'kiosk', 'icon-kiosk',
					'laundry', 'icon-laundry',
					//'mall', 'icon-mall',
					//'mobile_phone', 'icon-mobile_phone',
					'newsagent', 'icon-newsagent',
					'optican', 'icon-optician',
					'outdoor', 'icon-outdoor',
					'shoes', 'icon-shoes',
					'sports', 'icon-sports',
					'stationery', 'icon-stationery',
					//'supermarket', 'icon-supermarket',
					'toys', 'icon-toys',
					'travel_agency', 'icon-travel_agent',
					'video', 'icon-video',
					'icon-shop',
				],
			},
			'poi-man_made': {
				image: ['match',
					['get', 'man_made'],
					'lighthouse', 'icon-lighthouse',
					'surveillance', 'icon-surveillance',
					'tower', 'icon-observation_tower',
					//'wastewater_plant', 'icon-wastewater_plant',
					//'water_well', 'icon-water_well',
					//'water_works', 'icon-water_works',
					'watermill', 'icon-watermill',
					'windmill', 'icon-windmill',
					'unknown',
				],
			},
			'poi-historic': {
				image: ['match',
					['get', 'historic'],
					//'archaelogical_site', 'icon-archaelogical_site',
					'artwork', 'icon-artwork',
					//'battlefield', 'icon-battlefield',
					'castle', 'icon-castle',
					//'fort', 'icon-fort',
					//'memorial', 'icon-memorial',
					'monument', 'icon-monument',
					//'ruins', 'icon-ruins',
					//'wayside_cross', 'icon-wayside_cross',
					'wayside_shrine', 'icon-shrine',
					'icon-historic',
				],
			},
			'poi-emergency': {
				image: ['match',
					['get', 'emergency'],
					'defibrillator', 'icon-defibrillator',
					'fire_hydrant', 'icon-hydrant',
					'phone', 'icon-emergency_phone',
					'unknown',
				],
			},

			/*
			'poi-highway': {
				image: ['match',
					['get', 'highway'],
					//'emergency_access_point', 'icon-emergency_access_point',
					'unknown'
				]
			},
			'poi-office': {
				image: ['match',
					['get', 'office'],
					//'diplomatic', 'icon-diplomatic',
					'unknown'
				]
			},
			*/
		};
	}
}

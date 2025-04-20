import { StyleBuilder } from '../style_builder/style_builder.js';
import type { StyleBuilderColors, StyleRules, StyleRulesOptions } from '../style_builder/types.js';

export default class Colorfancy extends StyleBuilder {
	public readonly name: string = 'Colorfancy';

	public defaultFonts = {
		regular: 'noto_sans_regular',
		bold: 'noto_sans_bold',
	};

	public defaultColors: StyleBuilderColors = {

		/** Color for land areas on the map. */
		land: '#F9F4EE',

		/** Color for water bodies like lakes and rivers. */
		water: '#BEDDF3',
		deepwater: '#79A1C2',

		/** Color for glacier areas, usually shown as white. */
		glacier: '#FFFFFF',

		/** Color for wooded or forested areas. */
		wood: '#66AA44',

		/** Color for grasslands or open fields. */
		grass: '#D8E8C8',

		/** Color for moss and tundra. */
		moss: '#2F714D',

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

	protected getStyleRules(options: StyleRulesOptions): StyleRules {
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
			'water-pier': {
				color: colors.land,
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

			// bathymetry
			'bathymetry': {
				fillAntialias: true,
				opacity: { 0: 0.2, 5: 1 },
				color: ["case",
					["==", ["get", "mindepth"], -25],   colors.water.blend(0.07, colors.deepwater),
					["==", ["get", "mindepth"], -50],   colors.water.blend(0.10, colors.deepwater),
					["==", ["get", "mindepth"], -100],  colors.water.blend(0.14, colors.deepwater),
					["==", ["get", "mindepth"], -200],  colors.water.blend(0.18, colors.deepwater),
					["==", ["get", "mindepth"], -250],  colors.water.blend(0.21, colors.deepwater),
					["==", ["get", "mindepth"], -500],  colors.water.blend(0.25, colors.deepwater),
					["==", ["get", "mindepth"], -750],  colors.water.blend(0.28, colors.deepwater),
					["==", ["get", "mindepth"], -1000], colors.water.blend(0.32, colors.deepwater),
					["==", ["get", "mindepth"], -1250], colors.water.blend(0.35, colors.deepwater),
					["==", ["get", "mindepth"], -1500], colors.water.blend(0.39, colors.deepwater),
					["==", ["get", "mindepth"], -1750], colors.water.blend(0.42, colors.deepwater),
					["==", ["get", "mindepth"], -2000], colors.water.blend(0.46, colors.deepwater),
					["==", ["get", "mindepth"], -2500], colors.water.blend(0.49, colors.deepwater),
					["==", ["get", "mindepth"], -3000], colors.water.blend(0.53, colors.deepwater),
					["==", ["get", "mindepth"], -3500], colors.water.blend(0.56, colors.deepwater),
					["==", ["get", "mindepth"], -4000], colors.water.blend(0.60, colors.deepwater),
					["==", ["get", "mindepth"], -4500], colors.water.blend(0.63, colors.deepwater),
					["==", ["get", "mindepth"], -5000], colors.water.blend(0.67, colors.deepwater),
					["==", ["get", "mindepth"], -5500], colors.water.blend(0.70, colors.deepwater),
					["==", ["get", "mindepth"], -6000], colors.water.blend(0.73, colors.deepwater),
					["==", ["get", "mindepth"], -6500], colors.water.blend(0.77, colors.deepwater),
					["==", ["get", "mindepth"], -7000], colors.water.blend(0.81, colors.deepwater),
					["==", ["get", "mindepth"], -7500], colors.water.blend(0.84, colors.deepwater),
					["==", ["get", "mindepth"], -8000], colors.water.blend(0.88, colors.deepwater),
					["==", ["get", "mindepth"], -8500], colors.water.blend(0.91, colors.deepwater),
					["==", ["get", "mindepth"], -9000], colors.water.blend(0.95, colors.deepwater),
					["==", ["get", "mindepth"], -9500], colors.water.blend(0.98, colors.deepwater),
					colors.water,
				],
			},

			// hillshade
			'hillshade-dark': {
				color: '#000000',
				fillOutlineColor: "#00000000",
				opacity: { 0: 0, 4: 0.05 },
			},
			'hillshade-light': {
				color: '#ffffff',
				fillOutlineColor: "#ffffff00",
				opacity: { 0: 0, 4: 0.2 },
			},
			'hillshade-*': {
				fillAntialias: true,
			},

			// landcover
			'landcover-*': {
				fillAntialias: true,
				fillOutlineColor: "#ffffff00",
				opacity: { 0: 0.2, 10: 0.2, 11: 0 },
				color: "#ffffff00",
			},
			'landcover-bare': {
				color: colors.sand, // or better?
			},
			'landcover-builtup': {
				color: colors.building, // maybe better color
			},
			'landcover-cropland': {
				color: colors.agriculture,
			},
			'landcover-grassland': {
				color: colors.grass,
			},
			'landcover-mangroves': {
				color: colors.wetland, // FIXME
			},
			'landcover-moss': {
				color: colors.moss, // FIXME
			},
			'landcover-shrubland': {
				color: colors.park, // same as land-vegetation
			},
			'landcover-snow': {
				color: colors.glacier,
			},
			'landcover-treecover': {
				color: colors.wood,
			},
			'landcover-wetland': {
				color: colors.wetland,
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
				image: 'basics:pattern-warning',
			},
			'site-hospital': {
				color: colors.hospital,
				opacity: 0.1,
			},
			'site-prison': {
				color: colors.prison,
				image: 'basics:pattern-striped',
				opacity: 0.1,
			},
			'site-construction': {
				color: colors.construction,
				image: 'basics:pattern-hatched_thin',
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

			// faux bridges
			'bridge-{street,way}-*:bridge': {
				lineCap: 'butt',
				lineJoin: 'round',
				color: colors.land.darken(0.02),
				fillAntialias: true,
				opacity: 0.5,
			},
			'bridge-street-motorway:bridge': {
				size: { '5': 0, '6': 3, '10': 7, '14': 7, '16': 20, '18': 53, '19': 118, '20': 235 }
			},
			'bridge-street-trunk:bridge': {
				size: { '7': 0, '8': 3, '10': 6, '14': 8, '16': 17, '18': 50, '19': 104, '20': 202 }
			},
			'bridge-street-primary:bridge': {
				size: { '8': 0, '9': 1, '10': 6, '14': 8, '16': 17, '18': 50, '19': 104, '20': 202 }
			},
			'bridge-street-secondary:bridge': {
				size: { '11': 3, '14': 7, '16': 11, '18': 42, '19': 95, '20': 193 },
				opacity: { '11': 0, '12': 1 }
			},
			'bridge-street-motorway-link:bridge': {
				minzoom: 12,
				size: { '12': 3, '14': 4, '16': 10, '18': 20, '20': 56 }
			},
			'bridge-street-{trunk,primary,secondary}-link:bridge': {
				minzoom: 13,
				size: { '12': 3, '14': 4, '16': 10, '18': 20, '20': 56 }
			},
			'bridge-street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*:bridge': {
				size: { '12': 3, '14': 4, '16': 8, '18': 36, '19': 90, '20': 179 },
				opacity: { '12': 0, '13': 1 }
			},
			'bridge-street-{service,track}:bridge': {
				size: { '14': 3, '16': 6, '18': 25, '19': 67, '20': 134 },
				opacity: { '14': 0, '15': 1 }
			},
			'bridge-way-*:bridge': {
				size: { '15': 0, '16': 7, '18': 10, '19': 17, '20': 31 },
				minzoom: 15
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

			// tracks
			'{bridge-,tunnel-,}street-track:outline': {
				size: { 14: 2, 16: 4, 18: 18, 19: 48, 20: 96 },
				opacity: { 14: 0, 15: 1 },
			},
			'{bridge-,tunnel-,}street-track': {
				size: { 14: 1, 16: 3, 18: 16, 19: 44, 20: 88 },
				opacity: { 14: 0, 15: 1 },
			},

			// service
			'{bridge-,tunnel-,}street-service:outline': {
				size: { 14: 1, 16: 3, 18: 12, 19: 32, 20: 48 },
				opacity: { 15: 0, 16: 1 },
				color: colors.streetbg.lighten(0.3),
			},
			'{bridge-,tunnel-,}street-service': {
				size: { 14: 1, 16: 2, 18: 10, 19: 28, 20: 40 },
				opacity: { 15: 0, 16: 1 },
				color: colors.street.darken(0.03),
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
				color: colors.foot.darken(0.1).saturate(-0.5),
			},
			'tunnel-way-{footway,path,steps}': {
				color: colors.foot.darken(0.02).saturate(-0.5),
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
				color: colors.cycle.darken(0.1).saturate(-0.5),
			},
			'tunnel-way-cycleway': {
				color: colors.cycle.darken(0.02).saturate(-0.5),
				lineDasharray: [1, 0.2],
			},

			// cycle streets overlay
			'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}-bicycle': {
				lineJoin: 'round',
				lineCap: 'round',
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
				minzoom: 8,
				size: { 8: 1, 13: 1, 15: 1, 20: 14 },
			},
			'{tunnel-,bridge-,}transport-{rail,lightrail}': {
				color: colors.rail.lighten(0.25),
				minzoom: 14,
				size: { 14: 0, 15: 1, 20: 10 },
				lineDasharray: [2, 2],
			},

			// rail-service, lightrail-service
			'{tunnel-,bridge-,}transport-{rail,lightrail}-service:outline': {
				color: colors.rail,
				minzoom: 14,
				size: { 14: 0, 15: 1, 16: 1, 20: 14 },
			},
			'{tunnel-,bridge-,}transport-{rail,lightrail}-service': {
				color: colors.rail.lighten(0.25),
				minzoom: 15,
				size: { 15: 0, 16: 1, 20: 10 },
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
				color: colors.label.rotateHue(-15).saturate(1).darken(0.05),
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
				color: colors.label.rotateHue(-30).saturate(1).darken(0.05),
			},
			'label-place-quarter': {
				minzoom: 13,
				size: { 13: 13 },
				textTransform: 'uppercase',
				color: colors.label.rotateHue(-40).saturate(1).darken(0.05),
			},
			'label-place-neighbourhood': {
				minzoom: 14,
				size: { 14: 12 },
				textTransform: 'uppercase',
				color: colors.label.rotateHue(-50).saturate(1).darken(0.05),
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
				image: 'basics:marking-arrow',
				opacity: { 16: 0, 17: 0.4, 20: 0.4 },
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
				image: 'basics:icon-airport',
				iconSize: { 12: 0.5, 14: 1 },
			},
			'symbol-transit-airfield': {
				minzoom: 13,
				image: 'basics:icon-airfield',
				iconSize: { 13: 0.5, 15: 1 },
			},
			'symbol-transit-station': {
				minzoom: 13,
				image: 'basics:icon-rail',
				iconSize: { 13: 0.5, 15: 1 },
			},
			'symbol-transit-lightrail': {
				minzoom: 14,
				image: 'basics:icon-rail_light',
				iconSize: { 14: 0.5, 16: 1 },
			},
			'symbol-transit-subway': {
				minzoom: 14,
				image: 'basics:icon-rail_metro',
				iconSize: { 14: 0.5, 16: 1 },
			},
			'symbol-transit-tram': {
				minzoom: 15,
				image: 'basics:transport-tram',
				iconSize: { 15: 0.5, 17: 1 },
			},
			'symbol-transit-bus': {
				minzoom: 16,
				image: 'basics:icon-bus',
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
					'arts_centre', 'basics:icon-art_gallery',
					'atm', 'basics:icon-atm',
					'bank', 'basics:icon-bank',
					'bar', 'basics:icon-bar',
					'bench', 'basics:icon-bench',
					'bicycle_rental', 'basics:icon-bicycle_share',
					'biergarten', 'basics:icon-beergarden',
					'cafe', 'basics:icon-cafe',
					'car_rental', 'basics:icon-car_rental',
					'car_sharing', 'basics:icon-car_rental',
					'car_wash', 'basics:icon-car_wash',
					'cinema', 'basics:icon-cinema',
					//'clinic', 'basics:icon-clinic',
					'college', 'basics:icon-college',
					'community_centre', 'basics:icon-community',
					//'courthouse', 'basics:icon-courthouse',
					'dentist', 'basics:icon-dentist',
					'doctors', 'basics:icon-doctor',
					'dog_park', 'basics:icon-dog_park',
					'drinking_water', 'basics:icon-drinking_water',
					'embassy', 'basics:icon-embassy',
					'fast_food', 'basics:icon-fast_food',
					'fire_station', 'basics:icon-fire_station',
					//'food_court', 'basics:icon-food_court',
					'fountain', 'basics:icon-fountain',
					'grave_yard', 'basics:icon-cemetery',
					'hospital', 'basics:icon-hospital',
					'hunting_stand', 'basics:icon-huntingstand',
					'library', 'basics:icon-library',
					'marketplace', 'basics:icon-marketplace',
					'nightclub', 'basics:icon-nightclub',
					'nursing_home', 'basics:icon-nursinghome',
					'pharmacy', 'basics:icon-pharmacy',
					'place_of_worship', 'basics:icon-place_of_worship',
					'playground', 'basics:icon-playground',
					'police', 'basics:icon-police',
					'post_box', 'basics:icon-postbox',
					'post_office', 'basics:icon-post',
					'prison', 'basics:icon-prison',
					'pub', 'basics:icon-beer',
					//'public_building', 'basics:icon-public_building',
					'recycling', 'basics:icon-recycling',
					'restaurant', 'basics:icon-restaurant',
					'school', 'basics:icon-school',
					'shelter', 'basics:icon-shelter',
					'telephone', 'basics:icon-telephone',
					'theatre', 'basics:icon-theatre',
					'toilets', 'basics:icon-toilet',
					'townhall', 'basics:icon-town_hall',
					//'university', 'basics:icon-university',
					'vending_machine', 'basics:icon-vendingmachine',
					'veterinary', 'basics:icon-veterinary',
					'waste_basket', 'basics:icon-waste_basket',
					'',
				],
			},
			'poi-leisure': {
				image: ['match',
					['get', 'leisure'],
					'golf_course', 'basics:icon-golf',
					'ice_rink', 'basics:icon-icerink',
					'pitch', 'basics:icon-pitch',
					//'sports_centre', 'basics:icon-sports_centre',
					'stadium', 'basics:icon-stadium',
					'swimming_pool', 'basics:icon-swimming',
					'water_park', 'basics:icon-waterpark',
					'basics:icon-sports',
				],
			},
			'poi-tourism': {
				image: ['match',
					['get', 'tourism'],
					//'alpine_hut', 'basics:icon-alpine_hut',
					//'bed_and_breakfast', 'basics:icon-bed_and_breakfast',
					//'camp_site', 'basics:icon-camp_site',
					//'caravan_site', 'basics:icon-caravan_site',
					'chalet', 'basics:icon-chalet',
					//'guest_house', 'basics:icon-guest_house',
					//'hostel', 'basics:icon-hostel',
					//'hotel', 'basics:icon-hotel',
					'information', 'basics:transport-information',
					//'motel', 'basics:icon-motel',
					'picnic_site', 'basics:icon-picnic_site',
					//'theme_park', 'basics:icon-theme_park',
					'viewpoint', 'basics:icon-viewpoint',
					'zoo', 'basics:icon-zoo',
					'',
				],
			},
			'poi-shop': {
				image: ['match',
					['get', 'shop'],
					'alcohol', 'basics:icon-alcohol_shop',
					'bakery', 'basics:icon-bakery',
					'beauty', 'basics:icon-beauty',
					'beverages', 'basics:icon-beverages',
					//'bicycle', 'basics:icon-bicycle',
					'books', 'basics:icon-books',
					'butcher', 'basics:icon-butcher',
					//'car', 'basics:icon-car',
					'chemist', 'basics:icon-chemist',
					'clothes', 'basics:icon-clothes',
					//'computer', 'basics:icon-computer',
					//'convinience', 'basics:icon-convinience',
					//'department_store', 'basics:icon-department_store',
					'doityourself', 'basics:icon-doityourself',
					'dry_cleaning', 'basics:icon-drycleaning',
					'florist', 'basics:icon-florist',
					'furniture', 'basics:icon-furniture',
					'garden_centre', 'basics:icon-garden_centre',
					'general', 'basics:icon-shop',
					'gift', 'basics:icon-gift',
					'greengrocer', 'basics:icon-greengrocer',
					'hairdresser', 'basics:icon-hairdresser',
					'hardware', 'basics:icon-hardware',
					'jewelry', 'basics:icon-jewelry_store',
					'kiosk', 'basics:icon-kiosk',
					'laundry', 'basics:icon-laundry',
					//'mall', 'basics:icon-mall',
					//'mobile_phone', 'basics:icon-mobile_phone',
					'newsagent', 'basics:icon-newsagent',
					'optican', 'basics:icon-optician',
					'outdoor', 'basics:icon-outdoor',
					'shoes', 'basics:icon-shoes',
					'sports', 'basics:icon-sports',
					'stationery', 'basics:icon-stationery',
					//'supermarket', 'basics:icon-supermarket',
					'toys', 'basics:icon-toys',
					'travel_agency', 'basics:icon-travel_agent',
					'video', 'basics:icon-video',
					'basics:icon-shop',
				],
			},
			'poi-man_made': {
				image: ['match',
					['get', 'man_made'],
					'lighthouse', 'basics:icon-lighthouse',
					'surveillance', 'basics:icon-surveillance',
					'tower', 'basics:icon-observation_tower',
					//'wastewater_plant', 'basics:icon-wastewater_plant',
					//'water_well', 'basics:icon-water_well',
					//'water_works', 'basics:icon-water_works',
					'watermill', 'basics:icon-watermill',
					'windmill', 'basics:icon-windmill',
					'',
				],
			},
			'poi-historic': {
				image: ['match',
					['get', 'historic'],
					//'archaelogical_site', 'basics:icon-archaelogical_site',
					'artwork', 'basics:icon-artwork',
					//'battlefield', 'basics:icon-battlefield',
					'castle', 'basics:icon-castle',
					//'fort', 'basics:icon-fort',
					//'memorial', 'basics:icon-memorial',
					'monument', 'basics:icon-monument',
					//'ruins', 'basics:icon-ruins',
					//'wayside_cross', 'basics:icon-wayside_cross',
					'wayside_shrine', 'basics:icon-shrine',
					'basics:icon-historic',
				],
			},
			'poi-emergency': {
				image: ['match',
					['get', 'emergency'],
					'defibrillator', 'basics:icon-defibrillator',
					'fire_hydrant', 'basics:icon-hydrant',
					'phone', 'basics:icon-emergency_phone',
					'',
				],
			},

			/*
			'poi-highway': {
				image: ['match',
					['get', 'highway'],
					//'emergency_access_point', 'basics:icon-emergency_access_point',
					''
				]
			},
			'poi-office': {
				image: ['match',
					['get', 'office'],
					//'diplomatic', 'basics:icon-diplomatic',
					''
				]
			},
			*/
		};
	}
}

import Baker from '../lib/baker.js';

export default function Colorful() {
	const stylemaker = new Baker('graybeard');

	stylemaker.addFonts({
		regular: 'noto_sans_regular',
		bold: 'noto_sans_bold',
	})

	stylemaker.addColors({
		land: '#F2F2F2',
		water: '#D9D9D9',
		glacier: '#FFFFFF',
		wood: '#787878',
		grass: '#F9F9F9',
		park: '#F9F9F9',
		street: '#FFFFFF',
		streetbg: '#CCCCCC',
		motorway: '#D4D4D4',
		motorwaybg: '#B0B0B0',
		trunk: '#E4E4E4',
		trunkbg: '#B0B0B0',
		building: '#DBDBDB',
		boundary: '#B8B8B8',
		disputed: '#C4C4C4',
		residential: '#E6E6E633',
		commercial: '#E6E6E633',
		industrial: '#E6E6E633',
		foot: '#F5F5F5',
		label: '#3B3B3B',
		labelHalo: '#FFFFFFCC',
		shield: '#FFFFFF',
		agriculture: '#F9F9F9',
		rail: '#BABABA',
		subway: '#B8B8B8',
		cycle: '#F7F7F7',
		waste: '#F9F9F9',
		burial: '#F9F9F9',
		sand: '#F2F2F2',
		rock: '#E3E3E3',
		leisure: '#E6E6E633',
		wetland: '#F9F9F9',
		danger: '#808080',
		prison: '#E6E6E633',
		parking: '#E6E6E633',
		construction: '#E6E6E633',
		education: '#E6E6E633',
		hospital: '#E6E6E633',
	})

	stylemaker.setLayerStyle(({ colors, fonts }) => ({

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
			icon: 'pattern-dark-warning-12',
		},
		'site-hospital': {
			color: colors.hospital,
			opacity: 0.1,
		},
		'site-prison': {
			color: colors.prison,
			icon: 'pattern-dark-striped-12',
			opacity: 0.1,
		},
		'site-construction': {
			color: colors.construction,
			icon: 'pattern-dark-hatched-thin-12',
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
			color: colors.building,
			opacity: { 14: 0, 15: 1 },
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
		'{bridge-street,tunnel-street,street}-motorway:outline': {
			size: { 5: 0, 6: 2, 10: 5, 14: 5, 16: 14, 18: 38, 19: 84, 20: 168 },
		},
		'{bridge-street,tunnel-street,street}-motorway': {
			size: { 5: 0, 6: 1, 10: 4, 14: 4, 16: 12, 18: 36, 19: 80, 20: 160 },
			opacity: { 5: 0, 6: 1 },
		},

		// trunk
		'{bridge-street,tunnel-street,street}-trunk:outline': {
			size: { 7: 0, 8: 2, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
		},
		'{bridge-street,tunnel-street,street}-trunk': {
			size: { 7: 0, 8: 1, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
			opacity: { 7: 0, 8: 1 },
		},

		// primary
		'{bridge-street,tunnel-street,street}-primary:outline': {
			size: { 8: 0, 9: 1, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
		},
		'{bridge-street,tunnel-street,street}-primary': {
			size: { 8: 0, 9: 2, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
			opacity: { 8: 0, 9: 1 },
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
		},
		'{bridge-street,tunnel-street,street}-motorway-link': {
			minzoom: 12,
			size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
		},
		'{bridge-street,tunnel-street,street}-{trunk,primary,secondary}-link:outline': {
			minzoom: 13,
			size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
		},
		'{bridge-street,tunnel-street,street}-{trunk,primary,secondary}-link': {
			minzoom: 13,
			size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
		},

		// minor streets
		'{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*:outline': {
			size: { 12: 2, 14: 3, 16: 6, 18: 26, 19: 64, 20: 128 },
			opacity: { 12: 0, 13: 1 },
		},
		'{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*': {
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
		'{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}-bicycle': {
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
			color: colors.foot.lighten(0.02).hex() + 'C0', // make 75% opaque
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
	}))

	return stylemaker.getBaker();
}

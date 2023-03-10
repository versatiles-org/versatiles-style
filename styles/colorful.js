// colors

const color = require("color");

const $land           = "#f9f4ee";
const $water          = "#beddf3";
const $glacier        = "#ffffff";
const $wood           = "#66aa44";
const $grass          = "#d8e8c8";
const $park           = "#d9d9a5";
const $street         = "#ffffff";
const $streetbg       = "#cfcdca";
const $motorway       = "#ffcc88";
const $motorwaybg     = "#e9ac77";
const $trunk          = "#ffeeaa";
const $trunkbg        = "#e9ac77"; // make different?
const $buildingbg     = "#dfdbd7";
const $building       = "#f2eae2";
const $boundary       = "#a6a6c8"; // #b5b5c9";
const $disputed       = "#bebccf";
const $residential    = "#eae6e133";
const $commercial     = "#f7deed40";
const $industrial     = "#fff4c255";
const $foot           = "#fbebff";
const $label          = "#333344";
const $labelHalo      = "#ffffffcc";
const $agriculture    = "#f0e7d1";
const $rail           = "#b1bbc4";
const $subway         = "#a6b8c7";
const $cycle          = "#eff9ff";
const $waste          = "#dbd6bd";
const $burial         = "#dddbca";
const $sand           = "#fafaed";
const $rock           = "#e0e4e5";
const $leisure        = "#e7edde";
const $wetland        = "#d3e6db";

const $site           = "#ff00ff"; // "#ebe8e6";

const $danger         = "#ff0000";
const $prison         = "#fdf2fc";
const $parking        = "#ebe8e6";
const $construction   = "#a9a9a9";
const $education      = "#ffff80"; // 10% opacity
const $hospital       = "#ff6666"; // 10% opacity

exports = module.exports = {
	// background

	"background": {
		color: $land,
	},

	// boundary

	"boundary-{country,state}:outline": {
		color: color($land).lighten(0.1).hex(),
		lineBlur: 1,
		lineCap: "round",
		lineJoin: "round",
	},
	"boundary-{country,state}": {
		color: $boundary,
		lineCap: "round",
		lineJoin: "round",
	},
	"boundary-country{-disputed,}:outline": {
		size: { 2: 0, 3: 2, 10: 8, },
		opacity: 0.75,
		color: color($land).lighten(0.05).hex(),
	},
	"boundary-country{-disputed,}": {
		size: { 2: 0, 3: 1, 10: 4, },
	},
	"boundary-country-disputed": {
		color: $disputed,
		lineDasharray: [ 2, 1 ],
		lineCap: "square",
	},
	"boundary-state:outline": {
		size: { 7: 0, 8: 2, 10: 4, },
		opacity: 0.75,
	},
	"boundary-state": {
		size: { 7: 0, 8: 1, 10: 2, },
	},

	// water

	"water-*": {
		color: $water,
		lineCap: "round",
		lineJoin: "round",
	},
	"water-area": {
		opacity: { 4: 0, 6: 1 },
	},
	"water-area-*": {
		opacity: { 4: 0, 6: 1 },
	},
	"water-{pier,dam}-area": {
		color: $land,
		opacity: { 12: 0, 13: 1 },
	},

	"water-river": {
		lineWidth: { 9: 0, 10: 3, 15: 5, 17: 9, 18: 20, 20: 60 },
	},
	"water-canal": {
		lineWidth: { 9: 0, 10: 2, 15: 4, 17: 8, 18: 17, 20: 50 },
	},
	"water-stream": {
		lineWidth: { 13: 0, 14: 1, 15: 2, 17: 6, 18: 12, 20: 30 },
	},
	"water-ditch": {
		lineWidth: { 14: 0, 15: 1, 17: 4, 18: 8, 20: 20 },
	},

	// land

	"land-*": {
		color: $land,
	},
	"land-glacier": {
		color: $glacier,
	},
	"land-forest": {
		color: $wood,
		opacity: { 7: 0, 8: 0.1 },
	},
	"land-grass": {
		color: $grass,
		opacity: { 11: 0, 12: 1 },
	},
	"land-{park,garden,vegetation}": {
		color: $park,
		opacity: { 11: 0, 12: 1 },
	},
	"land-agriculture": {
		color: $agriculture,
		opacity: { 10: 0, 11: 1 },
	},

	"land-residential": {
		color: $residential,
		opacity: { 10: 0, 11: 1 },
	},
	"land-commercial": {
		color: $commercial,
		opacity: { 10: 0, 11: 1 },
	},
	"land-industrial": {
		color: $industrial,
		opacity: { 10: 0, 11: 1 },
	},

	"land-waste": {
		color: $waste,
		opacity: { 10: 0, 11: 1 },
	},
	"land-burial": {
		color: $burial,
		opacity: { 13: 0, 14: 1 },
	},
	"land-leisure": {
		color: $leisure,
	},
	"land-rock": {
		color: $rock,
	},
	"land-sand": {
		color: $sand,
	},
	"land-wetland": {
		color: $wetland,
	},

	// site

	"site-dangerarea": {
		color: $danger,
		fillOutlineColor: $danger,
		opacity: 0.3,
		icon: "pattern-dark-hatched-thick-12",
	},
	"site-hospital": {
		color: $hospital,
		opacity: 0.1,
	},
	"site-prison": {
		color: $prison,
		icon: "pattern-dark-diamonds-12",
		opacity: 0.1,
	},
	"site-construction": {
		color: $construction,
		icon: "pattern-dark-hatched-thin-12",
		opacity: 0.1,
	},
	"site-{university,college,school}": {
		color: $education,
		opacity: 0.1,
	},
	"site-{bicycleparking,parking}": {
		color: $parking,
	},

	// building

	"building:outline": {
		color: $buildingbg,
		opacity: { 14: 0, 15: 1 },
	},
	"building": {
		color: $building,
		opacity: { 14: 0, 15: 1 },
		fillTranslate: [ -2, -2 ],
	},

	// airport
	"airport-area": {
		color: $streetbg,
		opacity: 0.1,
	},
	"airport-{runway,taxiway}:outline": { // HERE
		color: $streetbg,
		lineJoin: "round",
	},
	"airport-{runway,taxiway}": {
		color: $street,
		lineJoin: "round",
	},
	"airport-runway:outline": {
		size: { 11: 0, 12: 6, 13: 9, 14: 16, 15: 24, 16: 40, 17: 100, 18: 160, 20: 300 },
	},
	"airport-runway": {
		size: { 11: 0, 12: 5, 13: 8, 14: 14, 15: 22, 16: 38, 17: 98, 18: 158, 20: 298 },
		opacity: { 11:0, 12:1 },
	},
	"airport-taxiway:outline": {
		size: { 13: 0, 14: 2, 15: 10, 16: 14, 18: 20, 20: 40 },
	},
	"airport-taxiway": {
		size: { 13: 0, 14: 1, 15: 8, 16: 12, 18: 18, 20: 36 },
		opacity: { 13:0, 14:1 },
	},

	// bridge

	"bridge": {
		color: color($land).darken(0.02).hex(),
		fillAntialias: true,
		opacity: 0.8,
	},

	// street

	// colors and joins
	"{tunnel-,bridge-,}street-*:outline": {
		color: $streetbg,
		lineJoin: "round",
	},
	"{tunnel-,bridge-,}street-*": {
		color: $street,
		lineJoin: "round",
	},
	"tunnel-street-*:outline": {
		color: color($street).darken(0.13).hex(),
	},
	"tunnel-street-*": {
		color: color($street).darken(0.03).hex(),
	},
	"bridge-street-*:outline": {
		color: color($street).darken(0.15).hex(),
	},

	// line caps
	"{tunnel-,}{street,way}-*": {
		lineCap: "round",
	},
	"{tunnel-,}{street,way}-*:outline": {
		lineCap: "round",
	},
	"bridge-{street,way}-*": {
		lineCap: "butt",
	},
	"bridge-{street,way}-*:outline": {
		lineCap: "butt",
	},

	// special color: motorway
	"{bridge-,}street-motorway{-link,}:outline": {
		color: $motorwaybg,
	},
	"{bridge-,}street-motorway{-link,}": {
		color: $motorway,
	},
	"{bridge-,}street-{trunk,primary,secondary}{-link,}:outline": {
		color: $trunkbg,
	},
	"{bridge-,}street-{trunk,primary,secondary}{-link,}": {
		color: $trunk,
	},

	"tunnel-street-motorway{-link,}:outline": {
		color: color($motorwaybg).lighten(0.05).hex(),
		lineDasharray: [1, 0.3],
	},
	"tunnel-street-motorway{-link,}": {
		color: color($motorway).lighten(0.1).hex(),
		lineCap: "butt",
	},
	"tunnel-street-{trunk,primary,secondary}{-link,}:outline": {
		color: color($trunkbg).lighten(0.05).hex(),
		lineDasharray: [1, 0.3],
	},
	"tunnel-street-{trunk,primary,secondary}{-link,}": {
		color: color($trunk).lighten(0.1).hex(),
		lineCap: "butt",
	},

	// motorway
	"{bridge-street,tunnel-street,street}-motorway:outline": {
		size: { 5: 0, 6: 2, 10: 5, 14: 5, 16: 14, 18: 38, 19: 84, 20: 168 },
	},
	"{bridge-street,tunnel-street,street}-motorway": {
		size: { 5: 0, 6: 1, 10: 4, 14: 4, 16: 12, 18: 36, 19: 80, 20: 160 },
		opacity: { 5:0, 6:1 },
	},

	// trunk
	"{bridge-street,tunnel-street,street}-trunk:outline": {
		size: { 7: 0, 8: 2, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
	},
	"{bridge-street,tunnel-street,street}-trunk": {
		size: { 7: 0, 8: 1, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
		opacity: { 7:0, 8:1 },
	},

	// primary, z8+
	"{bridge-street,tunnel-street,street}-primary:outline": {
		size: { 8: 0, 9: 1, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
	},
	"{bridge-street,tunnel-street,street}-primary": {
		size: { 8: 0, 9: 2, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
		opacity: { 8:0, 9:1 },
	},

	// secondary
	"{bridge-street,tunnel-street,street}-secondary:outline": {
		size: { 11: 2, 14: 5, 16: 8, 18: 30, 19: 68, 20: 138 },
		opacity: { 11: 0, 12: 1 },
	},
	"{bridge-street,tunnel-street,street}-secondary": {
		size: { 11: 1, 14: 4, 16: 6, 18: 28, 19: 64, 20: 130 },
		opacity: { 11: 0, 12: 1 },
	},

	// links
	"{bridge-street,tunnel-street,street}-motorway-link:outline": {
		minzoom: 12,
		size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
//		opacity: { 12: 0, 13: 1 },
	},
	"{bridge-street,tunnel-street,street}-motorway-link": {
		minzoom: 12,
		size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
//		opacity: { 12: 0, 13: 1 },
	},

	"{bridge-street,tunnel-street,street}-{trunk,primary,secondary}-link:outline": {
		minzoom: 13,
		size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
//		opacity: { 13: 0, 14: 1 },
	},
	"{bridge-street,tunnel-street,street}-{trunk,primary,secondary}-link": {
		minzoom: 13,
		size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
//		opacity: { 13: 0, 14: 1 },
	},

	// minor streets
	"{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*:outline": {
		size: { 12: 2, 14: 3, 16: 6, 18: 26, 19: 64, 20: 128 },
		opacity: { 12: 0, 13: 1 },
	},
	"{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*": {
		size: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
		opacity: { 12: 0, 13: 1 },
	},

	// service and tracks
	"{bridge-street,tunnel-street,street}-{service,track}:outline": {
		size: { 14: 2, 16: 4, 18: 18, 19: 48, 20: 96 },
		opacity: { 14: 0, 15: 1 },
	},
	"{bridge-street,tunnel-street,street}-{service,track}": {
		size: { 14: 1, 16: 3, 18: 16, 19: 44, 20: 88 },
		opacity: { 14: 0, 15: 1 },
	},

	// ways, surface only
	"{bridge-,tunnel-,}way-*:outline": {
		size: { 15: 0, 16: 5, 18: 7, 19: 12, 20: 22 },
		minzoom: 15,
	},
	"{bridge-,tunnel-,}way-*": {
		size: { 15: 0, 16: 4, 18: 6, 19: 10, 20: 20 },
		minzoom: 15,
	},

	// foot
	"{bridge-,}way-{footway,path,steps}:outline": {
		color: color($foot).darken(0.1).hex(),
	},
	"{bridge-,}way-{footway,path,steps}": {
		color: color($foot).lighten(0.02).hex(),
	},
	"tunnel-way-{footway,path,steps}:outline": {
		color: color($foot).darken(0.1).desaturate(0.5).hex(),
	},
	"tunnel-way-{footway,path,steps}": {
		color: color($foot).darken(0.02).desaturate(0.5).hex(),
		lineDasharray: [ 1, 0.2 ],
	},

	// cycleway
	"{bridge-,}way-cycleway:outline": {
		color: color($cycle).darken(0.1).hex(),
	},
	"{bridge-,}way-cycleway": {
		color: $cycle,
	},
	"tunnel-way-cycleway:outline": {
		color: color($cycle).darken(0.1).desaturate(0.5).hex(),
	},
	"tunnel-way-cycleway": {
		color: color($cycle).darken(0.02).desaturate(0.5).hex(),
		lineDasharray: [ 1, 0.2 ],
	},

	// cycle streets
	"{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}-bicycle": {
		lineCap: "butt",

		color: $cycle,
	},

	"street-pedestrian": {
		size: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
		opacity: { 13: 0, 14: 1 },
		color: $foot,
	},
	"street-pedestrian-zone": {
		color: color($foot).lighten(0.02).hex()+"C0", // make 75% opaque
		opacity: { 14: 0, 15: 1 },
	},

	// rail
	"{tunnel-,bridge-,}transport-{rail,lightrail}:outline": {
		color: $rail,
		size: { 8: 1, 13: 1, 15: 3, 16: 4, 18: 8, 19: 11, 20: 14 },
	},
	"{tunnel-,bridge-,}transport-{rail,lightrail}": {
		color: color($rail).lighten(0.25).hex(),
		size: { 8: 1, 13: 1, 15: 2, 16: 3, 18: 6, 19: 8, 20: 10 },
		lineDasharray: [ 2, 2 ],
	},
	// subway
	"{tunnel-,bridge-,}transport-subway:outline": {
		color: $subway,
		size: { 11: 0, 12: 1, 15: 3, 16: 3, 18: 6, 19: 8, 20: 10 },
	},
	"{tunnel-,bridge-,}transport-subway": {
		color: color($subway).lighten(0.25).hex(),
		size: { 11: 0, 12: 1, 15: 2, 16: 2, 18: 5, 19: 6, 20: 8 },
		lineDasharray: [ 2, 2 ],
	},

	"{tunnel-,bridge-,}transport-{tram,narrowgauge,funicular,monorail}:outline": {
		minzoom: 15,
		color: $rail,
		size: { 15: 0, 16: 5, 18: 7, 20: 20 },
		lineDasharray: [ 0.1, 0.5 ],
	},
	"{tunnel-,bridge-,}transport-{tram,narrowgauge,funicular,monorail}": {
		minzoom: 13,
		size: { 13: 0, 16: 1, 17: 2, 18: 3, 20: 5 },
		color: $rail,
	},

	// bridge
	"{bridge-,}transport-rail:outline": {
		opacity: { 8: 0, 9: 1 },
	},
	"{bridge-,}transport-rail": {
		opacity: { 14: 0, 15: 1 },
	},
	"{bridge-,}transport-{lightrail,subway}:outline": {
		opacity: { 11: 0, 12: 1 },
	},
	"{bridge-,}transport-{lightrail,subway}": {
		opacity: { 14: 0, 15: 1 },
	},
	// tunnel
	"tunnel-transport-rail:outline": {
		opacity: { 8: 0, 9: 0.3 },
	},
	"tunnel-transport-rail": {
		opacity: { 14: 0, 15: 0.3 },
	},
	"tunnel-transport-{lightrail,subway}:outline": {
		opacity: { 11: 0, 12: 0.5 },
	},
	"tunnel-transport-{lightrail,subway}": {
		opacity: { 14: 0, 15: 1 },
	},

	// ferry
	"transport-ferry": {
		minzoom: 10,
		color: color($water).darken(0.1).hex(),
		size: { 10: 1, 13: 2, 14: 3, 16: 4, 17: 6 },
		opacity: { 10: 0, 11: 1 },
		lineDasharray: [ 1, 1 ],
	},

	// labels

	"label-boundary-*": {
		color: $label,
		font: "Noto Sans Bold",
		textTransform: "uppercase",
		textHaloColor: $labelHalo,
		textHaloWidth: 2,
		textHaloBlur: 1,
		textAnchor: "bottom",
	},
	"label-boundary-country-large": {
		minzoom: 2,
		size: { 2: 11, 5: 16 },
	},
	"label-boundary-country-medium": {
		minzoom: 3,
		size: { 3: 11, 5: 15 },
	},
	"label-boundary-country-small": {
		minzoom: 4,
		size: { 4: 11, 5: 14 },
	},

	"label-boundary-*:en": {
		color: $label,
		font: "Noto Sans Regular",
		textTransform: "uppercase",
		textHaloColor: $labelHalo,
		textHaloWidth: 2,
		textHaloBlur: 1,
		textAnchor: "top",
		textOffset: [0, 0.2],
		textPadding: 0,
		textOptional: true,
	},
	"label-boundary-country-large:en": {
		minzoom: 2,
		size: { 2: 8, 5: 13 },
	},
	"label-boundary-country-medium:en": {
		minzoom: 3,
		size: { 3: 8, 5: 12 },
	},
	"label-boundary-country-small:en": {
		minzoom: 4,
		size: { 4: 8, 5: 11 },
	},

	"label-boundary-state": {
		minzoom: 5,
		color: color($label).lighten(0.05).hex(),
		size: { 5: 8, 8: 12 },
	},
	"label-place-*": {
		color: color($label).rotate(-15).saturate(1).darken(0.05).hex(),
		font: "Noto Sans Regular",
		textHaloColor: $labelHalo,
		textHaloWidth: 2,
		textHaloBlur: 1,
	},
	"label-place-capital": {
		minzoom: 5,
		size: { 5: 12, 10: 16 },
	},
	"label-place-statecapital": {
		minzoom: 6,
		size: { 6: 11, 10: 15 },
	},
	"label-place-city": {
		minzoom: 7,
		size: { 7: 11, 10: 14 },
	},
	"label-place-town": {
		minzoom: 9,
		size: { 8: 11, 12: 14 },
	},
	"label-place-village": {
		minzoom: 11,
		size: { 9: 11, 12: 14 },
	},
	"label-place-hamlet": {
		minzoom: 13,
		size: { 10: 11, 12: 14 },
	},
	// all the city things
	"label-place-suburb": {
		minzoom: 11,
		size: { 11: 11, 13: 14 },
		textTransform: "uppercase",
		color: color($label).rotate(-30).saturate(1).darken(0.05).hex(),
	},
	"label-place-quarter": {
		minzoom: 13,
		size: { 13: 13 },
		textTransform: "uppercase",
		color: color($label).rotate(-40).saturate(1).darken(0.05).hex(),
	},
	"label-place-neighbourhood": {
		minzoom: 14,
		size: { 14: 12 },
		textTransform: "uppercase",
		color: color($label).rotate(-50).saturate(1).darken(0.05).hex(),
	},

	"label-motorway-shield": {
		color: "#ffffff",
		font: "Noto Sans Bold",
		textHaloColor: $motorway,
		textHaloWidth: 0.1,
		textHaloBlur: 1,
		symbolPlacement: "line",
		textAnchor: "center",
		minzoom: 14,
		size: { 14: 10, 18: 12, 20: 16 },
	},

	"label-street-*": {
		color: $label,
		font: "Noto Sans Regular",
		textHaloColor: $labelHalo,
		textHaloWidth: 2,
		textHaloBlur: 1,
		symbolPlacement: "line",
		textAnchor: "center",
		minzoom: 12,
		size: { 12: 10, 15: 13 },
	},

	"label-address-housenumber": {
		font: "Noto Sans Regular",
		textHaloColor: color($building).lighten(0.05).hex(),
		textHaloWidth: 2,
		textHaloBlur: 1,
		symbolPlacement: "point",
		textAnchor: "center",
		minzoom: 17,
		size: { 17: 8, 19: 10 },
		color: color($building).darken(0.3).hex(),
	},

	// pois
	"poi-*": {
		minzoom: 16,
		iconSize: { 16: 0, 17: 0.73, 18: 1 },
		symbolPlacement: "point",
		opacity: 0.3,
		iconOptional: true,
	},
	"poi-amenity-police": {
		icon: "icon-dark-police-15",
	},
	"poi-amenity-fire_station": {
		icon: "icon-dark-fire-station-15",
	},
	"poi-amenity-post_office": {
		icon: "icon-dark-post-15",
	},
	"poi-amenity-telephone": {
		icon: "icon-dark-telephone-15",
	},
	"poi-amenity-library": {
		icon: "icon-dark-library-15",
	},
	"poi-amenity-townhall": {
		icon: "icon-dark-town-hall-15",
	},
	"poi-amenity-courthouse": {
		icon: "extra-dark-justice-15",
	},
	"poi-amenity-prison": {
		icon: "icon-dark-prison-15",
	},
	"poi-amenity-embassy": {
		icon: "icon-dark-embassy-15",
	},
	"poi-amenity-community_centre": {
		icon: "extra-dark-community-15",
	},
	"poi-amenity-arts_centre": {
		icon: "icon-dark-art-gallery-15",
	},
	"poi-amenity-grave_yard": {
		icon: "icon-dark-cemetery-15",
	},
	"poi-amenity-marketplace": {
		icon: "icon-dark-shop-15",
	},
	"poi-amenity-recycling": {
		icon: "icon-dark-recycling-15",
	},
	"poi-amenity-university": {
		icon: "icon-dark-college-15",
	},
	"poi-amenity-school": {
		icon: "icon-dark-school-15",
	},
	"poi-amenity-college": {
		icon: "icon-dark-college-15",
	},
	"poi-amenity-public_building": {
		icon: "icon-dark-town-hall-15",
	},
	"poi-amenity-pharmacy": {
		icon: "icon-dark-pharmacy-15",
	},
	"poi-amenity-hospital": {
		icon: "icon-dark-hospital-15",
	},
	"poi-amenity-clinic": {
		icon: "icon-dark-hospital-15",
	},
	"poi-amenity-doctors": {
		icon: "icon-dark-doctor-15",
	},
	"poi-amenity-veterinary": {
		icon: "icon-dark-veterinary-15",
	},
	"poi-amenity-theatre": {
		icon: "icon-dark-theatre-15",
	},
	"poi-amenity-cinema": {
		icon: "icon-dark-cinema-15",
	},
	"poi-amenity-restaurant": {
		icon: "icon-dark-restaurant-15",
	},
	"poi-amenity-fast_food": {
		icon: "icon-dark-fast-food-15",
	},
	"poi-amenity-cafe": {
		icon: "icon-dark-cafe-15",
	},
	"poi-amenity-pub": {
		icon: "icon-dark-beer-15",
	},
	"poi-amenity-bar": {
		icon: "icon-dark-bar-15",
	},
	"poi-amenity-biergarten": {
		icon: "extra-dark-beergarden-15",
	},
	"poi-amenity-shelter": {
		icon: "icon-dark-shelter-15",
	},
	"poi-amenity-car_rental": {
		icon: "icon-dark-car-rental-15",
	},
	"poi-amenity-car_wash": {
		icon: "extra-dark-car-wash-15",
	},
	"poi-amenity-car_sharing": {
		icon: "icon-dark-car-rental-15",
	},
	"poi-amenity-bicycle_rental": {
		icon: "icon-dark-bicycle-share-15",
	},
	"poi-amenity-bank": {
		icon: "icon-dark-bank-15",
	},
	"poi-amenity-atm": {
		icon: "extra-dark-atm-15",
	},
	"poi-amenity-toilets": {
		icon: "icon-dark-toilet-15",
	},
	"poi-amenity-bench": {
		icon: "extra-dark-bench-15",
	},
	"poi-amenity-drinking_water": {
		icon: "icon-dark-drinking-water-15",
	},
	"poi-amenity-fountain": {
		icon: "extra-dark-fountain-15",
	},
	"poi-amenity-waste_basket": {
		icon: "icon-dark-waste-basket-15",
	},
	"poi-amenity-place_of_worship": {
		icon: "icon-dark-place-of-worship-15",
	},
	"poi-amenity-playground": {
		icon: "icon-dark-playground-15",
	},
	"poi-amenity-dog_park": {
		icon: "icon-dark-dog-park-15",
	},
	"poi-leisure-sports_centre": {
		icon: "icon-dark-fitness-centre-15",
	},
	"poi-leisure-pitch": {
		icon: "icon-dark-pitch-15",
	},
	"poi-leisure-swimming_pool": {
		icon: "icon-dark-swimming-15",
	},
	"poi-leisure-golf_course": {
		icon: "icon-dark-golf-15",
	},
	"poi-leisure-stadium": {
		icon: "icon-dark-stadium-15",
	},
	"poi-tourism-hotel": {
		icon: "icon-dark-lodging-15",
	},
	"poi-tourism-motel": {
		icon: "icon-dark-lodging-15",
	},
	"poi-tourism-bed_and_breakfast": {
		icon: "icon-dark-lodging-15",
	},
	"poi-tourism-guest_house": {
		icon: "icon-dark-lodging-15",
	},
	"poi-tourism-hostel": {
		icon: "icon-dark-lodging-15",
	},
	"poi-tourism-chalet": {
		icon: "extra-dark-chalet-15",
	},
	"poi-tourism-camp_site": {
		icon: "icon-dark-campsite-15",
	},
	"poi-tourism-alpine_hut": {
		icon: "extra-dark-chalet-15",
	},
	"poi-tourism-caravan_site": {
		icon: "icon-dark-camp-site-15",
	},
	"poi-tourism-information": {
		icon: "icon-dark-information-15",
	},
	"poi-tourism-picnic_site": {
		icon: "icon-dark-picnic-site-15",
	},
	"poi-tourism-viewpoint": {
		icon: "icon-dark-viewpoint-15",
	},
	"poi-tourism-zoo": {
		icon: "icon-dark-zoo-15",
	},
	"poi-tourism-theme_park": {
		icon: "icon-dark-amusement-park-15",
	},
	"poi-shop-supermarket": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-bakery": {
		icon: "icon-dark-bakery-15",
	},
	"poi-shop-kiosk": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-mall": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-department_store": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-general": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-convinience": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-clothes": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-florist": {
		icon: "icon-dark-florist-15",
	},
	"poi-shop-chemist": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-books": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-butcher": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-shoes": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-alcohol": {
		icon: "icon-dark-alcohol-shop-15",
	},
	"poi-shop-beverages": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-optican": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-jewelry": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-gift": {
		icon: "icon-dark-gift-15",
	},
	"poi-shop-sports": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-stationery": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-outdoor": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-mobile_phone": {
		icon: "icon-dark-mobile-phone-15",
	},
	"poi-shop-toys": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-newsagent": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-greengrocer": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-beauty": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-video": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-car": {
		icon: "icon-dark-car-15",
	},
	"poi-shop-bicycle": {
		icon: "icon-dark-bicycle-15",
	},
	"poi-shop-doityourself": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-hardware": {
		icon: "icon-dark-hardware-15",
	},
	"poi-shop-furniture": {
		icon: "icon-dark-furniture-15",
	},
	"poi-shop-computer": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-garden_centre": {
		icon: "icon-dark-garden-centre-15",
	},
	"poi-shop-hairdresser": {
		icon: "icon-dark-hairdresser-15",
	},
	"poi-shop-travel_agency": {
		icon: "icon-dark-shop-15",
	},
	"poi-shop-laundry": {
		icon: "icon-dark-laundry-15",
	},
	"poi-shop-dry_cleaning": {
		icon: "icon-dark-shop-15",
	},
	"poi-man_made-tower": {
		icon: "icon-dark-observation-tower-15",
	},
	"poi-man_made-windmill": {
		icon: "icon-dark-windmill-15",
	},
	"poi-man_made-lighthouse": {
		icon: "icon-dark-lighthouse-15",
	},
	"poi-man_made-water_well": {
		icon: "icon-dark-drinking-water-15",
	},
	"poi-man_made-watermill": {
		icon: "icon-dark-watermill-15",
	},
	"poi-historic-monument": {
		icon: "icon-dark-monument-15",
	},
	"poi-historic-memorial": {
		icon: "icon-dark-historic-15",
	},
	"poi-historic-artwork": {
		icon: "icon-dark-historic-15",
	},
	"poi-historic-castle": {
		icon: "icon-dark-castle-15",
	},
	"poi-historic-ruins": {
		icon: "icon-dark-historic-15",
	},
	"poi-historic-archaelogical_site": {
		icon: "icon-dark-historic-15",
	},
	"poi-historic-wayside_cross": {
		icon: "icon-dark-historic-15",
	},
	"poi-historic-wayside_shrine": {
		icon: "icon-dark-historic-15",
	},
	"poi-historic-battlefield": {
		icon: "icon-dark-historic-15",
	},
	"poi-historic-fort": {
		icon: "icon-dark-historic-15",
	},
	"poi-emergency-phone": {
		icon: "icon-dark-emergency-phone-15",
	},
	"poi-emergency-defibrillator": {
		icon: "icon-dark-defibrillator-15",
	},
	"poi-office-diplomatic": {
		icon: "icon-dark-embassy-15",
	},


};

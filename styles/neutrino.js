// colors

const color = require("color");

const $land        = "#f6f0f6";
const $water       = "#cbd2df";
const $grass       = "#e7e9e5";
const $wood        = "#d9e3d9"; // #dee0dc";
const $agriculture = "#f8eeee"; // "#e9e1e1";
const $site        = "#ebe8e6";
const $building    = "#dfdad7"; // "#e0d9d7";
const $street      = "#ffffff";
const $boundary    = "#e6ccd8";
const $foot        = "#fef8ff"; //#e9e5f4";
const $rail        = "#e8d5e0";

exports = module.exports = {
	"background": {
		color: $land,
	},
	"boundary-{country,state}": {
		color: $boundary,
	},
	"boundary-country:outline": {
		size: { 2: 2, 10: 6, },
		opacity: { 2: 0, 4: 0.3 },
		color: color($land).lighten(0.05).hex(),
		lineBlur: 1,
	},
	"boundary-country": {
		size: { 2: 1, 10: 4, },
		opacity: { 2: 0, 4: 1 },
	},
	"boundary-state:outline": {
		size: { 7: 3, 10: 5, },
		opacity: { 7: 0, 8: 0.3 },
		color: color($land).lighten(0.05).hex(),
		lineBlur: 1,
	},
	"boundary-state": {
		size: { 7: 2, 10: 3, },
		opacity: { 7: 0, 8: 1 },
		lineDasharray: [0, 1.5, 1, 1.5],
		lineCap: "round",
		lineJoin: "round",
	},
	"water-*": {
		color: $water,
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
	"land-*": {
		color: $land,
	},
	"land-forest": {
		color: $wood,
		opacity: { 7: 0, 8: 1 },
	},
	"land-{grass,park,garden,vegetation}": {
		color: $grass,
		opacity: { 11: 0, 12: 1 },
	},
	"land-agriculture": {
		color: $agriculture,
		opacity: { 10: 0, 11: 1 },
	},
	"land-{commercial,industrial,residential}": {
		color: color($land).darken(0.03).hex(),
		opacity: { 10: 0, 11: 1 },
	},
	"site-{bicycleparking,parking}": {
		color: $site,
	},
	"building": {
		color: $building,
		opacity: { 14: 0, 15: 1 },
	},
	"bridge": {
		color: color($land).darken(0.01).hex(),
	},
	"{tunnel-,bridge-,}street-*": {
		color: $street,
	},
	"{tunnel-,}street-*:outline": {
		color: color($street).darken(0.1).hex(),
	},
	"tunnel-street:outline": {
		lineDasharray: [ 1, 1 ],
	},
	"bridge-street-*:outline": {
		color: color($street).darken(0.15).hex(),
	},
	// motorway
	"{bridge-street,tunnel-street,street}-motorway:outline": {
		size: { 5: 2, 15: 14 },
		opacity: { 5: 0, 6: 1 },
	},
	"{bridge-street,tunnel-street,street}-motorway": {
		size: { 5: 1, 15: 10 },
		opacity: { 5: 0, 6: 1 },
	},
	"{bridge-street,tunnel-street,street}-motorway-link:outline": {
		size: { 5: 2, 15: 9 },
		opacity: { 5: 0, 6: 1 },
	},
	"{bridge-street,tunnel-street,street}-motorway-link": {
		size: { 5: 1, 15: 7 },
		opacity: { 5: 0, 6: 1 },
	},
	// trunk
	"{bridge-street,tunnel-street,street}-trunk:outline": {
		size: { 7: 2, 15: 11 },
		opacity: { 7: 0, 8: 1 },
	},
	"{bridge-street,tunnel-street,street}-trunk": {
		size: { 7: 1, 15: 9 },
		opacity: { 7: 0, 8: 1 },
	},
	"{bridge-street,tunnel-street,street}-trunk-link:outline": {
		size: { 7: 2, 15: 11 },
		opacity: { 7: 0, 8: 1 },
	},
	"{bridge-street,tunnel-street,street}-trunk-link": {
		size: { 7: 1, 15: 9 },
		opacity: { 7: 0, 8: 1 },
	},
	// primary
	"{bridge-street,tunnel-street,street}-primary:outline": {
		size: { 8: 2, 15: 10 },
		opacity: { 8: 0, 9: 1 },
	},
	"{bridge-street,tunnel-street,street}-primary": {
		size: { 8: 1, 15: 8 },
		opacity: { 8: 0, 9: 1 },
	},
	"{bridge-street,tunnel-street,street}-primary-link": {
		size: { 8: 1, 15: 7 },
		opacity: { 8: 0, 9: 1 },
	},
	// secondary
	"{bridge-street,tunnel-street,street}-secondary:outline": {
		size: { 11: 2, 15: 9 },
		opacity: { 11: 0, 12: 1 },
	},
	"{bridge-street,tunnel-street,street}-secondary": {
		size: { 11: 1, 15: 7 },
		opacity: { 11: 0, 12: 1 },
	},
	"{bridge-street,tunnel-street,street}-secondary-link:outline": {
		size: { 11: 2, 15: 8 },
		opacity: { 11: 0, 12: 1 },
	},
	"{bridge-street,tunnel-street,street}-secondary-link": {
		size: { 11: 1, 15: 6 },
		opacity: { 11: 0, 12: 1 },
	},
	// minor streets
	"{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,living_street,pedestrian}:outline": {
		size: { 12: 2, 15: 8 },
		opacity: { 12: 0, 13: 1 },
	},
	"{bridge-street,tunnel-street,street}-{tertiary,tertiary-link,unclassified,residential,living_street,pedestrian}": {
		size: { 12: 1, 15: 6 },
		opacity: { 12: 0, 13: 1 },
	},
	// service and tracks
	"{bridge-street,tunnel-street,street}-{service,track}:outline": {
		size: { 14: 2, 15: 6 },
		opacity: { 14: 0, 15: 1 },
	},
	"{bridge-street,tunnel-street,street}-{service,track}": {
		size: { 14: 1, 15: 4 },
		opacity: { 14: 0, 15: 1 },
	},
	// ways
	"{bridge-way,tunnel-way,way}-*:outline": {
		size: { 13: 0, 15: 3 },
		opacity: { 14: 0, 15: 1 },
		color: color($foot).darken(0.05).hex(),
	},
	"{bridge-way,tunnel-way,way}-*": {
		size: { 13: 0, 15: 2 },
		opacity: { 14: 0, 15: 1 },
		color: $foot,
	},
	"{bridge-street,tunnel-street,street}-pedestrian": {
		size: { 13: 1, 15: 3 },
		opacity: { 13: 0, 14: 1 },
		color: $foot,
	},
	"street-pedestrian-zone": {
		color: $foot,
		opacity: { 14: 0, 15: 1 },
	},
	// rail
	"{tunnel-,bridge-,}transport-{rail,lightrail}:outline": {
		color: $rail,
		size: { 8: 1, 12: 1, 15: 3 },
	},
	"{tunnel-,bridge-,}transport-{rail,lightrail}": {
		color: color($rail).lighten(0.1).hex(),
		size: { 8: 1, 12: 1, 15: 2 },
		lineDasharray: [ 2, 2 ],
	},
	// bridge
	"{bridge-,}transport-rail:outline": {
		opacity: { 8: 0, 9: 1 },
	},
	"{bridge-,}transport-rail": {
		opacity: { 14: 0, 15: 1 },
	},
	"{bridge-,}transport-lightrail:outline": {
		opacity: { 11: 0, 12: 1 },
	},
	"{bridge-,}transport-lightrail": {
		opacity: { 14: 0, 15: 1 },
	},
	// tunnel
	"tunnel-transport-rail:outline": {
		opacity: { 8: 0, 9: 0.3 },
	},
	"tunnel-transport-rail": {
		opacity: { 14: 0, 15: 0.3 },
	},
	"tunnel-transport-lightrail:outline": {
		opacity: { 11: 0, 12: 0.3 },
	},
	"tunnel-transport-lightrail": {
		opacity: { 14: 0, 15: 0.3 },
	},

};
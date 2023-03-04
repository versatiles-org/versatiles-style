// colors

const color = require("color");

const $land        = "#f6f0f6";
const $water       = "#cbd2df";
const $grass       = "#e7e9e5";
const $wood        = "#d9e3d9"; // #dee0dc";
const $agriculture = "#f8eeee"; // "#e9e1e1";
const $site        = "#ebe8e6";
const $building    = "#e0d1d9"; // #dfdad7"; // "#e0d9d7";
const $street      = "#ffffff";
const $boundary    = "#e6ccd8";
const $foot        = "#fef8ff"; //#e9e5f4";
const $rail        = "#e8d5e0";
const $label       = "#cbb7b7"; // "#ffffff";

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
	"land-grass": {
		color: $grass,
		opacity: { 11: 0, 12: 1 },
	},
	"land-{park,garden,vegetation}": {
		color: color($grass).darken(0.05).saturate(0.05).hex(),
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
	// labels
	"label-boundary-*": {
		color: $label,
		font: "Noto Sans Bold",
		textTransform: "uppercase",
		textHaloColor: color($label).lighten(0.5).hex(),
		textHaloWidth: 0.1,
		textHaloBlur: 1,
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
	"label-boundary-state": {
		minzoom: 5,
		color: color($label).lighten(0.05).hex(),
		size: { 5: 8, 8: 12 },
	},
	"label-place-*": {
		color: color($label).rotate(-15).saturate(1).darken(0.05).hex(),
		font: "Noto Sans Regular",
		textHaloColor: color($label).lighten(0.5).hex(),
		textHaloWidth: 0.1,
		textHaloBlur: 1,
		size: 1,
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
	"label-place-city": {
		minzoom: 7,
		size: { 7: 11, 10: 14 },
	},
	"label-place-town": {
		minzoom: 8,
		size: { 8: 11, 12: 14 },
	},
	"label-place-village": {
		minzoom: 9,
		size: { 9: 11, 12: 14 },
	},
	"label-place-hamlet": {
		minzoom: 10,
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
	"label-street-*": {
		color: $label,
		font: "Noto Sans Regular",
		textHaloColor: color($label).desaturate(0.5).lighten(0.1).hex(),
		textHaloWidth: 0.1,
		textHaloBlur: 1,
		symbolPlacement: "line",
		textAnchor: "center",
		minZoom: 12,
		size: { 12: 10, 15: 13 },
	},

};

/*
{
  "id": "label-boundary-country-any",
  "type": "symbol",
  "filter": [
	 "all",
	 ["in", "admin_level", 2, "2"],
	 ["!has", "land_area"]
  ],
  "layout": {
	 "text-field": "{name}",
	 "text-font": ["Noto Sans Bold"],
	 "text-size": {
		"stops": [[2, 10], [5, 16]]
	 },
	 "text-transform": "uppercase",
	 "text-padding": 3
  },
  "paint": {
	 "text-color": "rgba(203, 183, 183, 1)",
	 "text-halo-width": 0.1,
	 "text-halo-blur": 1,
	 "text-halo-color": "rgba(255, 255, 255, 1)"
  },
  "source-layer": "boundary_labels",
  "source": "versatiles-shortbread"
}
*/
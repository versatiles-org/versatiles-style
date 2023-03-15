exports = module.exports = {

	// background

	"background": {
		type: "background"
	},

	// water

	"water-ocean": {
		type: "fill",
		layer: "ocean",
	},
	"water-area": {
		type: "fill",
		layer: "water_polygons",
		filter: [ "all",
			["==","kind","water"] // can be anything
		],
	},
	"water-area-river": {
		type: "fill",
		layer: "water_polygons",
		filter: [ "all",
			["==","kind","river"]
		],
	},
	"water-area-small": {
		type: "fill",
		layer: "water_polygons",
		filter: [ "all",
			["in","kind","reservoir","basin","dock"]
		],
	},

	// dam

	"water-dam-area": {
		type: "fill",
		layer: "dam_polygons",
		filter: [ "all",
			["==","kind","dam"]
		],
	},
	"water-dam": {
		type: "line",
		layer: "dam_lines",
		filter: [ "all",
			["==","kind","dam"]
		],
	},

	// pier

	"water-pier-area": {
		type: "fill",
		layer: "pier_polygons",
		filter: [ "all",
			["in","kind","pier","breakwater","groyne"]
		],
	},
	"water-pier": {
		type: "line",
		layer: "pier_lines",
		filter: [ "all",
			["in","kind","pier","breakwater","groyne"]
		],
	},

	// land

	"land-glacier": {
		type: "fill",
		layer: "water_polygons", // ← note
		filter: [ "all",
			["==","kind","glacier"]
		],
	},

	...Object.entries({
		commercial: [ "commercial", "retail" ],
		industrial: [ "industrial", "quarry", "railway" ],
		residential: [ "garages", "residential" ],
		agriculture: [ "brownfield", "farmland", "farmyard", "greenfield", "greenhouse_horticulture", "orchard", "plant_nursery", "vineyard" ],
		waste: [ "landfill" ],
		park: [ "park", "village_green", "recreation_ground" ],
		garden: [ "allotments", "garden",	 ],
		burial: [ "cemetery", "grave_yard" ],
		leisure: [ "miniature_golf", "playground", "golf_course" ],
		rock: [ "bare_rock", "scree", "shingle" ],
		forest: [ "forest" ],
		grass: [ "grass", "grassland", "meadow", "wet_meadow" ],
		vegetation: [ "heath", "scrub" ],
		sand: [ "beach", "sand" ],
		wetland: [ "bog", "marsh", "string_bog", "swamp" ],

	}).reduce((l,[t,v])=>{
		return l["land-"+t] = {
			type: "fill",
			layer: "land",
			filter: [ "all",
				["in","kind",...v],
			],
		},l;
	},{}),

	// water-lines

	...["river","canal","stream","ditch"].reduce((l,t)=>{
		return l["water-"+t] = {
			type: "line",
			layer: "water_lines",
			filter: [ "all",
				["in","kind",t],
				["!=","tunnel",true],
				["!=","bridge",true],
			],
		},l;
	},{}),

	// site

	...["danger_area","sports_center","university","college","school","hospital","prison","parking","bicycle_parking","construction"].reduce((l,t)=>{
		return l["site-"+t.replace(/_/g,'')] = {
			type: "fill",
			layer: "sites",
			filter: [ "all",
				["in","kind",t],
			],
		},l;
	},{}),

	// airport

	"airport-area": {
		type: "fill",
		layer: "street_polygons",
		filter: [ "all",
			["in","kind","runway","taxiway"],
		],
	},
	"airport-taxiway:outline": {
		type: "line",
		layer: "streets",
		filter: [ "all",
			["==","kind","taxiway"],
		],
	},
	"airport-runway:outline": {
		type: "line",
		layer: "streets",
		filter: [ "all",
			["==","kind","runway"],
		],
	},
	"airport-taxiway": {
		type: "line",
		layer: "streets",
		filter: [ "all",
			["==","kind","taxiway"],
		],
	},
	"airport-runway": {
		type: "line",
		layer: "streets",
		filter: [ "all",
			["==","kind","runway"],
		],
	},

	// building

	"building:outline": {
		type: "fill",
		layer: "buildings",
		filter: [ "all" ],
	},
	"building": {
		type: "fill",
		layer: "buildings",
		filter: [ "all" ],
	},

	// tunnel-, street-, bridges-bridge
	...["tunnel","street","bridge"].reduce((l,c)=>{

		// filters
		let filter;
		let prefix;
		switch (c) {
			case "tunnel":
				filter = [
					["==","tunnel",true],
				];
				prefix = "tunnel-";
			break;
			case "street":
				filter = [
					["!=","bridge",true],
					["!=","tunnel",true],
				];
				prefix = "";
			break;
			case "bridge":
				filter = [
					["==","bridge",true],
				];
				prefix = "bridge-";
			break;
		};

		// bridges, above street, below bridge
		if (c === "bridge") {
			l["bridge"] = {
				type: "fill",
				layer: "bridges",
				filter: [ "all" ],
			};
		};

		[":outline",""].forEach(function(suffix){

			// pedestrian zone — no outline
			if (suffix === ":outline") l[prefix+"street-pedestrian-zone"] = {
				type: "fill",
				layer: "street_polygons",
				filter: [ "all",
					["==","kind","pedestrian"],
					...filter,
				],
			};

			// non-car streets
			[ "cycleway", "path", "steps", "footway" ].reverse().forEach((t)=>{
				l[prefix+"way-"+t.replace(/_/g,'')+suffix] = {
					type: "line",
					layer: "streets",
					filter: [ "all",
						["in","kind",t],
						...filter,
					],
				};
			});

			// no links
			[ "unclassified","residential","living_street","service","pedestrian","track" ].reverse().forEach((t)=>{
				l[prefix+"street-"+t.replace(/_/g,'')+suffix] = {
					type: "line",
					layer: "streets",
					filter: [ "all",
						["==","kind",t],
						...filter,
						...(t==="service")?[["!=","service","driveway"]]:[], // ignore driveways
					],
				};
			});

			// no links, bicycle=designated
			if (suffix === "") [ "unclassified","residential","living_street","service","pedestrian","track" ].reverse().forEach((t)=>{
				l[prefix+"street-"+t.replace(/_/g,'')+"-bicycle"] = {
					type: "line",
					layer: "streets",
					filter: [ "all",
						["==","kind",t],
						["==","bicycle","designated"],
						...filter,
						...(t==="service")?[["!=","service","driveway"]]:[], // ignore driveways
					],
				};
			});

			// links
			["motorway","trunk","primary","secondary","tertiary"].reverse().forEach((t)=>{
				l[prefix+"street-"+t.replace(/_/g,'')+"-link"+suffix] = {
					type: "line",
					layer: "streets",
					filter: [ "all",
						["in","kind",t],
						["==","link",true],
						...filter,
					],
				};
			});

			// main
			["motorway","trunk","primary","secondary","tertiary"].reverse().forEach((t)=>{
				l[prefix+"street-"+t.replace(/_/g,'')+suffix] = {
					type: "line",
					layer: "streets",
					filter: [ "all",
						["in","kind",t],
						["!=","link",true],
						...filter,
					],
				};
			});

		});

		// separate outline for trains
		[":outline",""].forEach(function(suffix){

			// transport
			[ "rail", "light_rail", "subway", "narrow_gauge", "tram", "funicular", "monorail", "bus_guideway", "busway" ].reverse().forEach((t)=>{
				l[prefix+"transport-"+t.replace(/_/g,'')+suffix] = {
					type: "line",
					layer: "streets",
					filter: [ "all",
						["in","kind",t],
						["!has", "service"],
						...filter,
					],
				};
			});

			if (c === "street") {

				// aerialway, no bridges, above street evel
				[ "cable_car", "gondola", "goods", "chair_lift", "drag_lift", "t-bar", "j-bar", "platter", "rope-tow" ].reverse().forEach((t)=>{
					l["aerialway-"+t.replace(/[_\-]+/g,'')+suffix] = {
						type: "line",
						layer: "aerialways",
						filter: [ "all",
							["in","kind",t],
							...filter,
						],
					};
				});

				// ferry — only on street level
				if (c === "street") l["transport-ferry"+suffix] = {
					type: "line",
					layer: "ferries",
					filter: [ "all" ],
				};

			}

		});

		return l;
	},{}),

	// poi, one layer per type
	...[ "amenity", "leisure", "tourism", "shop", "man_made", "historic", "emergency", "highway", "office" ].reduce(function(pois,key){
		pois["poi-"+key] = {
			type: "symbol",
			layer: "pois",
			filter: [ "all",
				["!=", key, ""],
			],
		};
		return pois;
	},{}),

	// boundary

	...[":outline",""].reduce(function(l, suffix){

		l["boundary-country"+suffix] = {
			type: "line",
			layer: "boundaries",
			filter: [ "all",
				["==", "admin_level", 2],
				["!=", "maritime", true],
				["!=", "disputed", true],
				["!=", "coastline", true],
			],
		};

		l["boundary-country-disputed"+suffix] = {
			type: "line",
			layer: "boundaries",
			filter: [ "all",
				["==", "admin_level", 2],
				["==", "disputed", true],
				["!=", "maritime", true],
				["!=", "coastline", true],
			],
		};

		l["boundary-country-maritime"+suffix] = {
			type: "line",
			layer: "boundaries",
			filter: [ "all",
				["==", "admin_level", 2],
				["==", "maritime", true],
				["!=", "disputed", true],
				["!=", "coastline", true],
			],
		};

		l["boundary-state"+suffix] = {
			type: "line",
			layer: "boundaries",
			filter: [ "all",
				["==", "admin_level", 4],
				["!=", "maritime", true],
				["!=", "disputed", true],
				["!=", "coastline", true],
			],
		};

		return l;
	},{}),

	// label-address

	"label-address-housenumber": {
		type: "symbol",
		layer: "addresses",
		filter: [ "all",
			["has", "housenumber"]
		],
		layout: { "text-field": "{housenumber}" },
	},

	// label-motorway

	"label-motorway-exit": {
		type: "symbol",
		layer: "street_labels_points", // docs say `streets_labels_points`, but layer is actually called `street_labels_points`
		filter: [ "all",
			["==", "kind", "motorway_junction"]
		],
		layout: { "text-field": "{ref}" },
		// FIXME shield
	},
	"label-motorway-shield": {
		type: "symbol",
		layer: "street_labels",
		filter: [ "all",
			["==", "kind", "motorway"]
		],
		layout: { "text-field": "{ref}" },
		// FIXME shield
	},

	// label-street

	...["trunk","primary","secondary","tertiary","unclassified","residential","living_street","pedestrian"].reverse().reduce((l,t)=>{
		l["label-street-"+t.replace(/_/g,'')] = {
			type: "symbol",
			layer: "street_labels",
			filter: [ "all",
				["==", "kind", t]
			],
			layout: { "text-field": "{name}" },
		};
		return l;
	},{}),

	// label-place of small places

	...["town","village","hamlet","suburb","quarter","neighbourhood",/*"dwelling","farm","island","locality"*/].reverse().reduce(function(labels,id){
		labels["label-place-"+id.replace(/_/g,'')] = {
			type: "symbol",
			layer: "place_labels",
			filter: [ "all",
				["==", "kind", id]
			],
			layout: { "text-field": "{name}" },
		};
		return labels;
	},{}),

	// label-boundary

	"label-boundary-state": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 4, "4"]
		],
		layout: { "text-field": "{name}" },
	},

	// label-place-* of large places

	...["capital","state_capital","city"].reverse().reduce(function(labels,id){
		labels["label-place-"+id.replace(/_/g,'')] = {
			type: "symbol",
			layer: "place_labels",
			filter: [ "all",
				["==", "kind", id]
			],
			layout: { "text-field": "{name}" },
		};
		return labels;
	},{}),

	"label-boundary-country-small:en": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 2, "2"],
			["<=", "way_area", 10000000],
		],
		layout: { "text-field": "{name_en}" },
	},
	"label-boundary-country-medium:en": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 2, "2"],
			["<", "way_area", 90000000],
			[">", "way_area", 10000000],
		],
		layout: { "text-field": "{name_en}" },
	},
	"label-boundary-country-large:en": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 2, "2"],
			[">=", "way_area", 90000000],
		],
		layout: { "text-field": "{name_en}" },
	},

	"label-boundary-country-small": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 2, "2"],
			["<=", "way_area", 10000000],
		],
		layout: { "text-field": "{name}" },
	},
	"label-boundary-country-medium": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 2, "2"],
			["<", "way_area", 90000000],
			[">", "way_area", 10000000],
		],
		layout: { "text-field": "{name}" },
	},
	"label-boundary-country-large": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 2, "2"],
			[">=", "way_area", 90000000],
		],
		layout: { "text-field": "{name}" },
	},

	// marking

	"marking-oneway": { // streets → oneway
		type: "symbol",
		layer: "streets",
		filter: [ "all",
			["==", "oneway", true],
			["in", "kind", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street"]
		],
		layout: {
			"symbol-placement": "line",
			"symbol-spacing": 175,
			"icon-rotate": 90,
			"icon-rotation-alignment": "map",
			"icon-padding": 5,
			"symbol-avoid-edges": true,

		}
	},
	"marking-oneway-reverse": { // oneway_reverse
		type: "symbol",
		layer: "streets",
		filter: [ "all",
			["==", "oneway_reverse", true],
			["in", "kind", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street"]
		],
		layout: {
			"symbol-placement": "line",
			"symbol-spacing": 75,
			"icon-rotate": -90,
			"icon-rotation-alignment": "map",
			"icon-padding": 5,
			"symbol-avoid-edges": true,
		}
	},
	"marking-bicylce": { // bicycle=designated or kind=cycleway
		type: "symbol",
		layer: "streets",
		filter: [ "all",
			["==", "bicycle", "designated"],
			["==", "kind", "cycleway"],
		],
		style: {
			layout: {
				"symbol-placement": "line",
				"symbol-spacing": 50,
			},
		},
	},

	// symbol
	"symbol-transit-bus": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "bus_stop"],
		],
	},
	"symbol-transit-tram": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "tram_stop"],
		],
	},
	"symbol-transit-subway": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["in", "kind", "station", "halt"],
			["==", "station", "subway"],
		],
	},
	"symbol-transit-lightrail": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["in", "kind", "station", "halt"],
			["==", "station", "light_rail"],
		],
	},
	"symbol-transit-station": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["in", "kind", "station", "halt"],
			["!in", "station", "light_rail", "subway"],
		],
	},

	"symbol-transit-airfield": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "aerodrome"],
			["!has", "iata"],
		],
	},
	"symbol-transit-airport": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "aerodrome"],
			["has", "iata"],
		],
	},

};

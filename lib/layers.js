const poi_icons = {
	"arts_centre": "art-gallery",
	"bed_and_breakfast": "lodging",
	"bicycle_rental": "bicycle-share",
	"clinic": "hospital",
	"dentist": "dentist",
	"doctors": "doctor",
	"golf_course": "golf",
	"grave_yard": "cemetery",
	"guest_house": "lodging",
	"hostel": "lodging",
	"hotel": "lodging",
	"motel": "lodging",
	"post_office": "post",
	"pub": "beer",
	"sports_centre": "fitness-centre",
	"theme_park": "amusement-park",
	"toilets": "toilet",
	"townhall": "town-hall",
	"diplomatic": "embassy",
	"university": "college",
	"police": "police",
	"fire_station": "fire-station",
	"telephone": "telephone",
	"library": "library",
	"prison": "prison",
	"embassy": "embassy",
	"recycling": "recycling",
	"school": "school",
	"college": "college",
	"pharmacy": "pharmacy",
	"hospital": "hospital",
	"veterinary": "veterinary",
	"theatre": "theatre",
	"cinema": "cinema",
	"restaurant": "restaurant",
	"fast_food": "fast-food",
	"cafe": "cafe",
	"bar": "bar",
	"shelter": "shelter",
	"car_rental": "car-rental",
	"bank": "bank",
	"drinking_water": "drinking-water",
	"waste_basket": "waste-basket",
	"place_of_worship": "place-of-worship",
	"playground": "playground",
	"dog_park": "dog-park",
	"pitch": "pitch",
	"stadium": "stadium",
	"camp_site": "campsite",
	"information": "information",
	"picnic_site": "picnic-site",
	"viewpoint": "viewpoint",
	"zoo": "zoo",
	"supermarket": "shop",
	"bakery": "bakery",
	"kiosk": "shop",
	"mall": "shop",
	"department_store": "shop",
	"general": "shop",
	"convinience": "shop",
	"clothes": "shop",
	"florist": "florist",
	"chemist": "shop",
	"books": "shop",
	"butcher": "shop",
	"shoes": "shop",
	"alcohol": "alcohol-shop",
	"beverages": "shop",
	"optican": "shop",
	"jewelry": "shop",
	"gift": "gift",
	"sports": "shop",
	"stationery": "shop",
	"outdoor": "shop",
	"mobile_phone": "mobile-phone",
	"toys": "shop",
	"newsagent": "shop",
	"greengrocer": "shop",
	"beauty": "shop",
	"video": "shop",
	"car": "car",
	"bicycle": "bicycle",
	"doityourself": "shop",
	"hardware": "hardware",
	"furniture": "furniture",
	"computer": "shop",
	"garden_centre": "garden-centre",
	"hairdresser": "hairdresser",
	"travel_agency": "shop",
	"laundry": "laundry",
	"dry_cleaning": "shop",
	"windmill": "windmill",
	"lighthouse": "lighthouse",
	"watermill": "watermill",
	"monument": "monument",
	"memorial": "historic",
	"artwork": "historic",
	"castle": "castle",
	"ruins": "historic",
	"archaelogical_site": "historic",
	"wayside_cross": "historic",
	"wayside_shrine": "historic",
	"battlefield": "historic",
	"fort": "historic",
	"phone": "emergency-phone",
	"defibrillator": "defibrillator",
	// no good icon
	"bench": "picnic-site",
	"water_well": "drinking-water",
	"tower": "observation-tower",
	"swimming_pool": "swimming",
	"public_building": "town-hall",
	"marketplace": "shop",
	"food_court": "restaurant",
	"caravan_site": "camp-site",
	"car_sharing": "car-rental",
	"biergarten": "beer",
	"atm": "bank",
	"alpine_hut": "lodging",
	// no icon
	"car_wash": null,
	"chalet": null,
	"community_centre": null,
	"courthouse": null,
	"emergency_access_point": null,
	"fire_hydrant": null,
	"fountain": null,
	"hunting_stand": null,
	"ice_rink": null,
	"nightclub": null,
	"nursing_home": null,
	"post_box": null,
	"surveillance": null,
	"vending_machine": null,
	"wastewater_plant": null,
	"water_park": null,
	"water_works": null,
};

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
			["in","kind","water"] // can be anything
		],
	},
	"water-area-river": {
		type: "fill",
		layer: "water_polygons",
		filter: [ "all",
			["in","kind","river"]
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
			["in","kind","dam"]
		],
	},
	"water-dam": {
		type: "line",
		layer: "dam_lines",
		filter: [ "all",
			["in","kind","dam"]
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
			["in","kind","glacier"]
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
	"airport-taxiway": {
		type: "fill",
		layer: "streets",
		filter: [ "all",
			["==","kind","taxiway"],
		],
	},
	"airport-runway": {
		type: "fill",
		layer: "streets",
		filter: [ "all",
			["==","kind","runway"],
		],
	},

	// building

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

		// ferries — only on street level
		if (c === "bridge") l["bridge"] = {
			type: "fill",
			layer: "bridges",
			filter: [ "all" ],
		};

		[":outline",""].forEach(function(suffix){

			// footways
			// pedestrian
			[ "cycleway", "path", "steps", "footway" ].forEach((t)=>{
				l[prefix+"way-"+t.replace(/_/g,'')+suffix] = {
					type: "line",
					layer: "streets",
					filter: [ "all",
						["in","kind",t],
						...filter,
					],
				};
			});

			// pedestrian zone — no outline
			if (suffix === "") l[prefix+"street-pedestrian-zone"] = {
				type: "fill",
				layer: "street_polygons",
				filter: [ "all",
					["in","kind","pedestrian"],
					...filter,
				],
			};

			// no links
			[ "unclassified","residential","living_street","service","pedestrian","track" ].forEach((t)=>{
				l[prefix+"street-"+t.replace(/_/g,'')+suffix] = {
					type: "line",
					layer: "streets",
					filter: [ "all",
						["in","kind",t],
						...filter,
						...(t==="service")?[["!=","service","driveway"]]:[], // ignore driveways
					],
				};
			});

			// with links
			["motorway","trunk","primary","secondary","tertiary"].forEach((t)=>{

				// link
				l[prefix+"street-"+t.replace(/_/g,'')+"-link"+suffix] = {
					type: "line",
					layer: "streets",
					filter: [ "all",
						["in","kind",t],
						["==","link",true],
						...filter,
					],
				};

				// main
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

			// transport
			[ "rail", "narrow_gauge", "light_rail", "subway", "tram", "funicular", "monorail", "bus_guideway", "busway" ].forEach((t)=>{
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
				[ "cable_car", "gondola", "goods", "chair_lift", "drag_lift", "t-bar", "j-bar", "platter", "rope-tow" ].forEach((t)=>{
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
		text: "{housenumber}",
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

	/* future shortbread
	"label-boundary-country-small": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 2, "2"],
			["<=", "land_area", 1000000],
		],
		layout: { "text-field": "{name}" },
	},
	"label-boundary-country-medium": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 2, "2"],
			["<", "land_area", 2000000],
			[">", "land_area", 1000000],
		],
		layout: { "text-field": "{name}" },
	},
	"label-boundary-country-large": {
		type: "symbol",
		layer: "boundary_labels",
		filter: [ "all",
			["in", "admin_level", 2, "2"],
			[">=", "land_area", 2000000],
		],
		layout: { "text-field": "{name}" },
	},
	*/

	// marking

	"marking-oneway": { // streets → oneway
		type: "symbol",
		layer: "streets",
		filter: [ "all",
			["==", "oneway", true],
			["in", "kind", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street"]
		],
		icon: "marking:arrow",
		style: {
			layout: {
				"symbol-placement": "line",
				"symbol-spacing": 75,
				"icon-rotate": 90,
				"icon-rotation-alignment": "map",
			},
		}
	},
	"marking-oneway-reverse": { // oneway_reverse
		type: "symbol",
		layer: "streets",
		filter: [ "all",
			["==", "oneway_reverse", true],
			["in", "kind", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street"]
		],
		icon: "marking:arrow",
		style: {
			layout: {
				"symbol-placement": "line",
				"symbol-spacing": 75,
				"icon-rotate": -90,
				"icon-rotation-alignment": "map",
			},
		}
	},
	"marking-bicylce": { // bicycle=designated or kind=cycleway
		type: "symbol",
		layer: "streets",
		filter: [ "all",
			["==", "bicycle", "designated"],
			["==", "kind", "cycleway"],
		],
		icon: "icon:bicycle",
		style: {
			layout: {
				"symbol-placement": "line",
				"symbol-spacing": 50,
			},
		},
	},

	// FIXME marking pedestrian

	// symbol

	"symbol-transit-airport": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "aerodrome"],
			["has", "iata"],
		],
		icon: "icon:airport",
	},
	"symbol-transit-airfield": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "aerodrome"],
			["!has", "iata"],
		],
		icon: "icon:airfield",
	},
	"symbol-transit-station": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["in", "kind", "station", "halt"],
			["!in", "station", "light_rail", "subway"],
		],
		icon: "transport:train",
	},
	"symbol-transit-lightrail": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["in", "kind", "station", "halt"],
			["==", "station", "light_rail"],
		],
		icon: "transport:lightrail",
	},
	"symbol-transit-subway": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["in", "kind", "station", "halt"],
			["==", "station", "subway"],
		],
		icon: "transport:subway",
	},
	"symbol-transit-tram": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "tram_stop"],
		],
		icon: "transport:tram",
	},
	"symbol-transit-bus": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "bus_stop"],
		],
		icon: "transport:halt",
	},

	// poi
	...Object.entries({
		"amenity": [ "police", "fire_station", "post_box", "post_office", "telephone", "library", "townhall", "courthouse", "prison", "embassy", "community_centre", "nursing_home", "arts_centre", "grave_yard", "marketplace", "recycling", "university", "school", "college", "public_building", "pharmacy", "hospital", "clinic", "doctors", "denitst", "veterinary", "theatre", "nightclub", "cinema", "restaurant", "fast_food", "cafe", "pub", "bar", "foot_court", "biergarten", "shelter", "car_rental", "car_wash", "car_sharing", "bicycle_rental", "vending_machine", "bank", "atm", "toilets", "bench", "drinking_water", "fountain", "hunting_stand", "waste_basket", "place_of_worship", "playground", "dog_park" ],
		"leisure": [ "sports_centre", "pitch", "swimming_pool", "water_park", "golf_course", "stadium", "ice_rink" ],
		"tourism": [ "hotel", "motel", "bed_and_breakfast", "guest_house", "hostel", "chalet", "camp_site", "alpine_hut", "caravan_site", "information", "picnic_site", "viewpoint", "zoo", "theme_park" ],
		"shop": [ "supermarket", "bakery", "kiosk", "mall", "department_store", "general", "convinience", "clothes", "florist", "chemist", "books", "butcher", "shoes", "alcohol", "beverages", "optican", "jewelry", "gift", "sports", "stationery", "outdoor", "mobile_phone", "toys", "newsagent", "greengrocer", "beauty", "video", "car", "bicycle", "doityourself", "hardware", "furniture", "computer", "garden_centre", "hairdresser", "travel_agency", "laundry", "dry_cleaning" ],
		"man_made": [ "surveillance", "tower", "windmill", "lighthouse", "wastewater_plant", "water_well", "watermill", "water_works" ],
		"historic": [ "monument", "memorial", "artwork", "castle", "ruins", "archaelogical_site", "wayside_cross", "wayside_shrine", "battlefield", "fort" ],
		"emergency": [ "phone", "fire_hydrant", "defibrillator" ],
		"highway": [ "emergency_access_point" ],
		"office": [ "diplomatic" ]
	}).reduce(function(pois,[key,values]){
		values.forEach(function(value){
			pois["poi-"+key+"-"+value] = {
				type: "symbol",
				layer: "pois",
				filter: [ "all",
					["==", key, value],
				],
				icon: (poi_icons[value]) ? "icon:"+poi_icons[value] : null,
			};
		});
		return pois;
	},{}),

};


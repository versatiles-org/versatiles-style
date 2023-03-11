const poi_icons = {
	"arts_centre": "icon:art-gallery",
	"bed_and_breakfast": "icon:lodging",
	"bicycle_rental": "icon:bicycle-share",
	"clinic": "icon:hospital",
	"dentist": "icon:dentist",
	"doctors": "icon:doctor",
	"golf_course": "icon:golf",
	"grave_yard": "icon:cemetery",
	"guest_house": "icon:lodging",
	"hostel": "icon:lodging",
	"hotel": "icon:lodging",
	"motel": "icon:lodging",
	"post_office": "icon:post",
	"pub": "icon:beer",
	"sports_centre": "icon:fitness-centre",
	"theme_park": "icon:amusement-park",
	"toilets": "icon:toilet",
	"townhall": "icon:town-hall",
	"diplomatic": "icon:embassy",
	"university": "icon:college",
	"police": "icon:police",
	"fire_station": "icon:fire-station",
	"telephone": "icon:telephone",
	"library": "icon:library",
	"prison": "icon:prison",
	"embassy": "icon:embassy",
	"recycling": "icon:recycling",
	"school": "icon:school",
	"college": "icon:college",
	"pharmacy": "icon:pharmacy",
	"hospital": "icon:hospital",
	"veterinary": "icon:veterinary",
	"theatre": "icon:theatre",
	"cinema": "icon:cinema",
	"restaurant": "icon:restaurant",
	"fast_food": "icon:fast-food",
	"cafe": "icon:cafe",
	"bar": "icon:bar",
	"shelter": "icon:shelter",
	"car_rental": "icon:car-rental",
	"bank": "icon:bank",
	"drinking_water": "icon:drinking-water",
	"waste_basket": "icon:waste-basket",
	"place_of_worship": "icon:place-of-worship",
	"playground": "icon:playground",
	"dog_park": "icon:dog-park",
	"pitch": "icon:pitch",
	"stadium": "icon:stadium",
	"camp_site": "icon:campsite",
	"information": "icon:information",
	"picnic_site": "icon:picnic-site",
	"viewpoint": "icon:viewpoint",
	"zoo": "icon:zoo",
	"supermarket": "icon:shop",
	"bakery": "icon:bakery",
	"kiosk": "icon:shop",
	"mall": "icon:shop",
	"department_store": "icon:shop",
	"general": "icon:shop",
	"convinience": "icon:shop",
	"clothes": "icon:shop",
	"florist": "icon:florist",
	"chemist": "icon:shop",
	"books": "icon:shop",
	"butcher": "icon:shop",
	"shoes": "icon:shop",
	"alcohol": "icon:alcohol-shop",
	"beverages": "icon:shop",
	"optican": "icon:shop",
	"jewelry": "icon:shop",
	"gift": "icon:gift",
	"sports": "icon:shop",
	"stationery": "icon:shop",
	"outdoor": "icon:shop",
	"mobile_phone": "icon:mobile-phone",
	"toys": "icon:shop",
	"newsagent": "icon:shop",
	"greengrocer": "icon:shop",
	"beauty": "icon:shop",
	"video": "icon:shop",
	"car": "icon:car",
	"bicycle": "icon:bicycle",
	"doityourself": "icon:shop",
	"hardware": "icon:hardware",
	"furniture": "icon:furniture",
	"computer": "icon:shop",
	"garden_centre": "icon:garden-centre",
	"hairdresser": "icon:hairdresser",
	"travel_agency": "icon:shop",
	"laundry": "icon:laundry",
	"dry_cleaning": "icon:shop",
	"windmill": "icon:windmill",
	"lighthouse": "icon:lighthouse",
	"watermill": "icon:watermill",
	"monument": "icon:monument",
	"memorial": "icon:historic",
	"artwork": "icon:historic",
	"castle": "icon:castle",
	"ruins": "icon:historic",
	"archaelogical_site": "icon:historic",
	"wayside_cross": "icon:historic",
	"wayside_shrine": "icon:historic",
	"battlefield": "icon:historic",
	"fort": "icon:historic",
	"phone": "icon:emergency-phone",
	"defibrillator": "icon:defibrillator",
	"atm": "extra:atm",
	"biergarten": "extra:beergarden", // extra
	"alpine_hut": "extra:chalet", // extra
	"car_wash": "extra:car-wash",
	"chalet": "extra:chalet",
	"community_centre": "extra:community",
	"courthouse": "extra:justice",
	"fountain": "extra:fountain",
	"bench": "extra:bench",
	// no good icon
	"water_well": "icon:drinking-water",
	"tower": "icon:observation-tower",
	"swimming_pool": "icon:swimming",
	"public_building": "icon:town-hall",
	"marketplace": "icon:shop",
	"food_court": "icon:restaurant",
	"caravan_site": "icon:camp-site",
	"car_sharing": "icon:car-rental",
	// no icon
	"emergency_access_point": null,
	"fire_hydrant": null,
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

			// footways
			// pedestrian
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

		// separate outline
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
				icon: (poi_icons[value]) ? poi_icons[value] : null,
			};
		});
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
		icon: "marking:arrow",
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


	"symbol-transit-bus": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "bus_stop"],
		],
		icon: "transport:halt",
	},
	"symbol-transit-tram": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "tram_stop"],
		],
		icon: "transport:tram",
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
	"symbol-transit-lightrail": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["in", "kind", "station", "halt"],
			["==", "station", "light_rail"],
		],
		icon: "transport:lightrail",
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

	"symbol-transit-airfield": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "aerodrome"],
			["!has", "iata"],
		],
		icon: "icon:airfield",
	},
	"symbol-transit-airport": {
		type: "symbol",
		layer: "public_transport",
		filter: [ "all",
			["==", "kind", "aerodrome"],
			["has", "iata"],
		],
		icon: "icon:airport",
	},

};


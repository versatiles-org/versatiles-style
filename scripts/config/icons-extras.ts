// Icons for the `extras` sheet — the public, add-only set developers place themselves.
//
// The key is the sprite name (`extras:<group>-<key>`), the value is the file it is drawn from,
// relative to `icons/` and without the `.svg`. Files are organized by PROVENANCE and keep their
// upstream filename, so the two are deliberately independent — see SPRITES.md.
//
// `title`, `aliases` and `center` are published INSIDE the sprite JSON, so a picker needs no
// second request. Every entry needs a title and config/sprites.test.ts fails without one; aliases
// are the other terms someone might type, and `center` marks where an icon POINTS when that is not
// its own middle — a pin's tip, an arrow's head.

import type { IconSets } from '../lib/icons.js';

const icons: IconSets = {
	badge: {
		size: 22,
		icons: {
			number_0: {
				src: 'versatiles/number_0',
				title: 'Badge 0',
				aliases: ['badge', 'number', 'digit', '0', 'numbered'],
			},
			number_0_outline: {
				src: 'versatiles/number_0_outline',
				title: 'Badge 0, outlined',
				aliases: ['badge', 'number', 'digit', '0', 'numbered', 'outline'],
			},
			number_1: {
				src: 'versatiles/number_1',
				title: 'Badge 1',
				aliases: ['badge', 'number', 'digit', '1', 'numbered'],
			},
			number_1_outline: {
				src: 'versatiles/number_1_outline',
				title: 'Badge 1, outlined',
				aliases: ['badge', 'number', 'digit', '1', 'numbered', 'outline'],
			},
			number_2: {
				src: 'versatiles/number_2',
				title: 'Badge 2',
				aliases: ['badge', 'number', 'digit', '2', 'numbered'],
			},
			number_2_outline: {
				src: 'versatiles/number_2_outline',
				title: 'Badge 2, outlined',
				aliases: ['badge', 'number', 'digit', '2', 'numbered', 'outline'],
			},
			number_3: {
				src: 'versatiles/number_3',
				title: 'Badge 3',
				aliases: ['badge', 'number', 'digit', '3', 'numbered'],
			},
			number_3_outline: {
				src: 'versatiles/number_3_outline',
				title: 'Badge 3, outlined',
				aliases: ['badge', 'number', 'digit', '3', 'numbered', 'outline'],
			},
			number_4: {
				src: 'versatiles/number_4',
				title: 'Badge 4',
				aliases: ['badge', 'number', 'digit', '4', 'numbered'],
			},
			number_4_outline: {
				src: 'versatiles/number_4_outline',
				title: 'Badge 4, outlined',
				aliases: ['badge', 'number', 'digit', '4', 'numbered', 'outline'],
			},
			number_5: {
				src: 'versatiles/number_5',
				title: 'Badge 5',
				aliases: ['badge', 'number', 'digit', '5', 'numbered'],
			},
			number_5_outline: {
				src: 'versatiles/number_5_outline',
				title: 'Badge 5, outlined',
				aliases: ['badge', 'number', 'digit', '5', 'numbered', 'outline'],
			},
			number_6: {
				src: 'versatiles/number_6',
				title: 'Badge 6',
				aliases: ['badge', 'number', 'digit', '6', 'numbered'],
			},
			number_6_outline: {
				src: 'versatiles/number_6_outline',
				title: 'Badge 6, outlined',
				aliases: ['badge', 'number', 'digit', '6', 'numbered', 'outline'],
			},
			number_7: {
				src: 'versatiles/number_7',
				title: 'Badge 7',
				aliases: ['badge', 'number', 'digit', '7', 'numbered'],
			},
			number_7_outline: {
				src: 'versatiles/number_7_outline',
				title: 'Badge 7, outlined',
				aliases: ['badge', 'number', 'digit', '7', 'numbered', 'outline'],
			},
			number_8: {
				src: 'versatiles/number_8',
				title: 'Badge 8',
				aliases: ['badge', 'number', 'digit', '8', 'numbered'],
			},
			number_8_outline: {
				src: 'versatiles/number_8_outline',
				title: 'Badge 8, outlined',
				aliases: ['badge', 'number', 'digit', '8', 'numbered', 'outline'],
			},
			number_9: {
				src: 'versatiles/number_9',
				title: 'Badge 9',
				aliases: ['badge', 'number', 'digit', '9', 'numbered'],
			},
			number_9_outline: {
				src: 'versatiles/number_9_outline',
				title: 'Badge 9, outlined',
				aliases: ['badge', 'number', 'digit', '9', 'numbered', 'outline'],
			},
		},
	},
	icon: {
		size: 22,
		icons: {
			ambulance: {
				src: 'versatiles/ambulance',
				title: 'Ambulance in profile',
				aliases: ['emergency', 'paramedic', 'rescue', 'hospital', '999', '112'],
			},
			anchor: {
				src: 'maki/harbor',
				title: 'Anchor',
				aliases: ['harbour', 'harbor', 'marina', 'mooring', 'port', 'boat', 'nautical'],
			},
			apartment: {
				src: 'maki/residential-community',
				title: 'Apartment',
				aliases: ['flats', 'housing', 'residential', 'rent', 'block'],
			},
			avalanche: {
				src: 'versatiles/avalanche',
				title: 'Avalanche',
				aliases: ['snowslide', 'hazard', 'mountain', 'danger', 'alpine'],
			},
			ballot_box: {
				src: 'versatiles/ballot_box',
				title: 'Ballot box',
				aliases: ['vote', 'election', 'polling', 'referendum', 'democracy'],
			},
			battery: {
				src: 'versatiles/battery',
				title: 'Battery',
				aliases: ['power', 'energy', 'storage', 'charge', 'accumulator'],
			},
			bbq: { src: 'maki/bbq', title: 'Bbq', aliases: ['barbecue', 'grill', 'picnic', 'cookout'] },
			beach: { src: 'maki/beach', title: 'Beach', aliases: ['coast', 'seaside', 'sand', 'palm', 'shore', 'holiday'] },
			bee: { src: 'versatiles/bee', title: 'Bee', aliases: ['pollinator', 'apiary', 'hive', 'honey', 'insect'] },
			bicycle: { src: 'maki/bicycle', title: 'Bicycle', aliases: ['bike', 'cycling', 'cycle', 'ride', 'velo'] },
			binoculars: {
				src: 'temaki/binoculars',
				title: 'Pair of binoculars',
				aliases: ['observation', 'birdwatching', 'hide', 'lookout', 'optics'],
			},
			bird: { src: 'versatiles/bird', title: 'Bird', aliases: ['birdwatching', 'ornithology', 'wildlife', 'fowl'] },
			bookmark: {
				src: 'versatiles/bookmark',
				title: 'Bookmark',
				aliases: ['save', 'saved', 'favourite', 'favorite', 'ribbon', 'flag'],
			},
			bridge: { src: 'maki/bridge', title: 'Bridge', aliases: ['crossing', 'span', 'viaduct', 'overpass'] },
			building: { src: 'maki/building', title: 'Building', aliases: ['office', 'block', 'premises', 'structure'] },
			buoy: { src: 'temaki/buoy', title: 'Buoy', aliases: ['navigation', 'marker', 'sea', 'float', 'nautical'] },
			bus_stop: {
				src: 'versatiles/bus_stop',
				title: 'Bus stop',
				aliases: ['transit', 'public transport', 'stop', 'pole', 'shelter'],
			},
			butterfly: {
				src: 'versatiles/butterfly',
				title: 'Butterfly',
				aliases: ['insect', 'pollinator', 'wildlife', 'moth'],
			},
			cable_car: {
				src: 'maki/aerialway',
				title: 'Cable car',
				aliases: ['gondola', 'aerialway', 'ropeway', 'lift', 'ski'],
			},
			calculator: {
				src: 'versatiles/calculator',
				title: 'Calculator',
				aliases: ['maths', 'math', 'cost', 'estimate', 'compute'],
			},
			calendar: {
				src: 'versatiles/calendar',
				title: 'Calendar',
				aliases: ['date', 'event', 'schedule', 'when', 'booking'],
			},
			camera: { src: 'versatiles/camera', title: 'Camera', aliases: ['photo', 'photography', 'picture', 'shot'] },
			car: { src: 'maki/car', title: 'Car', aliases: ['vehicle', 'automobile', 'drive', 'motor', 'traffic'] },
			cat: { src: 'maki/animal-shelter', title: 'Cat', aliases: ['pet', 'animal', 'feline', 'shelter'] },
			charging_station: {
				src: 'maki/charging-station',
				title: 'Charging station',
				aliases: ['ev', 'electric vehicle', 'charger', 'plug', 'bolt', 'e-car'],
			},
			child: { src: 'versatiles/child', title: 'Child', aliases: ['kid', 'children', 'family', 'young', 'playground'] },
			clock: {
				src: 'temaki/clock',
				title: 'Clock',
				aliases: ['time', 'hours', 'opening times', 'schedule', 'duration'],
			},
			cloud: { src: 'versatiles/cloud', title: 'Cloud', aliases: ['overcast', 'weather', 'sky', 'cloudy'] },
			cloud_sun: {
				src: 'versatiles/cloud_sun',
				title: 'Sun behind cloud',
				aliases: ['partly cloudy', 'weather', 'forecast', 'fair'],
			},
			co2: {
				src: 'versatiles/co2',
				title: 'CO₂',
				aliases: ['carbon', 'emissions', 'greenhouse', 'climate', 'molecule'],
			},
			coin: { src: 'versatiles/coin', title: 'Coin', aliases: ['money', 'cash', 'currency', 'payment', 'change'] },
			compass: {
				src: 'temaki/compass',
				title: 'Compass',
				aliases: ['orientation', 'bearing', 'navigation', 'north', 'direction'],
			},
			conifer: {
				src: 'maki/park-alt1',
				title: 'Conifer',
				aliases: ['tree', 'pine', 'fir', 'evergreen', 'forest', 'needleleaf'],
			},
			cow: {
				src: 'maki/slaughterhouse',
				title: 'Cow in profile',
				aliases: ['cattle', 'livestock', 'farm', 'dairy', 'pasture', 'bovine'],
			},
			crane: {
				src: 'temaki/crane',
				title: 'Crane',
				aliases: ['construction', 'building site', 'development', 'works'],
			},
			credit_card: {
				src: 'versatiles/credit_card',
				title: 'Credit card',
				aliases: ['payment', 'cashless', 'card', 'debit', 'pay'],
			},
			dam: { src: 'maki/dam', title: 'Dam', aliases: ['reservoir', 'hydro', 'water', 'barrage', 'weir'] },
			deer: {
				src: 'versatiles/deer',
				title: 'Deer head with antlers',
				aliases: ['wildlife', 'stag', 'game', 'antlers', 'forest'],
			},
			dollar: { src: 'versatiles/dollar', title: 'Dollar', aliases: ['money', 'currency', 'usd', 'price', 'cost'] },
			download: {
				src: 'versatiles/download',
				title: 'Download arrow into a tray',
				aliases: ['save', 'export', 'get', 'file', 'arrow down'],
			},
			droplet: { src: 'maki/water', title: 'Droplet', aliases: ['water', 'drop', 'rain', 'liquid', 'moisture'] },
			eclipse: {
				src: 'versatiles/eclipse',
				title: 'Solar eclipse',
				aliases: ['solar', 'corona', 'astronomy', 'totality', 'sun'],
			},
			euro: { src: 'versatiles/euro', title: 'Euro', aliases: ['money', 'currency', 'eur', 'price', 'cost'] },
			eye: { src: 'versatiles/eye', title: 'Eye', aliases: ['view', 'visible', 'watch', 'observe', 'see', 'preview'] },
			factory: {
				src: 'maki/industry',
				title: 'Factory',
				aliases: ['industry', 'industrial', 'plant', 'works', 'manufacturing', 'chimney'],
			},
			family: {
				src: 'versatiles/family',
				title: 'Family group',
				aliases: ['people', 'household', 'parents', 'group', 'together'],
			},
			fence: { src: 'maki/fence', title: 'Fence', aliases: ['boundary', 'enclosure', 'barrier', 'property', 'paling'] },
			ferry: {
				src: 'maki/ferry',
				title: 'Ferry',
				aliases: ['boat', 'ship', 'crossing', 'water transport', 'passenger'],
			},
			filter: { src: 'versatiles/filter', title: 'Funnel', aliases: ['facet', 'refine', 'narrow', 'sort'] },
			fire: { src: 'versatiles/fire', title: 'Fire', aliases: ['flame', 'wildfire', 'burn', 'blaze', 'hazard'] },
			fire_truck: {
				src: 'versatiles/fire_truck',
				title: 'Fire truck',
				aliases: ['fire engine', 'brigade', 'emergency', 'rescue'],
			},
			first_aid: {
				src: 'versatiles/first_aid',
				title: 'First aid kit',
				aliases: ['medical', 'kit', 'aid post', 'health', 'emergency'],
			},
			fish: { src: 'maki/aquarium', title: 'Fish', aliases: ['aquarium', 'marine', 'angling', 'fishing', 'sea life'] },
			flood: {
				src: 'versatiles/flood',
				title: 'Flood',
				aliases: ['inundation', 'high water', 'hazard', 'deluge', 'water level'],
			},
			flower: {
				src: 'versatiles/flower',
				title: 'Flower',
				aliases: ['bloom', 'blossom', 'meadow', 'garden', 'floral'],
			},
			fog: { src: 'versatiles/fog', title: 'Fog bands', aliases: ['mist', 'haze', 'visibility', 'weather'] },
			footprint: {
				src: 'versatiles/footprint',
				title: 'Footprint',
				aliases: ['trail', 'hiking', 'walk', 'track', 'path'],
			},
			globe: { src: 'maki/globe', title: 'Globe', aliases: ['world', 'international', 'website', 'earth', 'global'] },
			guitar: {
				src: 'versatiles/guitar',
				title: 'Guitar',
				aliases: ['music', 'live music', 'band', 'instrument', 'gig'],
			},
			headphones: {
				src: 'versatiles/headphones',
				title: 'Headphones',
				aliases: ['audio', 'audio guide', 'listen', 'podcast', 'sound'],
			},
			heat_pump: {
				src: 'versatiles/heat_pump',
				title: 'Heat pump',
				aliases: ['heating', 'climate', 'hvac', 'renewable', 'energy'],
			},
			helicopter: {
				src: 'maki/heliport',
				title: 'Helicopter',
				aliases: ['heliport', 'air ambulance', 'rotor', 'aviation'],
			},
			helping_hand: {
				src: 'versatiles/helping_hand',
				title: 'Helping hand',
				aliases: ['volunteer', 'care', 'support', 'charity', 'donate'],
			},
			horse_riding: {
				src: 'maki/horse-riding',
				title: 'Horse riding',
				aliases: ['equestrian', 'stables', 'rider', 'pony', 'bridleway'],
			},
			hot_air_balloon: {
				src: 'versatiles/hot_air_balloon',
				title: 'Hot air balloon',
				aliases: ['ballooning', 'flight', 'aviation', 'sightseeing'],
			},
			house: { src: 'maki/home', title: 'House', aliases: ['home', 'dwelling', 'residential', 'property'] },
			key: { src: 'versatiles/key', title: 'Key', aliases: ['access', 'rental', 'unlock', 'let', 'tenancy'] },
			layers: { src: 'versatiles/layers', title: 'Stacked layers', aliases: ['stack', 'overlay', 'levels', 'toggle'] },
			leaf: {
				src: 'versatiles/leaf',
				title: 'Leaf',
				aliases: ['nature', 'organic', 'eco', 'green', 'renewable', 'vegan'],
			},
			lifebuoy: {
				src: 'versatiles/lifebuoy',
				title: 'Lifebuoy',
				aliases: ['rescue', 'safety', 'lifeguard', 'ring', 'supervised'],
			},
			lightning: {
				src: 'versatiles/lightning',
				title: 'Lightning',
				aliases: ['thunderstorm', 'strike', 'bolt', 'storm', 'electric'],
			},
			link: { src: 'versatiles/link', title: 'Link', aliases: ['url', 'chain', 'reference', 'external', 'connect'] },
			lock: {
				src: 'temaki/lock',
				title: 'Lock',
				aliases: ['secure', 'private', 'restricted', 'padlock', 'members only'],
			},
			mail: { src: 'versatiles/mail', title: 'Mail', aliases: ['email', 'envelope', 'contact', 'letter', 'message'] },
			megaphone: {
				src: 'versatiles/megaphone',
				title: 'Megaphone',
				aliases: ['announcement', 'demonstration', 'loudspeaker', 'protest', 'shout'],
			},
			microphone: {
				src: 'maki/karaoke',
				title: 'Microphone',
				aliases: ['karaoke', 'recording', 'audio', 'speak', 'sing'],
			},
			moon: { src: 'versatiles/moon', title: 'Moon', aliases: ['night', 'lunar', 'after dark', 'astronomy'] },
			motorcycle: { src: 'temaki/motorcycle', title: 'Motorcycle', aliases: ['motorbike', 'bike', 'moped', 'rider'] },
			mountain: {
				src: 'maki/mountain',
				title: 'Mountain',
				aliases: ['peak', 'summit', 'alpine', 'hiking', 'elevation'],
			},
			museum: {
				src: 'maki/museum',
				title: 'Museum',
				aliases: ['gallery', 'exhibition', 'culture', 'heritage', 'collection'],
			},
			mushroom: {
				src: 'versatiles/mushroom',
				title: 'Mushroom',
				aliases: ['fungus', 'foraging', 'toadstool', 'forest'],
			},
			music: { src: 'maki/music', title: 'Music', aliases: ['notes', 'song', 'audio', 'concert', 'sound'] },
			no_entry: {
				src: 'maki/roadblock',
				title: 'No entry',
				aliases: ['forbidden', 'closed', 'roadblock', 'restricted', 'do not enter'],
			},
			nuclear: {
				src: 'temaki/cooling_tower_radiation',
				title: 'Nuclear plant',
				aliases: ['reactor', 'atomic', 'cooling tower', 'radiation', 'power'],
			},
			palette: {
				src: 'versatiles/palette',
				title: 'Palette',
				aliases: ['art', 'painting', 'creative', 'colours', 'colors', 'studio'],
			},
			parking: { src: 'maki/parking', title: 'Parking', aliases: ['car park', 'park', 'p', 'garage', 'space'] },
			paw: {
				src: 'versatiles/paw',
				title: 'Paw print',
				aliases: ['animal', 'pet', 'wildlife', 'dog friendly', 'track'],
			},
			pedestrian: {
				src: 'versatiles/pedestrian',
				title: 'Pedestrian',
				aliases: ['walking', 'foot', 'walk', 'isochrone', 'on foot'],
			},
			person: {
				src: 'versatiles/person',
				title: 'Person',
				aliases: ['people', 'user', 'individual', 'human', 'someone'],
			},
			play: { src: 'versatiles/play', title: 'Play button', aliases: ['media', 'video', 'audio', 'start', 'watch'] },
			plug: { src: 'versatiles/plug', title: 'Plug', aliases: ['socket', 'power', 'electricity', 'outlet', 'mains'] },
			police_car: {
				src: 'versatiles/police_car',
				title: 'Police car',
				aliases: ['patrol', 'emergency', 'law enforcement', '999'],
			},
			power_plant: {
				src: 'temaki/cooling_tower',
				title: 'Power plant',
				aliases: ['cooling tower', 'generation', 'energy', 'electricity', 'station'],
			},
			power_pole: {
				src: 'temaki/power_pole',
				title: 'Power pole',
				aliases: ['pylon', 'transmission', 'grid', 'overhead line', 'utility'],
			},
			price_tag: {
				src: 'versatiles/price_tag',
				title: 'Price tag',
				aliases: ['offer', 'label', 'cost', 'sale', 'pricing'],
			},
			quay: {
				src: 'temaki/quay',
				title: 'Quay edge at the waterline',
				aliases: ['dock', 'wharf', 'harbour', 'harbor', 'pier', 'waterfront'],
			},
			radiation: {
				src: 'temaki/radiation',
				title: 'Radiation',
				aliases: ['radioactive', 'nuclear', 'trefoil', 'hazard', 'fallout'],
			},
			radiator: {
				src: 'versatiles/radiator',
				title: 'Radiator',
				aliases: ['heating', 'district heating', 'warmth', 'central heating'],
			},
			rain: {
				src: 'versatiles/rain',
				title: 'Cloud with rain',
				aliases: ['shower', 'precipitation', 'wet', 'weather', 'forecast'],
			},
			rainbow: {
				src: 'versatiles/rainbow',
				title: 'Rainbow',
				aliases: ['pride', 'lgbtq', 'queer', 'diversity', 'inclusive'],
			},
			raised_fist: {
				src: 'versatiles/raised_fist',
				title: 'Raised fist',
				aliases: ['protest', 'solidarity', 'demonstration', 'activism', 'resistance'],
			},
			receipt: {
				src: 'versatiles/receipt',
				title: 'Receipt',
				aliases: ['invoice', 'bill', 'itemised', 'expenses', 'proof'],
			},
			rocket: { src: 'maki/rocket', title: 'Rocket', aliases: ['launch', 'space', 'startup', 'fast', 'boost'] },
			roundabout: {
				src: 'versatiles/roundabout',
				title: 'Roundabout',
				aliases: ['junction', 'traffic circle', 'intersection', 'circular'],
			},
			ruler: {
				src: 'versatiles/ruler',
				title: 'Ruler',
				aliases: ['measure', 'distance', 'scale', 'length', 'dimension'],
			},
			sailboat: {
				src: 'temaki/sailboat',
				title: 'Sailboat',
				aliases: ['sailing', 'yacht', 'boat', 'marina', 'watersport'],
			},
			scooter: {
				src: 'maki/scooter',
				title: 'Scooter',
				aliases: ['e-scooter', 'moped', 'kick scooter', 'micromobility', 'sharing'],
			},
			scuba_diver: {
				src: 'temaki/scuba_diving',
				title: 'Scuba diver',
				aliases: ['diving', 'dive site', 'snorkel', 'underwater', 'sub-aqua'],
			},
			search: { src: 'versatiles/search', title: 'Magnifier', aliases: ['find', 'lookup', 'query', 'explore'] },
			share: {
				src: 'versatiles/share',
				title: 'Share network',
				aliases: ['send', 'network', 'social', 'distribute', 'forward'],
			},
			shield: {
				src: 'temaki/shield',
				title: 'Shield',
				aliases: ['protection', 'safety', 'secure', 'guard', 'defence'],
			},
			siren: {
				src: 'versatiles/siren',
				title: 'Siren',
				aliases: ['alarm', 'warning', 'emergency', 'civil alert', 'beacon'],
			},
			skyscraper: {
				src: 'maki/building-alt1',
				title: 'Skyscraper',
				aliases: ['high-rise', 'tower', 'office', 'downtown', 'cbd'],
			},
			snowflake: {
				src: 'versatiles/snowflake',
				title: 'Snowflake',
				aliases: ['snow', 'winter', 'frost', 'cold', 'ice'],
			},
			solar_panel: {
				src: 'versatiles/solar_panel',
				title: 'Solar panel',
				aliases: ['photovoltaic', 'pv', 'renewable', 'energy', 'solar power'],
			},
			speaker: {
				src: 'temaki/speaker',
				title: 'Speaker',
				aliases: ['loudspeaker', 'sound', 'audio', 'announcement', 'pa'],
			},
			speech_bubble: {
				src: 'versatiles/speech_bubble',
				title: 'Speech bubble',
				aliases: ['comment', 'quote', 'story', 'testimony', 'chat', 'message'],
			},
			stamp: {
				src: 'temaki/stamp',
				title: 'Postage stamp',
				aliases: ['postage', 'rally', 'collected', 'philately', 'mark'],
			},
			sun: { src: 'versatiles/sun', title: 'Sun', aliases: ['sunny', 'clear', 'fair', 'daylight', 'weather'] },
			surfer: {
				src: 'temaki/surfing',
				title: 'Rider on a surfboard',
				aliases: ['surfing', 'surfboard', 'waves', 'watersport', 'beach'],
			},
			taxi: { src: 'maki/taxi', title: 'Taxi', aliases: ['cab', 'ride', 'hire', 'minicab', 'private hire'] },
			thermometer: {
				src: 'versatiles/thermometer',
				title: 'Thermometer',
				aliases: ['temperature', 'heat', 'sensor', 'degrees', 'weather'],
			},
			ticket: { src: 'temaki/ticket', title: 'Ticket', aliases: ['admission', 'entry', 'event', 'booking', 'pass'] },
			tornado: {
				src: 'versatiles/tornado',
				title: 'Tornado',
				aliases: ['twister', 'cyclone', 'funnel', 'storm', 'hazard'],
			},
			traffic_light: {
				src: 'temaki/traffic_signals',
				title: 'Traffic light',
				aliases: ['signals', 'junction', 'crossing', 'signalised'],
			},
			tree: { src: 'maki/park', title: 'Tree', aliases: ['broadleaf', 'park', 'wood', 'forest', 'deciduous', 'green'] },
			truck: { src: 'temaki/truck', title: 'Truck', aliases: ['lorry', 'freight', 'haulage', 'delivery', 'logistics'] },
			tunnel: { src: 'maki/tunnel', title: 'Tunnel', aliases: ['underpass', 'portal', 'bore', 'subway'] },
			umbrella: {
				src: 'versatiles/umbrella',
				title: 'Umbrella',
				aliases: ['rain', 'shelter', 'parasol', 'wet weather'],
			},
			van: { src: 'versatiles/van', title: 'Van', aliases: ['minibus', 'delivery', 'shuttle', 'commercial vehicle'] },
			warehouse: {
				src: 'maki/warehouse',
				title: 'Warehouse',
				aliases: ['storage', 'depot', 'logistics', 'distribution', 'shed'],
			},
			warning: {
				src: 'maki/caution',
				title: 'Hazard triangle',
				aliases: ['caution', 'hazard', 'danger', 'alert', 'attention'],
			},
			wave: { src: 'versatiles/wave', title: 'Wave', aliases: ['sea', 'surf', 'swell', 'coast', 'ocean'] },
			whale: {
				src: 'temaki/whale_watching',
				title: 'Whale',
				aliases: ['marine mammal', 'whale watching', 'ocean', 'cetacean'],
			},
			wheelchair: {
				src: 'maki/wheelchair',
				title: 'Wheelchair',
				aliases: ['accessible', 'accessibility', 'step-free', 'disabled', 'barrier-free'],
			},
			wifi: {
				src: 'versatiles/wifi',
				title: 'Wifi signal',
				aliases: ['wireless', 'internet', 'hotspot', 'wlan', 'connectivity'],
			},
			wind: { src: 'versatiles/wind', title: 'Wind flow lines', aliases: ['breeze', 'gust', 'airflow', 'weather'] },
			wind_turbine: {
				src: 'temaki/wind_turbine',
				title: 'Wind turbine',
				aliases: ['windfarm', 'renewable', 'energy', 'turbine', 'wind power'],
			},
		},
	},
	// Tileable polygon fills for `fill-pattern`. Not SDF: MapLibre cannot recolour a fill
	// pattern, so these render as drawn. Every tile wraps seamlessly — see SPRITES.md.
	pattern: {
		useSDF: false,
		size: 16,
		icons: {
			checker: {
				src: 'versatiles/checker',
				title: 'Checkerboard fill',
				aliases: ['checkerboard', 'squares', 'chequered', 'fill'],
			},
			crosshatch: {
				src: 'versatiles/crosshatch',
				title: 'Crossed diagonal lines',
				aliases: ['hatching', 'diagonal', 'lattice', 'fill', 'texture'],
			},
			dots: {
				src: 'versatiles/dots',
				title: 'Evenly spaced dot grid',
				aliases: ['dotted', 'stipple', 'points', 'fill', 'texture'],
			},
			grid: {
				src: 'versatiles/grid',
				title: 'Orthogonal grid',
				aliases: ['squares', 'graph', 'mesh', 'lines', 'fill'],
			},
			zigzag: {
				src: 'versatiles/zigzag',
				title: 'Stacked zigzag bands',
				aliases: ['chevron', 'wave', 'sawtooth', 'fill', 'texture'],
			},
		},
	},
	// Map pins, drawn 24×30 with the tip ON the bottom edge so `icon-anchor: "bottom"` puts the
	// point on the coordinate — which is also what `center: [0.5, 1]` tells a picker. `size` is
	// the rendered HEIGHT; the width follows from the source aspect ratio (see Sprite.fromIcons):
	// round(28 × 24/30) = round(22.4) = 22 → 22×28 on the sheet. config/sprites.test.ts guards it.
	pin: {
		size: 28,
		icons: {
			balloon: {
				src: 'versatiles/balloon',
				title: 'Balloon pin',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'round head'],
				center: [0.5, 1],
			},
			balloon_outline: {
				src: 'versatiles/balloon_outline',
				title: 'Balloon pin, outlined',
				aliases: [
					'pin',
					'marker',
					'map pin',
					'location',
					'place',
					'point',
					'round head',
					'balloon',
					'outline',
					'hollow',
				],
				center: [0.5, 1],
			},
			teardrop: {
				src: 'versatiles/teardrop',
				title: 'Map pin',
				aliases: ['pin', 'marker', 'location', 'place', 'point'],
				center: [0.5, 1],
			},
			teardrop_1: {
				src: 'versatiles/teardrop_1',
				title: 'Map pin 1',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '1', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_2: {
				src: 'versatiles/teardrop_2',
				title: 'Map pin 2',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '2', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_3: {
				src: 'versatiles/teardrop_3',
				title: 'Map pin 3',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '3', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_4: {
				src: 'versatiles/teardrop_4',
				title: 'Map pin 4',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '4', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_5: {
				src: 'versatiles/teardrop_5',
				title: 'Map pin 5',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '5', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_6: {
				src: 'versatiles/teardrop_6',
				title: 'Map pin 6',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '6', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_7: {
				src: 'versatiles/teardrop_7',
				title: 'Map pin 7',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '7', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_8: {
				src: 'versatiles/teardrop_8',
				title: 'Map pin 8',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '8', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_9: {
				src: 'versatiles/teardrop_9',
				title: 'Map pin 9',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '9', 'rank', 'stop'],
				center: [0.5, 1],
			},
			teardrop_dot: {
				src: 'versatiles/teardrop_dot',
				title: 'Map pin with a dot',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'dot'],
				center: [0.5, 1],
			},
			teardrop_hole: {
				src: 'versatiles/teardrop_hole',
				title: 'Map pin with a well',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'knockout', 'composable', 'two-layer'],
				center: [0.5, 1],
			},
			teardrop_outline: {
				src: 'versatiles/teardrop_outline',
				title: 'Map pin, outlined',
				aliases: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'outline', 'hollow'],
				center: [0.5, 1],
			},
		},
	},
	shape: {
		size: 22,
		icons: {
			circle: {
				src: 'versatiles/circle',
				title: 'Circle',
				aliases: ['shape', 'geometric', 'category', 'series', 'round', 'disc', 'dot'],
			},
			circle_outline: {
				src: 'versatiles/circle_outline',
				title: 'Circle, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'round', 'disc', 'dot', 'outline', 'hollow', 'stroked'],
			},
			cross: {
				src: 'versatiles/cross',
				title: 'Cross',
				aliases: ['shape', 'geometric', 'category', 'series', 'plus', 'add', 'medical', 'aid'],
			},
			cross_outline: {
				src: 'versatiles/cross_outline',
				title: 'Cross, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'plus',
					'add',
					'medical',
					'aid',
					'outline',
					'hollow',
					'stroked',
				],
			},
			diamond: {
				src: 'versatiles/diamond',
				title: 'Diamond',
				aliases: ['shape', 'geometric', 'category', 'series', 'rhombus', 'rotated square'],
			},
			diamond_outline: {
				src: 'versatiles/diamond_outline',
				title: 'Diamond, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'rhombus',
					'rotated square',
					'outline',
					'hollow',
					'stroked',
				],
			},
			drop: {
				src: 'versatiles/drop',
				title: 'Drop',
				aliases: ['shape', 'geometric', 'category', 'series', 'teardrop', 'water', 'droplet'],
			},
			drop_outline: {
				src: 'versatiles/drop_outline',
				title: 'Drop, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'teardrop',
					'water',
					'droplet',
					'outline',
					'hollow',
					'stroked',
				],
			},
			heart: {
				src: 'maki/heart',
				title: 'Heart',
				aliases: ['shape', 'geometric', 'category', 'series', 'love', 'favourite', 'favorite', 'like'],
			},
			heart_outline: {
				src: 'versatiles/heart_outline',
				title: 'Heart, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'love',
					'favourite',
					'favorite',
					'like',
					'outline',
					'hollow',
					'stroked',
				],
			},
			hexagon: {
				src: 'versatiles/hexagon',
				title: 'Hexagon',
				aliases: ['shape', 'geometric', 'category', 'series', 'six-sided', 'hex'],
			},
			hexagon_outline: {
				src: 'versatiles/hexagon_outline',
				title: 'Hexagon, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'six-sided', 'hex', 'outline', 'hollow', 'stroked'],
			},
			octagon: {
				src: 'versatiles/octagon',
				title: 'Octagon',
				aliases: ['shape', 'geometric', 'category', 'series', 'eight-sided', 'stop'],
			},
			octagon_outline: {
				src: 'versatiles/octagon_outline',
				title: 'Octagon, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'eight-sided', 'stop', 'outline', 'hollow', 'stroked'],
			},
			oval: {
				src: 'versatiles/oval',
				title: 'Oval',
				aliases: ['shape', 'geometric', 'category', 'series', 'ellipse', 'round'],
			},
			oval_outline: {
				src: 'versatiles/oval_outline',
				title: 'Oval, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'ellipse', 'round', 'outline', 'hollow', 'stroked'],
			},
			pentagon: {
				src: 'versatiles/pentagon',
				title: 'Pentagon',
				aliases: ['shape', 'geometric', 'category', 'series', 'five-sided'],
			},
			pentagon_outline: {
				src: 'versatiles/pentagon_outline',
				title: 'Pentagon, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'five-sided', 'outline', 'hollow', 'stroked'],
			},
			rounded_square: {
				src: 'versatiles/rounded_square',
				title: 'Rounded square',
				aliases: ['shape', 'geometric', 'category', 'series', 'box', 'tile', 'rounded'],
			},
			rounded_square_outline: {
				src: 'versatiles/rounded_square_outline',
				title: 'Rounded square, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'box', 'tile', 'rounded', 'outline', 'hollow', 'stroked'],
			},
			square: {
				src: 'versatiles/square',
				title: 'Square',
				aliases: ['shape', 'geometric', 'category', 'series', 'box', 'tile'],
			},
			square_outline: {
				src: 'versatiles/square_outline',
				title: 'Square, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'box', 'tile', 'outline', 'hollow', 'stroked'],
			},
			star: {
				src: 'versatiles/star',
				title: 'Star',
				aliases: ['shape', 'geometric', 'category', 'series', 'favourite', 'favorite', 'rating', 'five-point'],
			},
			star4: {
				src: 'versatiles/star4',
				title: 'Four-point star',
				aliases: ['shape', 'geometric', 'category', 'series', 'sparkle', 'four-point'],
			},
			star4_outline: {
				src: 'versatiles/star4_outline',
				title: 'Four-point star, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'sparkle', 'four-point', 'outline', 'hollow', 'stroked'],
			},
			star6: {
				src: 'versatiles/star6',
				title: 'Six-point star',
				aliases: ['shape', 'geometric', 'category', 'series', 'six-point', 'hexagram'],
			},
			star6_outline: {
				src: 'versatiles/star6_outline',
				title: 'Six-point star, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'six-point', 'hexagram', 'outline', 'hollow', 'stroked'],
			},
			star_outline: {
				src: 'versatiles/star_outline',
				title: 'Star, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'favourite',
					'favorite',
					'rating',
					'five-point',
					'outline',
					'hollow',
					'stroked',
				],
			},
			triangle: {
				src: 'versatiles/triangle',
				title: 'Triangle',
				aliases: ['shape', 'geometric', 'category', 'series', 'three-sided'],
			},
			triangle_outline: {
				src: 'versatiles/triangle_outline',
				title: 'Triangle, outlined',
				aliases: ['shape', 'geometric', 'category', 'series', 'three-sided', 'outline', 'hollow', 'stroked'],
			},
			x: {
				src: 'versatiles/x',
				title: 'X',
				aliases: ['shape', 'geometric', 'category', 'series', 'close', 'cancel', 'remove', 'ex'],
			},
			x_outline: {
				src: 'versatiles/x_outline',
				title: 'X, outlined',
				aliases: [
					'shape',
					'geometric',
					'category',
					'series',
					'close',
					'cancel',
					'remove',
					'ex',
					'outline',
					'hollow',
					'stroked',
				],
			},
		},
	},
	// Directional marks carry a `center` at their TIP, measured off the rendered artwork, so a
	// tool can put the point where the arrow indicates rather than at the middle of its box.
	// `arrow_double` has two tips and `arrow_circle` is a button, so neither declares one.
	symbol: {
		size: 22,
		icons: {
			arrow: {
				src: 'maki/arrow',
				title: 'Arrow',
				aliases: ['direction', 'pointer', 'right', 'thin'],
				center: [0.96, 0.5],
			},
			arrow2: {
				src: 'unknown/arrow2',
				title: 'Arrow2',
				aliases: ['direction', 'pointer', 'block', 'solid'],
				center: [0.93, 0.5],
			},
			arrow3: {
				src: 'unknown/arrow3',
				title: 'Arrow3',
				aliases: ['direction', 'pointer', 'dart'],
				center: [0.93, 0.5],
			},
			arrow_circle: {
				src: 'versatiles/arrow_circle',
				title: 'Arrow in a ring',
				aliases: ['direction', 'button', 'round', 'enclosed'],
			},
			arrow_curved: {
				src: 'versatiles/arrow_curved',
				title: 'Curved arrow',
				aliases: ['turn', 'detour', 'bend', 'route'],
				center: [0.83, 0.25],
			},
			arrow_double: {
				src: 'versatiles/arrow_double',
				title: 'Double arrow',
				aliases: ['bidirectional', 'two-way', 'both ways'],
			},
			arrow_return: {
				src: 'versatiles/arrow_return',
				title: 'Return arrow',
				aliases: ['back', 'undo', 'u-turn', 'reverse', 'round trip'],
				center: [0.24, 0.64],
			},
			caret: {
				src: 'versatiles/caret',
				title: 'Caret',
				aliases: ['triangle', 'pointer', 'next', 'expand', 'small'],
				center: [0.7, 0.5],
			},
			chart_bar: {
				src: 'versatiles/chart_bar',
				title: 'Bar chart',
				aliases: ['statistics', 'data', 'graph', 'analytics', 'bars'],
			},
			chart_line: {
				src: 'versatiles/chart_line',
				title: 'Line chart',
				aliases: ['statistics', 'data', 'graph', 'analytics', 'trend', 'series'],
			},
			chart_pie: {
				src: 'versatiles/chart_pie',
				title: 'Pie chart',
				aliases: ['statistics', 'data', 'graph', 'analytics', 'share', 'proportion'],
			},
			check: {
				src: 'versatiles/check',
				title: 'Check',
				aliases: ['tick', 'done', 'confirm', 'yes', 'verified', 'available'],
			},
			chevron: {
				src: 'versatiles/chevron',
				title: 'Chevron',
				aliases: ['angle', 'flow', 'next', 'direction'],
				center: [0.75, 0.5],
			},
			chevron_double: {
				src: 'versatiles/chevron_double',
				title: 'Double chevron',
				aliases: ['fast', 'skip', 'flow', 'direction'],
				center: [0.86, 0.5],
			},
			crosshair: {
				src: 'versatiles/crosshair',
				title: 'Crosshair',
				aliases: ['target', 'precision', 'locate', 'aim', 'measurement'],
			},
			dot: { src: 'versatiles/dot', title: 'Dot', aliases: ['point', 'bullet', 'small', 'data point'] },
			entrance: {
				src: 'maki/entrance-alt1',
				title: 'Entrance',
				aliases: ['enter', 'way in', 'access', 'door', 'login'],
			},
			exclamation: {
				src: 'versatiles/exclamation',
				title: 'Exclamation',
				aliases: ['attention', 'alert', 'important', 'notice'],
			},
			minus: { src: 'versatiles/minus', title: 'Minus', aliases: ['remove', 'subtract', 'less', 'negative', 'closed'] },
			percent: { src: 'versatiles/percent', title: 'Percent', aliases: ['share', 'proportion', 'rate', 'statistics'] },
			question: { src: 'versatiles/question', title: 'Question', aliases: ['unknown', 'help', 'unconfirmed', 'query'] },
			slash: {
				src: 'versatiles/slash',
				title: 'Slash',
				aliases: ['cancelled', 'struck through', 'disabled', 'out of service'],
			},
			trend_down: {
				src: 'versatiles/trend_down',
				title: 'Trend down',
				aliases: ['decrease', 'fall', 'decline', 'negative', 'statistics'],
				center: [0.89, 0.8],
			},
			trend_up: {
				src: 'versatiles/trend_up',
				title: 'Trend up',
				aliases: ['increase', 'rise', 'growth', 'positive', 'statistics'],
				center: [0.89, 0.19],
			},
		},
	},
};

export default icons;

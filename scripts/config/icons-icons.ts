// Icons for the `icons` sheet — the public, add-only pictograms developers place themselves.
//
// The sheet has a single group, and its sprite names carry no group prefix: the key is the sprite
// name (`icons:<key>`), the value is the file it is drawn from, relative to `icons/` and without the
// `.svg`. Files are organized by PROVENANCE and keep their upstream filename, so the two are
// deliberately independent — see SPRITES.md.
//
// `title` and `aliases` are published INSIDE the sprite JSON, so a picker needs no second request.
// Every entry needs a title and config/sprites.test.ts fails without one; aliases are the other
// terms someone might type.

import type { IconSets } from '../lib/icons.js';

const icons: IconSets = {
	icon: {
		size: 22,
		prefix: false,
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
};

export default icons;

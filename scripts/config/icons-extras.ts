// Icons for the `extras` sheet — the public, add-only set developers place themselves.
//
// The key is the sprite name (`extras:<group>-<key>`), the value is the file it is drawn from,
// relative to `icons/` and without the `.svg`. Files are organized by PROVENANCE and keep their
// upstream filename, so the two are deliberately independent — see SPRITES.md.
//
// Every entry needs `tags` and a `description`: they are emitted as `extras.meta.json` beside the
// sheet so an icon picker can offer search, and extras-api.test.ts fails without them. Tags are the
// terms someone would type that are NOT already the icon's name.
import type { IconSets } from '../lib/icons.js';

const icons: IconSets = {
	badge: {
		size: 22,
		icons: {
			number_0: {
				src: 'versatiles/number_0',
				tags: ['badge', 'number', 'digit', '0', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 0 knocked out',
			},
			number_0_outline: {
				src: 'versatiles/number_0_outline',
				tags: ['badge', 'number', 'digit', '0', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 0',
			},
			number_1: {
				src: 'versatiles/number_1',
				tags: ['badge', 'number', 'digit', '1', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 1 knocked out',
			},
			number_1_outline: {
				src: 'versatiles/number_1_outline',
				tags: ['badge', 'number', 'digit', '1', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 1',
			},
			number_2: {
				src: 'versatiles/number_2',
				tags: ['badge', 'number', 'digit', '2', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 2 knocked out',
			},
			number_2_outline: {
				src: 'versatiles/number_2_outline',
				tags: ['badge', 'number', 'digit', '2', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 2',
			},
			number_3: {
				src: 'versatiles/number_3',
				tags: ['badge', 'number', 'digit', '3', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 3 knocked out',
			},
			number_3_outline: {
				src: 'versatiles/number_3_outline',
				tags: ['badge', 'number', 'digit', '3', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 3',
			},
			number_4: {
				src: 'versatiles/number_4',
				tags: ['badge', 'number', 'digit', '4', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 4 knocked out',
			},
			number_4_outline: {
				src: 'versatiles/number_4_outline',
				tags: ['badge', 'number', 'digit', '4', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 4',
			},
			number_5: {
				src: 'versatiles/number_5',
				tags: ['badge', 'number', 'digit', '5', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 5 knocked out',
			},
			number_5_outline: {
				src: 'versatiles/number_5_outline',
				tags: ['badge', 'number', 'digit', '5', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 5',
			},
			number_6: {
				src: 'versatiles/number_6',
				tags: ['badge', 'number', 'digit', '6', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 6 knocked out',
			},
			number_6_outline: {
				src: 'versatiles/number_6_outline',
				tags: ['badge', 'number', 'digit', '6', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 6',
			},
			number_7: {
				src: 'versatiles/number_7',
				tags: ['badge', 'number', 'digit', '7', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 7 knocked out',
			},
			number_7_outline: {
				src: 'versatiles/number_7_outline',
				tags: ['badge', 'number', 'digit', '7', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 7',
			},
			number_8: {
				src: 'versatiles/number_8',
				tags: ['badge', 'number', 'digit', '8', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 8 knocked out',
			},
			number_8_outline: {
				src: 'versatiles/number_8_outline',
				tags: ['badge', 'number', 'digit', '8', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 8',
			},
			number_9: {
				src: 'versatiles/number_9',
				tags: ['badge', 'number', 'digit', '9', 'numbered', 'rank', 'step', 'stop', 'legend'],
				description: 'A filled disc with the numeral 9 knocked out',
			},
			number_9_outline: {
				src: 'versatiles/number_9_outline',
				tags: ['badge', 'number', 'digit', '9', 'numbered', 'rank', 'step', 'stop', 'legend', 'outline'],
				description: 'A ring with a solid numeral 9',
			},
		},
	},
	icon: {
		size: 22,
		icons: {
			ambulance: {
				src: 'versatiles/ambulance',
				tags: ['emergency', 'paramedic', 'rescue', 'hospital', '999', '112'],
				description: 'An ambulance in profile',
			},
			anchor: {
				src: 'maki/harbor',
				tags: ['harbour', 'harbor', 'marina', 'mooring', 'port', 'boat', 'nautical'],
				description: 'An anchor',
			},
			apartment: {
				src: 'maki/residential-community',
				tags: ['flats', 'housing', 'residential', 'rent', 'block'],
				description: 'An apartment',
			},
			avalanche: {
				src: 'versatiles/avalanche',
				tags: ['snowslide', 'hazard', 'mountain', 'danger', 'alpine'],
				description: 'An avalanche',
			},
			ballot_box: {
				src: 'versatiles/ballot_box',
				tags: ['vote', 'election', 'polling', 'referendum', 'democracy'],
				description: 'A ballot going into a sealed box',
			},
			battery: {
				src: 'versatiles/battery',
				tags: ['power', 'energy', 'storage', 'charge', 'accumulator'],
				description: 'A battery',
			},
			bbq: { src: 'maki/bbq', tags: ['barbecue', 'grill', 'picnic', 'cookout'], description: 'A bbq' },
			beach: {
				src: 'maki/beach',
				tags: ['coast', 'seaside', 'sand', 'palm', 'shore', 'holiday'],
				description: 'A beach',
			},
			bee: { src: 'versatiles/bee', tags: ['pollinator', 'apiary', 'hive', 'honey', 'insect'], description: 'A bee' },
			bicycle: { src: 'maki/bicycle', tags: ['bike', 'cycling', 'cycle', 'ride', 'velo'], description: 'A bicycle' },
			binoculars: {
				src: 'temaki/binoculars',
				tags: ['observation', 'birdwatching', 'hide', 'lookout', 'optics'],
				description: 'A pair of binoculars',
			},
			bird: {
				src: 'versatiles/bird',
				tags: ['birdwatching', 'ornithology', 'wildlife', 'fowl'],
				description: 'A bird',
			},
			bookmark: {
				src: 'versatiles/bookmark',
				tags: ['save', 'saved', 'favourite', 'favorite', 'ribbon', 'flag'],
				description: 'A bookmark',
			},
			bridge: { src: 'maki/bridge', tags: ['crossing', 'span', 'viaduct', 'overpass'], description: 'A bridge' },
			building: { src: 'maki/building', tags: ['office', 'block', 'premises', 'structure'], description: 'A building' },
			buoy: { src: 'temaki/buoy', tags: ['navigation', 'marker', 'sea', 'float', 'nautical'], description: 'A buoy' },
			bus_stop: {
				src: 'versatiles/bus_stop',
				tags: ['transit', 'public transport', 'stop', 'pole', 'shelter'],
				description: 'A stop sign on a pole',
			},
			butterfly: {
				src: 'versatiles/butterfly',
				tags: ['insect', 'pollinator', 'wildlife', 'moth'],
				description: 'A butterfly',
			},
			cable_car: {
				src: 'maki/aerialway',
				tags: ['gondola', 'aerialway', 'ropeway', 'lift', 'ski'],
				description: 'A gondola hanging from its cable',
			},
			calculator: {
				src: 'versatiles/calculator',
				tags: ['maths', 'math', 'cost', 'estimate', 'compute'],
				description: 'A calculator',
			},
			calendar: {
				src: 'versatiles/calendar',
				tags: ['date', 'event', 'schedule', 'when', 'booking'],
				description: 'A calendar',
			},
			camera: { src: 'versatiles/camera', tags: ['photo', 'photography', 'picture', 'shot'], description: 'A camera' },
			car: { src: 'maki/car', tags: ['vehicle', 'automobile', 'drive', 'motor', 'traffic'], description: 'A car' },
			cat: { src: 'maki/animal-shelter', tags: ['pet', 'animal', 'feline', 'shelter'], description: 'A cat' },
			charging_station: {
				src: 'maki/charging-station',
				tags: ['ev', 'electric vehicle', 'charger', 'plug', 'bolt', 'e-car'],
				description: 'A charging bolt',
			},
			child: {
				src: 'versatiles/child',
				tags: ['kid', 'children', 'family', 'young', 'playground'],
				description: 'A child',
			},
			clock: {
				src: 'temaki/clock',
				tags: ['time', 'hours', 'opening times', 'schedule', 'duration'],
				description: 'A clock',
			},
			cloud: { src: 'versatiles/cloud', tags: ['overcast', 'weather', 'sky', 'cloudy'], description: 'A cloud' },
			cloud_sun: {
				src: 'versatiles/cloud_sun',
				tags: ['partly cloudy', 'weather', 'forecast', 'fair'],
				description: 'Sun behind a cloud',
			},
			co2: {
				src: 'versatiles/co2',
				tags: ['carbon', 'emissions', 'greenhouse', 'climate', 'molecule'],
				description: 'A linear O=C=O molecule',
			},
			coin: { src: 'versatiles/coin', tags: ['money', 'cash', 'currency', 'payment', 'change'], description: 'A coin' },
			compass: {
				src: 'temaki/compass',
				tags: ['orientation', 'bearing', 'navigation', 'north', 'direction'],
				description: 'A compass',
			},
			conifer: {
				src: 'maki/park-alt1',
				tags: ['tree', 'pine', 'fir', 'evergreen', 'forest', 'needleleaf'],
				description: 'A conifer',
			},
			cow: {
				src: 'maki/slaughterhouse',
				tags: ['cattle', 'livestock', 'farm', 'dairy', 'pasture', 'bovine'],
				description: 'A cow in profile',
			},
			crane: {
				src: 'temaki/crane',
				tags: ['construction', 'building site', 'development', 'works'],
				description: 'A crane',
			},
			credit_card: {
				src: 'versatiles/credit_card',
				tags: ['payment', 'cashless', 'card', 'debit', 'pay'],
				description: 'A payment card with a chip',
			},
			dam: { src: 'maki/dam', tags: ['reservoir', 'hydro', 'water', 'barrage', 'weir'], description: 'A dam' },
			deer: {
				src: 'versatiles/deer',
				tags: ['wildlife', 'stag', 'game', 'antlers', 'forest'],
				description: 'A deer head with antlers',
			},
			dollar: {
				src: 'versatiles/dollar',
				tags: ['money', 'currency', 'usd', 'price', 'cost'],
				description: 'A dollar',
			},
			download: {
				src: 'versatiles/download',
				tags: ['save', 'export', 'get', 'file', 'arrow down'],
				description: 'A download arrow into a tray',
			},
			droplet: { src: 'maki/water', tags: ['water', 'drop', 'rain', 'liquid', 'moisture'], description: 'A droplet' },
			eclipse: {
				src: 'versatiles/eclipse',
				tags: ['solar', 'corona', 'astronomy', 'totality', 'sun'],
				description: 'A corona ring with rays — the moon covering the sun',
			},
			euro: { src: 'versatiles/euro', tags: ['money', 'currency', 'eur', 'price', 'cost'], description: 'An euro' },
			eye: {
				src: 'versatiles/eye',
				tags: ['view', 'visible', 'watch', 'observe', 'see', 'preview'],
				description: 'An eye',
			},
			factory: {
				src: 'maki/industry',
				tags: ['industry', 'industrial', 'plant', 'works', 'manufacturing', 'chimney'],
				description: 'A factory',
			},
			family: {
				src: 'versatiles/family',
				tags: ['people', 'household', 'parents', 'group', 'together'],
				description: 'A family group',
			},
			fence: {
				src: 'maki/fence',
				tags: ['boundary', 'enclosure', 'barrier', 'property', 'paling'],
				description: 'A fence',
			},
			ferry: {
				src: 'maki/ferry',
				tags: ['boat', 'ship', 'crossing', 'water transport', 'passenger'],
				description: 'A ferry',
			},
			filter: {
				src: 'versatiles/filter',
				tags: ['funnel', 'facet', 'refine', 'narrow', 'sort'],
				description: 'A funnel',
			},
			fire: { src: 'versatiles/fire', tags: ['flame', 'wildfire', 'burn', 'blaze', 'hazard'], description: 'A fire' },
			fire_truck: {
				src: 'versatiles/fire_truck',
				tags: ['fire engine', 'brigade', 'emergency', 'rescue'],
				description: 'A fire truck',
			},
			first_aid: {
				src: 'versatiles/first_aid',
				tags: ['medical', 'kit', 'aid post', 'health', 'emergency'],
				description: 'A first aid case marked with a cross',
			},
			fish: {
				src: 'maki/aquarium',
				tags: ['aquarium', 'marine', 'angling', 'fishing', 'sea life'],
				description: 'A fish',
			},
			flood: {
				src: 'versatiles/flood',
				tags: ['inundation', 'high water', 'hazard', 'deluge', 'water level'],
				description: 'A flood',
			},
			flower: {
				src: 'versatiles/flower',
				tags: ['bloom', 'blossom', 'meadow', 'garden', 'floral'],
				description: 'A flower',
			},
			fog: { src: 'versatiles/fog', tags: ['mist', 'haze', 'visibility', 'weather'], description: 'Fog bands' },
			footprint: {
				src: 'versatiles/footprint',
				tags: ['trail', 'hiking', 'walk', 'track', 'path'],
				description: 'A bare human footprint — use paw for animal tracks',
			},
			globe: {
				src: 'maki/globe',
				tags: ['world', 'international', 'website', 'earth', 'global'],
				description: 'A globe',
			},
			guitar: {
				src: 'versatiles/guitar',
				tags: ['music', 'live music', 'band', 'instrument', 'gig'],
				description: 'A guitar',
			},
			headphones: {
				src: 'versatiles/headphones',
				tags: ['audio', 'audio guide', 'listen', 'podcast', 'sound'],
				description: 'Headphones',
			},
			heat_pump: {
				src: 'versatiles/heat_pump',
				tags: ['heating', 'climate', 'hvac', 'renewable', 'energy'],
				description: 'An outdoor heat pump unit',
			},
			helicopter: {
				src: 'maki/heliport',
				tags: ['heliport', 'air ambulance', 'rotor', 'aviation'],
				description: 'A helicopter',
			},
			helping_hand: {
				src: 'versatiles/helping_hand',
				tags: ['volunteer', 'care', 'support', 'charity', 'donate'],
				description: 'A cupped palm beneath a heart',
			},
			horse_riding: {
				src: 'maki/horse-riding',
				tags: ['equestrian', 'stables', 'rider', 'pony', 'bridleway'],
				description: 'A horse and rider',
			},
			hot_air_balloon: {
				src: 'versatiles/hot_air_balloon',
				tags: ['ballooning', 'flight', 'aviation', 'sightseeing'],
				description: 'A hot air balloon with its basket',
			},
			house: { src: 'maki/home', tags: ['home', 'dwelling', 'residential', 'property'], description: 'A house' },
			key: { src: 'versatiles/key', tags: ['access', 'rental', 'unlock', 'let', 'tenancy'], description: 'A key' },
			layers: {
				src: 'versatiles/layers',
				tags: ['stack', 'overlay', 'levels', 'toggle'],
				description: 'Stacked layers',
			},
			leaf: {
				src: 'versatiles/leaf',
				tags: ['nature', 'organic', 'eco', 'green', 'renewable', 'vegan'],
				description: 'A leaf',
			},
			lifebuoy: {
				src: 'versatiles/lifebuoy',
				tags: ['rescue', 'safety', 'lifeguard', 'ring', 'supervised'],
				description: 'A lifebuoy',
			},
			lightning: {
				src: 'versatiles/lightning',
				tags: ['thunderstorm', 'strike', 'bolt', 'storm', 'electric'],
				description: 'A lightning',
			},
			link: {
				src: 'versatiles/link',
				tags: ['url', 'chain', 'reference', 'external', 'connect'],
				description: 'A link',
			},
			lock: {
				src: 'temaki/lock',
				tags: ['secure', 'private', 'restricted', 'padlock', 'members only'],
				description: 'A lock',
			},
			mail: {
				src: 'versatiles/mail',
				tags: ['email', 'envelope', 'contact', 'letter', 'message'],
				description: 'A mail',
			},
			megaphone: {
				src: 'versatiles/megaphone',
				tags: ['announcement', 'demonstration', 'loudspeaker', 'protest', 'shout'],
				description: 'A megaphone',
			},
			microphone: {
				src: 'maki/karaoke',
				tags: ['karaoke', 'recording', 'audio', 'speak', 'sing'],
				description: 'A microphone',
			},
			moon: { src: 'versatiles/moon', tags: ['night', 'lunar', 'after dark', 'astronomy'], description: 'A moon' },
			motorcycle: {
				src: 'temaki/motorcycle',
				tags: ['motorbike', 'bike', 'moped', 'rider'],
				description: 'A motorcycle',
			},
			mountain: {
				src: 'maki/mountain',
				tags: ['peak', 'summit', 'alpine', 'hiking', 'elevation'],
				description: 'A mountain',
			},
			museum: {
				src: 'maki/museum',
				tags: ['gallery', 'exhibition', 'culture', 'heritage', 'collection'],
				description: 'A museum',
			},
			mushroom: {
				src: 'versatiles/mushroom',
				tags: ['fungus', 'foraging', 'toadstool', 'forest'],
				description: 'A mushroom',
			},
			music: { src: 'maki/music', tags: ['notes', 'song', 'audio', 'concert', 'sound'], description: 'A music' },
			no_entry: {
				src: 'maki/roadblock',
				tags: ['forbidden', 'closed', 'roadblock', 'restricted', 'do not enter'],
				description: 'A no-entry sign',
			},
			nuclear: {
				src: 'temaki/cooling_tower_radiation',
				tags: ['reactor', 'atomic', 'cooling tower', 'radiation', 'power'],
				description: 'A cooling tower marked with the radiation trefoil',
			},
			palette: {
				src: 'versatiles/palette',
				tags: ['art', 'painting', 'creative', 'colours', 'colors', 'studio'],
				description: 'A palette',
			},
			parking: { src: 'maki/parking', tags: ['car park', 'park', 'p', 'garage', 'space'], description: 'A parking' },
			paw: {
				src: 'versatiles/paw',
				tags: ['animal', 'pet', 'wildlife', 'dog friendly', 'track'],
				description: 'An animal paw print — use footprint for human trails',
			},
			pedestrian: {
				src: 'versatiles/pedestrian',
				tags: ['walking', 'foot', 'walk', 'isochrone', 'on foot'],
				description: 'A pedestrian',
			},
			person: {
				src: 'versatiles/person',
				tags: ['people', 'user', 'individual', 'human', 'someone'],
				description: 'A person',
			},
			play: {
				src: 'versatiles/play',
				tags: ['media', 'video', 'audio', 'start', 'watch'],
				description: 'A play triangle in a rounded square',
			},
			plug: {
				src: 'versatiles/plug',
				tags: ['socket', 'power', 'electricity', 'outlet', 'mains'],
				description: 'A plug',
			},
			police_car: {
				src: 'versatiles/police_car',
				tags: ['patrol', 'emergency', 'law enforcement', '999'],
				description: 'A police car',
			},
			power_plant: {
				src: 'temaki/cooling_tower',
				tags: ['cooling tower', 'generation', 'energy', 'electricity', 'station'],
				description: 'A power station cooling tower',
			},
			power_pole: {
				src: 'temaki/power_pole',
				tags: ['pylon', 'transmission', 'grid', 'overhead line', 'utility'],
				description: 'A transmission pylon',
			},
			price_tag: {
				src: 'versatiles/price_tag',
				tags: ['offer', 'label', 'cost', 'sale', 'pricing'],
				description: 'A price tag with its hole',
			},
			quay: {
				src: 'temaki/quay',
				tags: ['dock', 'wharf', 'harbour', 'harbor', 'pier', 'waterfront'],
				description: 'A quay edge at the waterline',
			},
			radiation: {
				src: 'temaki/radiation',
				tags: ['radioactive', 'nuclear', 'trefoil', 'hazard', 'fallout'],
				description: 'The radiation trefoil',
			},
			radiator: {
				src: 'versatiles/radiator',
				tags: ['heating', 'district heating', 'warmth', 'central heating'],
				description: 'A radiator',
			},
			rain: {
				src: 'versatiles/rain',
				tags: ['shower', 'precipitation', 'wet', 'weather', 'forecast'],
				description: 'A cloud with rain',
			},
			rainbow: {
				src: 'versatiles/rainbow',
				tags: ['pride', 'lgbtq', 'queer', 'diversity', 'inclusive'],
				description: 'A rainbow',
			},
			raised_fist: {
				src: 'versatiles/raised_fist',
				tags: ['protest', 'solidarity', 'demonstration', 'activism', 'resistance'],
				description: 'A raised fist',
			},
			receipt: {
				src: 'versatiles/receipt',
				tags: ['invoice', 'bill', 'itemised', 'expenses', 'proof'],
				description: 'A receipt',
			},
			rocket: { src: 'maki/rocket', tags: ['launch', 'space', 'startup', 'fast', 'boost'], description: 'A rocket' },
			roundabout: {
				src: 'versatiles/roundabout',
				tags: ['junction', 'traffic circle', 'intersection', 'circular'],
				description: 'A roundabout',
			},
			ruler: {
				src: 'versatiles/ruler',
				tags: ['measure', 'distance', 'scale', 'length', 'dimension'],
				description: 'A ruler',
			},
			sailboat: {
				src: 'temaki/sailboat',
				tags: ['sailing', 'yacht', 'boat', 'marina', 'watersport'],
				description: 'A sailboat',
			},
			scooter: {
				src: 'maki/scooter',
				tags: ['e-scooter', 'moped', 'kick scooter', 'micromobility', 'sharing'],
				description: 'A scooter',
			},
			scuba_diver: {
				src: 'temaki/scuba_diving',
				tags: ['diving', 'dive site', 'snorkel', 'underwater', 'sub-aqua'],
				description: 'A diver in scuba gear',
			},
			search: {
				src: 'versatiles/search',
				tags: ['find', 'magnifier', 'lookup', 'query', 'explore'],
				description: 'A magnifier',
			},
			share: {
				src: 'versatiles/share',
				tags: ['send', 'network', 'social', 'distribute', 'forward'],
				description: 'A share network',
			},
			shield: {
				src: 'temaki/shield',
				tags: ['protection', 'safety', 'secure', 'guard', 'defence'],
				description: 'A shield',
			},
			siren: {
				src: 'versatiles/siren',
				tags: ['alarm', 'warning', 'emergency', 'civil alert', 'beacon'],
				description: 'A siren',
			},
			skyscraper: {
				src: 'maki/building-alt1',
				tags: ['high-rise', 'tower', 'office', 'downtown', 'cbd'],
				description: 'A skyscraper',
			},
			snowflake: {
				src: 'versatiles/snowflake',
				tags: ['snow', 'winter', 'frost', 'cold', 'ice'],
				description: 'A snowflake',
			},
			solar_panel: {
				src: 'versatiles/solar_panel',
				tags: ['photovoltaic', 'pv', 'renewable', 'energy', 'solar power'],
				description: 'A tilted photovoltaic array',
			},
			speaker: {
				src: 'temaki/speaker',
				tags: ['loudspeaker', 'sound', 'audio', 'announcement', 'pa'],
				description: 'A speaker',
			},
			speech_bubble: {
				src: 'versatiles/speech_bubble',
				tags: ['comment', 'quote', 'story', 'testimony', 'chat', 'message'],
				description: 'A speech bubble with a tail',
			},
			stamp: {
				src: 'temaki/stamp',
				tags: ['postage', 'rally', 'collected', 'philately', 'mark'],
				description: 'A postage stamp',
			},
			sun: { src: 'versatiles/sun', tags: ['sunny', 'clear', 'fair', 'daylight', 'weather'], description: 'A sun' },
			surfer: {
				src: 'temaki/surfing',
				tags: ['surfing', 'surfboard', 'waves', 'watersport', 'beach'],
				description: 'A rider on a surfboard',
			},
			taxi: { src: 'maki/taxi', tags: ['cab', 'ride', 'hire', 'minicab', 'private hire'], description: 'A taxi' },
			thermometer: {
				src: 'versatiles/thermometer',
				tags: ['temperature', 'heat', 'sensor', 'degrees', 'weather'],
				description: 'A thermometer',
			},
			ticket: {
				src: 'temaki/ticket',
				tags: ['admission', 'entry', 'event', 'booking', 'pass'],
				description: 'A ticket',
			},
			tornado: {
				src: 'versatiles/tornado',
				tags: ['twister', 'cyclone', 'funnel', 'storm', 'hazard'],
				description: 'A tornado',
			},
			traffic_light: {
				src: 'temaki/traffic_signals',
				tags: ['signals', 'junction', 'crossing', 'signalised'],
				description: 'A three-aspect traffic signal',
			},
			tree: {
				src: 'maki/park',
				tags: ['broadleaf', 'park', 'wood', 'forest', 'deciduous', 'green'],
				description: 'A tree',
			},
			truck: {
				src: 'temaki/truck',
				tags: ['lorry', 'freight', 'haulage', 'delivery', 'logistics'],
				description: 'A truck',
			},
			tunnel: { src: 'maki/tunnel', tags: ['underpass', 'portal', 'bore', 'subway'], description: 'A tunnel' },
			umbrella: {
				src: 'versatiles/umbrella',
				tags: ['rain', 'shelter', 'parasol', 'wet weather'],
				description: 'An umbrella',
			},
			van: {
				src: 'versatiles/van',
				tags: ['minibus', 'delivery', 'shuttle', 'commercial vehicle'],
				description: 'A van',
			},
			warehouse: {
				src: 'maki/warehouse',
				tags: ['storage', 'depot', 'logistics', 'distribution', 'shed'],
				description: 'A warehouse',
			},
			warning: {
				src: 'maki/caution',
				tags: ['caution', 'hazard', 'danger', 'alert', 'attention'],
				description: 'A hazard triangle',
			},
			wave: { src: 'versatiles/wave', tags: ['sea', 'surf', 'swell', 'coast', 'ocean'], description: 'A wave' },
			whale: {
				src: 'temaki/whale_watching',
				tags: ['marine mammal', 'whale watching', 'ocean', 'cetacean'],
				description: 'A whale',
			},
			wheelchair: {
				src: 'maki/wheelchair',
				tags: ['accessible', 'accessibility', 'step-free', 'disabled', 'barrier-free'],
				description: 'A wheelchair',
			},
			wifi: {
				src: 'versatiles/wifi',
				tags: ['wireless', 'internet', 'hotspot', 'wlan', 'connectivity'],
				description: 'A wifi signal',
			},
			wind: { src: 'versatiles/wind', tags: ['breeze', 'gust', 'airflow', 'weather'], description: 'Wind flow lines' },
			wind_turbine: {
				src: 'temaki/wind_turbine',
				tags: ['windfarm', 'renewable', 'energy', 'turbine', 'wind power'],
				description: 'A three-blade wind turbine',
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
				tags: ['checkerboard', 'squares', 'chequered', 'fill'],
				description: 'A checkerboard fill',
			},
			crosshatch: {
				src: 'versatiles/crosshatch',
				tags: ['hatching', 'diagonal', 'lattice', 'fill', 'texture'],
				description: 'Crossed diagonal lines',
			},
			dots: {
				src: 'versatiles/dots',
				tags: ['dotted', 'stipple', 'points', 'fill', 'texture'],
				description: 'An evenly spaced dot grid',
			},
			grid: {
				src: 'versatiles/grid',
				tags: ['squares', 'graph', 'mesh', 'lines', 'fill'],
				description: 'An orthogonal grid',
			},
			zigzag: {
				src: 'versatiles/zigzag',
				tags: ['chevron', 'wave', 'sawtooth', 'fill', 'texture'],
				description: 'Stacked zigzag bands',
			},
		},
	},
	// Map pins, drawn 24×30 with the tip ON the bottom edge so `icon-anchor: "bottom"` puts the
	// point on the coordinate. `size` is the rendered HEIGHT; the width follows from the source
	// aspect ratio (see Sprite.fromIcons): round(28 × 24/30) = round(22.4) = 22 → 22×28 on the
	// sheet. A source at a different aspect silently changes that width — config/sprites.test.ts
	// guards it.
	pin: {
		size: 28,
		icons: {
			balloon: {
				src: 'versatiles/balloon',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'round head'],
				description: 'A map pin with a round head on a narrow neck',
			},
			balloon_outline: {
				src: 'versatiles/balloon_outline',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'round head', 'balloon', 'outline', 'hollow'],
				description: 'A map pin with a round head on a narrow neck, outlined',
			},
			teardrop: {
				src: 'versatiles/teardrop',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point'],
				description: 'A map pin that tapers smoothly to its point',
			},
			teardrop_1: {
				src: 'versatiles/teardrop_1',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '1', 'rank', 'stop'],
				description: 'A map pin with the numeral 1 knocked out of its head',
			},
			teardrop_2: {
				src: 'versatiles/teardrop_2',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '2', 'rank', 'stop'],
				description: 'A map pin with the numeral 2 knocked out of its head',
			},
			teardrop_3: {
				src: 'versatiles/teardrop_3',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '3', 'rank', 'stop'],
				description: 'A map pin with the numeral 3 knocked out of its head',
			},
			teardrop_4: {
				src: 'versatiles/teardrop_4',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '4', 'rank', 'stop'],
				description: 'A map pin with the numeral 4 knocked out of its head',
			},
			teardrop_5: {
				src: 'versatiles/teardrop_5',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '5', 'rank', 'stop'],
				description: 'A map pin with the numeral 5 knocked out of its head',
			},
			teardrop_6: {
				src: 'versatiles/teardrop_6',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '6', 'rank', 'stop'],
				description: 'A map pin with the numeral 6 knocked out of its head',
			},
			teardrop_7: {
				src: 'versatiles/teardrop_7',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '7', 'rank', 'stop'],
				description: 'A map pin with the numeral 7 knocked out of its head',
			},
			teardrop_8: {
				src: 'versatiles/teardrop_8',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '8', 'rank', 'stop'],
				description: 'A map pin with the numeral 8 knocked out of its head',
			},
			teardrop_9: {
				src: 'versatiles/teardrop_9',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'numbered', 'number', '9', 'rank', 'stop'],
				description: 'A map pin with the numeral 9 knocked out of its head',
			},
			teardrop_dot: {
				src: 'versatiles/teardrop_dot',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'dot'],
				description: 'A map pin that tapers smoothly to its point',
			},
			teardrop_hole: {
				src: 'versatiles/teardrop_hole',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'knockout', 'composable', 'two-layer'],
				description: 'A pin with a circular well knocked out, for stacking a glyph beneath it',
			},
			teardrop_outline: {
				src: 'versatiles/teardrop_outline',
				tags: ['pin', 'marker', 'map pin', 'location', 'place', 'point', 'outline', 'hollow'],
				description: 'A map pin that tapers smoothly to its point, outlined',
			},
		},
	},
	shape: {
		size: 22,
		icons: {
			circle: {
				src: 'versatiles/circle',
				tags: ['shape', 'geometric', 'category', 'series', 'round', 'disc', 'dot'],
				description: 'A solid circle',
			},
			circle_outline: {
				src: 'versatiles/circle_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'round', 'disc', 'dot', 'outline', 'hollow', 'stroked'],
				description: 'An outlined circle',
			},
			cross: {
				src: 'versatiles/cross',
				tags: ['shape', 'geometric', 'category', 'series', 'plus', 'add', 'medical', 'aid'],
				description: 'A solid cross',
			},
			cross_outline: {
				src: 'versatiles/cross_outline',
				tags: [
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
				description: 'An outlined cross',
			},
			diamond: {
				src: 'versatiles/diamond',
				tags: ['shape', 'geometric', 'category', 'series', 'rhombus', 'rotated square'],
				description: 'A solid diamond',
			},
			diamond_outline: {
				src: 'versatiles/diamond_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'rhombus', 'rotated square', 'outline', 'hollow', 'stroked'],
				description: 'An outlined diamond',
			},
			drop: {
				src: 'versatiles/drop',
				tags: ['shape', 'geometric', 'category', 'series', 'teardrop', 'water', 'droplet'],
				description: 'A solid drop',
			},
			drop_outline: {
				src: 'versatiles/drop_outline',
				tags: [
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
				description: 'An outlined drop',
			},
			heart: {
				src: 'maki/heart',
				tags: ['shape', 'geometric', 'category', 'series', 'love', 'favourite', 'favorite', 'like'],
				description: 'A solid heart',
			},
			heart_outline: {
				src: 'versatiles/heart_outline',
				tags: [
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
				description: 'An outlined heart',
			},
			hexagon: {
				src: 'versatiles/hexagon',
				tags: ['shape', 'geometric', 'category', 'series', 'six-sided', 'hex'],
				description: 'A solid hexagon',
			},
			hexagon_outline: {
				src: 'versatiles/hexagon_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'six-sided', 'hex', 'outline', 'hollow', 'stroked'],
				description: 'An outlined hexagon',
			},
			octagon: {
				src: 'versatiles/octagon',
				tags: ['shape', 'geometric', 'category', 'series', 'eight-sided', 'stop'],
				description: 'A solid octagon',
			},
			octagon_outline: {
				src: 'versatiles/octagon_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'eight-sided', 'stop', 'outline', 'hollow', 'stroked'],
				description: 'An outlined octagon',
			},
			oval: {
				src: 'versatiles/oval',
				tags: ['shape', 'geometric', 'category', 'series', 'ellipse', 'round'],
				description: 'A solid oval',
			},
			oval_outline: {
				src: 'versatiles/oval_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'ellipse', 'round', 'outline', 'hollow', 'stroked'],
				description: 'An outlined oval',
			},
			pentagon: {
				src: 'versatiles/pentagon',
				tags: ['shape', 'geometric', 'category', 'series', 'five-sided'],
				description: 'A solid pentagon',
			},
			pentagon_outline: {
				src: 'versatiles/pentagon_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'five-sided', 'outline', 'hollow', 'stroked'],
				description: 'An outlined pentagon',
			},
			rounded_square: {
				src: 'versatiles/rounded_square',
				tags: ['shape', 'geometric', 'category', 'series', 'box', 'tile', 'rounded'],
				description: 'A solid rounded square',
			},
			rounded_square_outline: {
				src: 'versatiles/rounded_square_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'box', 'tile', 'rounded', 'outline', 'hollow', 'stroked'],
				description: 'An outlined rounded square',
			},
			square: {
				src: 'versatiles/square',
				tags: ['shape', 'geometric', 'category', 'series', 'box', 'tile'],
				description: 'A solid square',
			},
			square_outline: {
				src: 'versatiles/square_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'box', 'tile', 'outline', 'hollow', 'stroked'],
				description: 'An outlined square',
			},
			star: {
				src: 'versatiles/star',
				tags: ['shape', 'geometric', 'category', 'series', 'favourite', 'favorite', 'rating', 'five-point'],
				description: 'A solid star',
			},
			star4: {
				src: 'versatiles/star4',
				tags: ['shape', 'geometric', 'category', 'series', 'sparkle', 'four-point'],
				description: 'A solid star4',
			},
			star4_outline: {
				src: 'versatiles/star4_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'sparkle', 'four-point', 'outline', 'hollow', 'stroked'],
				description: 'An outlined star4',
			},
			star6: {
				src: 'versatiles/star6',
				tags: ['shape', 'geometric', 'category', 'series', 'six-point', 'hexagram'],
				description: 'A solid star6',
			},
			star6_outline: {
				src: 'versatiles/star6_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'six-point', 'hexagram', 'outline', 'hollow', 'stroked'],
				description: 'An outlined star6',
			},
			star_outline: {
				src: 'versatiles/star_outline',
				tags: [
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
				description: 'An outlined star',
			},
			triangle: {
				src: 'versatiles/triangle',
				tags: ['shape', 'geometric', 'category', 'series', 'three-sided'],
				description: 'A solid triangle',
			},
			triangle_outline: {
				src: 'versatiles/triangle_outline',
				tags: ['shape', 'geometric', 'category', 'series', 'three-sided', 'outline', 'hollow', 'stroked'],
				description: 'An outlined triangle',
			},
			x: {
				src: 'versatiles/x',
				tags: ['shape', 'geometric', 'category', 'series', 'close', 'cancel', 'remove', 'ex'],
				description: 'A solid x',
			},
			x_outline: {
				src: 'versatiles/x_outline',
				tags: [
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
				description: 'An outlined x',
			},
		},
	},
	symbol: {
		size: 22,
		icons: {
			arrow: { src: 'maki/arrow', tags: ['direction', 'pointer', 'right', 'thin'], description: 'An arrow' },
			arrow2: { src: 'unknown/arrow2', tags: ['direction', 'pointer', 'block', 'solid'], description: 'An arrow2' },
			arrow3: { src: 'unknown/arrow3', tags: ['direction', 'pointer', 'dart'], description: 'An arrow3' },
			arrow_circle: {
				src: 'versatiles/arrow_circle',
				tags: ['direction', 'button', 'round', 'enclosed'],
				description: 'An arrow circle',
			},
			arrow_curved: {
				src: 'versatiles/arrow_curved',
				tags: ['turn', 'detour', 'bend', 'route'],
				description: 'An arrow curved',
			},
			arrow_double: {
				src: 'versatiles/arrow_double',
				tags: ['bidirectional', 'two-way', 'both ways'],
				description: 'An arrow double',
			},
			arrow_return: {
				src: 'versatiles/arrow_return',
				tags: ['back', 'undo', 'u-turn', 'reverse', 'round trip'],
				description: 'An arrow return',
			},
			caret: {
				src: 'versatiles/caret',
				tags: ['triangle', 'pointer', 'next', 'expand', 'small'],
				description: 'A caret',
			},
			chart_bar: {
				src: 'versatiles/chart_bar',
				tags: ['statistics', 'data', 'graph', 'analytics', 'bars'],
				description: 'A chart bar',
			},
			chart_line: {
				src: 'versatiles/chart_line',
				tags: ['statistics', 'data', 'graph', 'analytics', 'trend', 'series'],
				description: 'A chart line',
			},
			chart_pie: {
				src: 'versatiles/chart_pie',
				tags: ['statistics', 'data', 'graph', 'analytics', 'share', 'proportion'],
				description: 'A chart pie',
			},
			check: {
				src: 'versatiles/check',
				tags: ['tick', 'done', 'confirm', 'yes', 'verified', 'available'],
				description: 'A check',
			},
			chevron: { src: 'versatiles/chevron', tags: ['angle', 'flow', 'next', 'direction'], description: 'A chevron' },
			chevron_double: {
				src: 'versatiles/chevron_double',
				tags: ['fast', 'skip', 'flow', 'direction'],
				description: 'A chevron double',
			},
			crosshair: {
				src: 'versatiles/crosshair',
				tags: ['target', 'precision', 'locate', 'aim', 'measurement'],
				description: 'A ring with four radial ticks',
			},
			dot: { src: 'versatiles/dot', tags: ['point', 'bullet', 'small', 'data point'], description: 'A dot' },
			entrance: {
				src: 'maki/entrance-alt1',
				tags: ['enter', 'way in', 'access', 'door', 'login'],
				description: 'An arrow entering a bracket',
			},
			exclamation: {
				src: 'versatiles/exclamation',
				tags: ['attention', 'alert', 'important', 'notice'],
				description: 'An exclamation',
			},
			minus: {
				src: 'versatiles/minus',
				tags: ['remove', 'subtract', 'less', 'negative', 'closed'],
				description: 'A minus',
			},
			percent: {
				src: 'versatiles/percent',
				tags: ['share', 'proportion', 'rate', 'statistics'],
				description: 'A percent',
			},
			question: {
				src: 'versatiles/question',
				tags: ['unknown', 'help', 'unconfirmed', 'query'],
				description: 'A question',
			},
			slash: {
				src: 'versatiles/slash',
				tags: ['cancelled', 'struck through', 'disabled', 'out of service'],
				description: 'A slash',
			},
			trend_down: {
				src: 'versatiles/trend_down',
				tags: ['decrease', 'fall', 'decline', 'negative', 'statistics'],
				description: 'A trend down',
			},
			trend_up: {
				src: 'versatiles/trend_up',
				tags: ['increase', 'rise', 'growth', 'positive', 'statistics'],
				description: 'A trend up',
			},
		},
	},
};

export default icons;

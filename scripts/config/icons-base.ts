// Icons for the `base` sheet — everything the style itself draws.
//
// `base` is INTERNAL: these names serve the style and may be renamed, added or removed with any
// release. Do not reference them from your own layers; see icons-extras.ts and icons-icons.ts for the public sheets.
//
// The key is the sprite name (`base:<group>-<key>`), the value is the file it is drawn from,
// relative to `icons/` and without the `.svg`. The two are deliberately independent — see
// SPRITES.md. `title` and `aliases` are published inside the sprite JSON so a style editor can
// offer these icons too; many aliases are the v5 name the icon used to carry.

import type { IconSets } from '../lib/icons.js';

const icons: IconSets = {
	icon: {
		size: 22,
		icons: {
			airfield: { src: 'maki/airfield', title: 'Airfield', aliases: ['aerodrome', 'airstrip', 'landing strip'] },
			airport: {
				src: 'maki/airport',
				title: 'Airport',
				aliases: ['aeroplane', 'airplane', 'plane', 'flight', 'terminal'],
			},
			alcohol_shop: {
				src: 'maki/alcohol-shop',
				title: 'Alcohol shop',
				aliases: ['off-licence', 'liquor store', 'bottle shop', 'wine', 'spirits'],
			},
			amusement_park: {
				src: 'maki/amusement-park',
				title: 'Amusement park',
				aliases: ['theme park', 'fairground', 'rides'],
			},
			art_gallery: { src: 'maki/art-gallery', title: 'Art gallery', aliases: ['picture', 'painting', 'exhibition'] },
			artwork: { src: 'versatiles/artwork', title: 'Artwork', aliases: ['public art', 'sculpture', 'installation'] },
			atm: { src: 'versatiles/atm', title: 'ATM', aliases: ['cash machine', 'cashpoint', 'bank machine'] },
			bakery: { src: 'maki/bakery', title: 'Bakery', aliases: ['bread', 'baker', 'patisserie'] },
			bank: { src: 'maki/bank', title: 'Bank', aliases: ['branch', 'banking', 'finance'] },
			bar: { src: 'maki/bar', title: 'Bar', aliases: ['cocktail', 'drinks', 'lounge'] },
			beauty: { src: 'versatiles/beauty', title: 'Beauty salon', aliases: ['cosmetics', 'nails', 'spa'] },
			beer_mug: {
				src: 'unknown/beer_mug',
				title: 'Beer mug',
				aliases: ['beer', 'beergarden', 'beer garden', 'brewery'],
			},
			bench: { src: 'versatiles/bench', title: 'Bench', aliases: ['seat', 'seating', 'rest'] },
			beverages: {
				src: 'versatiles/beverages',
				title: 'Drinks shop',
				aliases: ['soft drinks', 'juice', 'off-licence'],
			},
			bicycle_share: {
				src: 'maki/bicycle-share',
				title: 'Bike share',
				aliases: ['bicycle sharing', 'hire', 'docking station'],
			},
			books: { src: 'versatiles/books', title: 'Bookshop', aliases: ['bookstore', 'reading', 'literature'] },
			bus: { src: 'temaki/bus', title: 'Bus', aliases: ['coach', 'omnibus', 'public transport'] },
			butcher: { src: 'versatiles/butcher', title: 'Butcher', aliases: ['meat', 'deli', 'carvery'] },
			cafe: { src: 'maki/cafe', title: 'Café', aliases: ['coffee', 'coffee shop', 'espresso', 'tea'] },
			campsite: { src: 'maki/campsite', title: 'Campsite', aliases: ['camping', 'tent', 'pitch'] },
			car_rental: { src: 'maki/car-rental', title: 'Car rental', aliases: ['car hire', 'rent a car'] },
			car_wash: { src: 'versatiles/car_wash', title: 'Car wash', aliases: ['valeting', 'vehicle wash'] },
			caravan: { src: 'unknown/caravan', title: 'Caravan site', aliases: ['motorhome', 'rv', 'campervan'] },
			castle: { src: 'maki/castle', title: 'Castle', aliases: ['fort', 'fortress', 'palace', 'chateau'] },
			cemetery: { src: 'maki/cemetery', title: 'Cemetery', aliases: ['graveyard', 'burial', 'grave'] },
			chalet: { src: 'versatiles/chalet', title: 'Chalet', aliases: ['cabin', 'lodge', 'holiday home'] },
			cinema: { src: 'maki/cinema', title: 'Cinema', aliases: ['movie theater', 'movies', 'film'] },
			clothes: {
				src: 'versatiles/clothes',
				title: 'Clothes shop',
				aliases: ['clothing', 'fashion', 'apparel', 'boutique'],
			},
			college: { src: 'maki/college', title: 'College', aliases: ['university', 'campus', 'further education'] },
			community: {
				src: 'versatiles/community',
				title: 'Community centre',
				aliases: ['community center', 'village hall', 'meeting'],
			},
			defibrillator: {
				src: 'maki/defibrillator',
				title: 'Defibrillator',
				aliases: ['aed', 'heart', 'resuscitation', 'emergency'],
			},
			dentist: { src: 'maki/dentist', title: 'Dentist', aliases: ['dental', 'teeth', 'orthodontist'] },
			dharma_wheel: {
				src: 'maki/religious-buddhist',
				title: 'Dharma wheel',
				aliases: ['buddhist', 'buddhism', 'temple', 'religion'],
			},
			do_it_yourself: {
				src: 'versatiles/do_it_yourself',
				title: 'DIY store',
				aliases: ['doityourself', 'home improvement', 'builders merchant'],
			},
			doctor: { src: 'maki/doctor', title: 'Doctor', aliases: ['gp', 'surgery', 'clinic', 'physician'] },
			dog: { src: 'unknown/dog', title: 'Dog park', aliases: ['dog_park', 'dogs', 'pet', 'off-leash'] },
			drinking_water: {
				src: 'maki/drinking-water',
				title: 'Drinking water',
				aliases: ['tap', 'potable', 'refill', 'water point'],
			},
			dry_cleaning: {
				src: 'versatiles/dry_cleaning',
				title: 'Dry cleaning',
				aliases: ['drycleaning', 'cleaner', 'launderer'],
			},
			embassy: { src: 'maki/embassy', title: 'Embassy', aliases: ['consulate', 'diplomatic', 'mission'] },
			emergency_access: {
				src: 'versatiles/emergency_access',
				title: 'Emergency access',
				aliases: ['access point', 'rescue point'],
			},
			emergency_phone: {
				src: 'maki/emergency-phone',
				title: 'Emergency phone',
				aliases: ['sos', 'help point', 'call box'],
			},
			fast_food: { src: 'maki/fast-food', title: 'Fast food', aliases: ['takeaway', 'burger', 'snack'] },
			fire_station: {
				src: 'maki/fire-station',
				title: 'Fire station',
				aliases: ['fire brigade', 'fire service', 'firefighters'],
			},
			florist: { src: 'maki/florist', title: 'Florist', aliases: ['flowers', 'flower shop', 'bouquet'] },
			fountain: { src: 'unknown/fountain', title: 'Fountain', aliases: ['water feature', 'jet'] },
			fuel_pump: {
				src: 'unknown/fuel_pump',
				title: 'Petrol station',
				aliases: ['fuel', 'gas station', 'filling station', 'diesel'],
			},
			furniture: { src: 'maki/furniture', title: 'Furniture shop', aliases: ['furnishings', 'home store'] },
			garden_center: {
				src: 'maki/garden-centre',
				title: 'Garden centre',
				aliases: ['garden_centre', 'nursery', 'plants'],
			},
			gift: { src: 'maki/gift', title: 'Gift shop', aliases: ['presents', 'souvenirs'] },
			golf: { src: 'maki/golf', title: 'Golf', aliases: ['golf course', 'driving range'] },
			greengrocer: { src: 'versatiles/greengrocer', title: 'Greengrocer', aliases: ['fruit', 'vegetables', 'produce'] },
			hardware: { src: 'maki/hardware', title: 'Hardware shop', aliases: ['tools', 'ironmonger'] },
			historic: { src: 'maki/historic', title: 'Historic site', aliases: ['heritage', 'ruins', 'antiquity'] },
			hospital: { src: 'maki/hospital', title: 'Hospital', aliases: ['a&e', 'emergency room', 'infirmary', 'medical'] },
			hunting_stand: {
				src: 'versatiles/hunting_stand',
				title: 'Hunting stand',
				aliases: ['huntingstand', 'hide', 'deer stand'],
			},
			hydrant: {
				src: 'temaki/fire_hydrant',
				title: 'Fire hydrant',
				aliases: ['fire plug', 'water point', 'firefighting'],
			},
			ice_rink: { src: 'versatiles/ice_rink', title: 'Ice rink', aliases: ['icerink', 'skating', 'ice skating'] },
			justice: {
				src: 'versatiles/justice',
				title: 'Courthouse',
				aliases: ['court', 'law court', 'tribunal', 'judiciary'],
			},
			khanda: { src: 'temaki/sikhism', title: 'Khanda', aliases: ['sikh', 'sikhism', 'gurdwara', 'religion'] },
			latin_cross: {
				src: 'unknown/latin_cross',
				title: 'Latin cross',
				aliases: ['christian', 'christianity', 'church', 'religion'],
			},
			laundry: { src: 'maki/laundry', title: 'Laundry', aliases: ['launderette', 'laundromat', 'washing'] },
			library: { src: 'maki/library', title: 'Library', aliases: ['lending', 'public library', 'archive'] },
			lighthouse: { src: 'maki/lighthouse', title: 'Lighthouse', aliases: ['beacon', 'navigation', 'coast'] },
			lodging: {
				src: 'maki/lodging',
				title: 'Hotel',
				aliases: ['accommodation', 'guest house', 'hostel', 'motel', 'b&b'],
			},
			marketplace: { src: 'versatiles/marketplace', title: 'Marketplace', aliases: ['market', 'stalls', 'bazaar'] },
			monument: { src: 'maki/monument', title: 'Monument', aliases: ['memorial', 'statue', 'landmark'] },
			newsagent: { src: 'versatiles/newsagent', title: 'Newsagent', aliases: ['news', 'tobacconist', 'corner shop'] },
			newspaper: { src: 'unknown/newspaper', title: 'Newspaper kiosk', aliases: ['kiosk', 'newsstand', 'press'] },
			nightclub: { src: 'versatiles/nightclub', title: 'Nightclub', aliases: ['club', 'disco', 'dancing'] },
			nursing_home: {
				src: 'versatiles/nursing_home',
				title: 'Nursing home',
				aliases: ['nursinghome', 'care home', 'elderly'],
			},
			observation_tower: {
				src: 'maki/observation-tower',
				title: 'Observation tower',
				aliases: ['lookout', 'viewing tower', 'watchtower'],
			},
			om: { src: 'temaki/hinduism', title: 'Om', aliases: ['hindu', 'hinduism', 'temple', 'religion'] },
			optician: { src: 'maki/optician', title: 'Optician', aliases: ['glasses', 'eyewear', 'optometrist'] },
			outdoor: {
				src: 'versatiles/outdoor',
				title: 'Outdoor shop',
				aliases: ['camping shop', 'hiking', 'mountaineering'],
			},
			person_kneeling_and_praying: {
				src: 'unknown/person_kneeling_and_praying',
				title: 'Place of worship',
				aliases: ['place_of_worship', 'prayer', 'worship', 'religion'],
			},
			picnic_site: { src: 'maki/picnic-site', title: 'Picnic site', aliases: ['picnic', 'picnic table', 'rest area'] },
			pill: { src: 'unknown/pill', title: 'Pharmacy', aliases: ['chemist', 'drugstore', 'medicine', 'prescription'] },
			pint_glass: { src: 'unknown/pint_glass', title: 'Pub', aliases: ['public house', 'tavern', 'inn', 'beer'] },
			pitch: { src: 'maki/pitch', title: 'Sports pitch', aliases: ['field', 'court', 'playing field'] },
			police_officer: {
				src: 'temaki/police_officer',
				title: 'Police',
				aliases: ['police station', 'law enforcement', 'constabulary'],
			},
			post: { src: 'maki/post', title: 'Post office', aliases: ['mail', 'postal', 'parcel'] },
			postbox: { src: 'versatiles/postbox', title: 'Post box', aliases: ['mailbox', 'letter box', 'pillar box'] },
			prison: { src: 'maki/prison', title: 'Prison', aliases: ['jail', 'correctional', 'penitentiary'] },
			rail: { src: 'maki/rail', title: 'Railway', aliases: ['train', 'railway station', 'metro', 'subway'] },
			recycling: { src: 'unknown/recycling', title: 'Recycling', aliases: ['bottle bank', 'waste', 'recycle centre'] },
			restaurant: { src: 'maki/restaurant', title: 'Restaurant', aliases: ['dining', 'eat', 'food', 'bistro'] },
			restrooms: { src: 'unknown/restrooms', title: 'Toilets', aliases: ['toilet', 'wc', 'bathroom', 'lavatory'] },
			ring: {
				src: 'unknown/ring',
				title: 'Jewellery shop',
				aliases: ['jewelry_store', 'jeweller', 'jewelry', 'rings'],
			},
			rocking_horse: { src: 'unknown/rocking_horse', title: 'Toy shop', aliases: ['toys', 'toy store', 'games'] },
			school: { src: 'maki/school', title: 'School', aliases: ['primary', 'secondary', 'education'] },
			scissors_and_comb: {
				src: 'temaki/beauty_salon',
				title: 'Hairdresser',
				aliases: ['barber', 'salon', 'haircut', 'hair'],
			},
			seesaw: { src: 'temaki/seesaw', title: 'Playground', aliases: ['play area', 'swings', 'children'] },
			shelter: { src: 'unknown/shelter', title: 'Shelter', aliases: ['bus shelter', 'refuge', 'hut'] },
			shoes: { src: 'versatiles/shoes', title: 'Shoe shop', aliases: ['footwear', 'cobbler', 'trainers'] },
			shop: { src: 'maki/shop', title: 'Shop', aliases: ['store', 'retail', 'convenience'] },
			shrine: { src: 'versatiles/shrine', title: 'Shrine', aliases: ['wayside shrine', 'sacred', 'religion'] },
			sports: { src: 'versatiles/sports', title: 'Sports centre', aliases: ['leisure centre', 'gym', 'fitness'] },
			stadium: { src: 'maki/stadium', title: 'Stadium', aliases: ['arena', 'ground', 'sports ground'] },
			star_and_crescent: {
				src: 'maki/religious-muslim',
				title: 'Star and crescent',
				aliases: ['muslim', 'islam', 'mosque', 'religion'],
			},
			star_of_david: {
				src: 'unknown/star_of_david',
				title: 'Star of David',
				aliases: ['jewish', 'judaism', 'synagogue', 'religion'],
			},
			stationery: {
				src: 'versatiles/stationery',
				title: 'Stationery shop',
				aliases: ['office supplies', 'pens', 'paper'],
			},
			surveillance: {
				src: 'versatiles/surveillance',
				title: 'Surveillance camera',
				aliases: ['cctv', 'camera', 'security'],
			},
			swimming: { src: 'maki/swimming', title: 'Swimming', aliases: ['pool', 'swimming pool', 'lido', 'baths'] },
			telephone: { src: 'maki/telephone', title: 'Telephone', aliases: ['phone', 'call box', 'payphone'] },
			theater: { src: 'maki/theatre', title: 'Theatre', aliases: ['playhouse', 'drama', 'stage', 'performing arts'] },
			town_hall: { src: 'maki/town-hall', title: 'Town hall', aliases: ['city hall', 'civic', 'municipal'] },
			travel_agent: {
				src: 'versatiles/travel_agent',
				title: 'Travel agent',
				aliases: ['travel agency', 'holidays', 'tours'],
			},
			tube_and_toothbrush: {
				src: 'unknown/tube_and_toothbrush',
				title: 'Chemist',
				aliases: ['drugstore', 'toiletries', 'health and beauty'],
			},
			vending_machine: {
				src: 'unknown/vending_machine',
				title: 'Vending machine',
				aliases: ['vendingmachine', 'vending', 'automat'],
			},
			veterinary: { src: 'maki/veterinary', title: 'Vet', aliases: ['animal hospital', 'animal clinic', 'pets'] },
			video: { src: 'versatiles/video', title: 'Video shop', aliases: ['dvd', 'video rental', 'movies'] },
			viewpoint: { src: 'maki/viewpoint', title: 'Viewpoint', aliases: ['lookout', 'vista', 'panorama', 'scenic'] },
			waste_basket: {
				src: 'maki/waste-basket',
				title: 'Waste basket',
				aliases: ['bin', 'litter bin', 'rubbish', 'trash'],
			},
			wastewater: {
				src: 'versatiles/wastewater',
				title: 'Wastewater plant',
				aliases: ['sewage', 'treatment works', 'sewer'],
			},
			water_park: { src: 'versatiles/water_park', title: 'Water park', aliases: ['waterpark', 'aquapark', 'slides'] },
			watermill: { src: 'maki/watermill', title: 'Watermill', aliases: ['mill', 'water wheel'] },
			waterworks: {
				src: 'versatiles/waterworks',
				title: 'Waterworks',
				aliases: ['water treatment', 'pumping station', 'water supply'],
			},
			windmill: { src: 'maki/windmill', title: 'Windmill', aliases: ['mill', 'wind mill'] },
			yin_yang: { src: 'temaki/taoism', title: 'Yin and yang', aliases: ['taoist', 'taoism', 'religion', 'balance'] },
			zoo: { src: 'maki/zoo', title: 'Zoo', aliases: ['animals', 'wildlife park', 'safari'] },
		},
	},
	// Road markings. `oneway` points up before `icon-rotate` turns it along the street.
	marking: {
		size: 15,
		icons: {
			oneway: {
				src: 'versatiles/oneway',
				title: 'One-way arrow',
				aliases: ['one way', 'direction', 'traffic flow'],
				center: [0.5, 0],
			},
		},
	},
	// Tileable polygon fills for `fill-pattern`. Not SDF: MapLibre cannot recolour a fill
	// pattern, so these render as drawn. Every tile wraps seamlessly — see SPRITES.md.
	pattern: {
		useSDF: false,
		size: 16,
		icons: {
			hatched: {
				src: 'versatiles/hatched',
				title: 'Diagonal hatching',
				aliases: ['hazard', 'danger area', 'stripes', 'fill'],
			},
			hatched_thin: {
				src: 'versatiles/hatched_thin',
				title: 'Fine diagonal hatching',
				aliases: ['hazard', 'stripes', 'fill', 'light'],
			},
			striped: { src: 'versatiles/striped', title: 'Horizontal stripes', aliases: ['bands', 'lines', 'fill'] },
		},
	},
	transport: {
		size: 22,
		icons: {
			information: {
				src: 'versatiles/information',
				title: 'Information',
				aliases: ['info', 'tourist information', 'help'],
			},
			tram: { src: 'temaki/tram', title: 'Tram', aliases: ['streetcar', 'light rail', 'trolley'] },
		},
	},
};

export default icons;

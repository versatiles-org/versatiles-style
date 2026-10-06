/**
 * What the generated themes should look like: the nine derived from colorful, and the lookalikes.
 *
 * Values only. The derivation that reads them is `scripts/lib/theme-generator.ts`, and what each
 * setting means is documented on its type in `scripts/lib/theme-types.ts` — this file says what this
 * package's themes are, not how a theme is built.
 *
 * Editing anything here changes `src/themes/tables.ts`, so run `npm run generate-themes` afterwards
 * and look at the result: `npm run schema-compare` for the pictures, or
 * `npm run compare -- --baseline` around the change for the numbers. A unit test fails while the
 * tables and this file disagree.
 *
 * Nothing here can move `colorful` light. That palette is hand-written in `src/themes/colorful.ts`
 * and is the reference all nine are derived from — change a colour there and they all follow.
 */

import type {
	ContrastPair,
	Fix,
	LightTheme,
	Lookalike,
	LookalikeTheme,
	Overrides,
	ThemeSettings,
} from '../lib/theme-types.js';

/** Per-theme settings: its land, and how far it departs from colorful, by group. */
export const THEMES: Record<LightTheme, ThemeSettings> = {
	colorful: {
		darkLand: 0.02,
	},
	// stronger nature fills on a warm land
	natural: {
		land: '#F2EDDE',
		contrast: { fill: 1.3, line: 1, label: 1 },
		chroma: { fill: 1.4, line: 1, label: 1 },
		darkLand: 0.02,
	},
	// softer and less saturated throughout
	muted: {
		land: '#F4F0EE',
		contrast: { fill: 0.7, line: 0.8, label: 0.9 },
		chroma: { fill: 0.5, line: 0.6, label: 0.6 },
		darkLand: 0.02,
	},
	// fully desaturated: every colour is a gray, carrying colorful's hue separation as brightness
	gray: {
		chroma: { fill: 0, line: 0, label: 0 },
		decolorize: 1,
		darkLand: 0.02,
	},
	// quiet fills, heavy lines, black labels
	toner: {
		land: '#FFFFFF',
		contrast: { fill: 0.8, line: 2, label: 1.4 },
		chroma: { fill: 0.6, line: 1.2, label: 0 },
		darkLand: 0.006,
	},
};

/**
 * Themes whose colour scheme resembles another project's map — see `Lookalike`.
 *
 * `colors` holds what `guessOptions` (`src/migrate`) reads off that map's MapLibre style: the palette
 * values with which `osm()` comes closest to it. Colours that map does not draw are left out and
 * derived. To add one, run `guessOptions` on the style, paste its `colors` here, and name the theme
 * in `LookalikeTheme` and in `Palette`.
 */
export const LOOKALIKES: Record<LookalikeTheme, Lookalike> = {
	positrino: {
		resembles: 'Positron (CARTO)',
		dark: false,
		land: '#F2F3F0',
		contrast: { fill: 0.5, line: 1, label: 1 },
		chroma: { fill: 0, line: 0, label: 0 },
		decolorize: 1,
		colors: {
			water: '#C3C9CB',
			glacier: '#FAFAFA8F',
			natureWood: '#E6E9E5',
			areaResidential: '#EDEEEA',
			building: '#EAEAE5',
			roadStreet: '#F1F1F1F2',
			roadStreetBg: '#DBDBDB',
			roadMotorway: '#FFFFFF',
			roadMotorwayBg: '#D5D5D5',
			roadTrunk: '#FFFFFF',
			roadTrunkBg: '#D5D5D5',
			transitRail: '#E6E6E6',
			transitSubway: '#E5E6E5',
			transitCycle: '#EAEAEAE6',
			transitFoot: '#EAEAEAE6',
			boundary: '#B3B2B3',
			label: '#212121',
			labelHalo: '#FFFFFFF5',
			labelWater: '#A8A8A8',
			roadSecondary: '#FFFFFF',
			roadSecondaryBg: '#D5D5D5',
			natureGrass: '#ECEDE9',
			naturePark: '#E6E9E5',
		},
		// Positron draws paths as a solid line and state borders in an even dash.
		lines: {
			'roads.paths': false,
			'roads.footway': false,
			'roads.steps': false,
			'boundaries.state': [2, 2],
		},
	},
	'positrino-dark': {
		resembles: 'Dark Matter (CARTO)',
		dark: true,
		land: '#0C0C0C',
		contrast: { fill: 0.5, line: 1, label: 1 },
		chroma: { fill: 0, line: 0, label: 0 },
		decolorize: 1,
		colors: {
			water: '#1A1A1C',
			building: '#0A0A0A',
			buildingBg: '#1B1B1D',
			roadStreet: '#0E0E0EF2',
			roadStreetBg: '#3C3C3CCC',
			roadMotorway: '#000000',
			roadMotorwayBg: '#3C3C3CCC',
			roadTrunk: '#2A2A2A',
			roadTrunkBg: '#2A2A2A',
			transitRail: '#1D1D1D',
			transitSubway: '#1D1D1D',
			transitCycle: '#1B1B1DE6',
			transitFoot: '#1B1B1DE6',
			boundary: '#383838',
			boundaryDisputed: '#3B3B3B',
			label: '#616060',
			labelHalo: '#000000C4',
			roadSecondary: '#2A2A2A',
			roadSecondaryBg: '#2A2A2A',
		},
		// Dark Matter dashes its paths and state borders evenly.
		lines: {
			'roads.paths': [1.5, 1.5],
			'roads.footway': [1.5, 1.5],
			'roads.steps': [1.5, 1.5],
			'boundaries.state': [2, 2],
		},
	},
	fnord: {
		resembles: 'Fiord Color (OpenMapTiles)',
		dark: true,
		land: '#45516E',
		contrast: { fill: 0.5, line: 1, label: 1 },
		landHue: true,
		colors: {
			water: '#38425AF8',
			natureWood: '#3F425A92',
			building: '#181E4329',
			roadStreet: '#4A5471F2',
			roadStreetBg: '#5A678C',
			roadMotorway: '#3B4359',
			roadMotorwayBg: '#5A678C',
			roadTrunk: '#3C4357',
			roadTrunkBg: '#59678C',
			transitRail: '#434C5C',
			transitSubway: '#124152',
			transitCycle: '#45607D',
			transitFoot: '#45607D',
			boundary: '#86B9DA40',
			boundaryDisputed: '#9BBDE840',
			label: '#86A5B9',
			labelHalo: '#1C2751C4',
			roadSecondary: '#3C4357',
			roadSecondaryBg: '#59678C',
		},
		// Fiord Color dashes its paths and state borders evenly.
		lines: {
			'roads.paths': [2, 2],
			'roads.footway': [2, 2],
			'roads.steps': [2, 2],
			'boundaries.state': [2, 2],
		},
	},
	// The Protomaps flavours draw their casings in the land's colour, so the three casing keys are
	// taken from the flavour itself; the importer reads only the topmost of two road layers.
	protocol: {
		resembles: 'Protomaps Light',
		dark: false,
		land: '#E2DFDA',
		contrast: { fill: 0.6, line: 1, label: 1 },
		chroma: { fill: 0.6, line: 0.6, label: 0.6 },
		colors: {
			water: '#83DEEA',
			glacier: '#E7E7E7CC',
			natureWood: '#AAD6BC',
			natureGrass: '#A5D5B9',
			naturePark: '#9CD3B4',
			natureSand: '#CBDCCF',
			natureLeisure: '#9CD3B4B2',
			areaIndustrial: '#D1DDE1',
			areaBurial: '#9CD3B4',
			siteEducation: '#E4DED7',
			siteHospital: '#E4DAD9',
			building: '#CCCCCC7F',
			roadStreet: '#F2F2F4',
			transitRail: '#81909349',
			transitSubway: '#818F9249',
			transitCycle: '#EBEBEB',
			transitFoot: '#EBEBEB',
			label: '#7E7C7D',
			labelHalo: '#DDE5E6',
			labelSymbol: '#315BCF',
			labelPoi: '#CB6704',
			labelHousenumber: '#91888B',
			labelWater: '#728DD4',
			roadStreetBg: '#E0E0E0',
			roadMotorway: '#FFFFFF',
			roadMotorwayBg: '#E0E0E0',
			roadTrunk: '#FFFFFF',
			roadTrunkBg: '#E0E0E0',
			boundary: '#ADADAD',
			boundaryDisputed: '#ADADAD',
			roadSecondary: '#FFFFFF',
			roadSecondaryBg: '#E0E0E0',
		},
		// Protomaps draws paths solid and dashes every border, the country's too.
		lines: {
			'roads.paths': false,
			'roads.footway': false,
			'roads.steps': false,
			'boundaries.country': [2, 1],
			'boundaries.state': [2, 1],
		},
	},
	'protocol-dark': {
		resembles: 'Protomaps Dark',
		dark: true,
		land: '#1F1F1F',
		contrast: { fill: 0.6, line: 1, label: 1 },
		chroma: { fill: 0.3, line: 0.3, label: 0.3 },
		colors: {
			water: '#30343E',
			glacier: '#1C1C1CCC',
			natureWood: '#1A2A24',
			natureGrass: '#222323',
			naturePark: '#192A24',
			natureSand: '#222123',
			natureLeisure: '#192A24B3',
			areaIndustrial: '#222222',
			areaBurial: '#192A24',
			siteEducation: '#262323',
			siteHospital: '#252424',
			building: '#1011117F',
			roadMotorway: '#474747',
			transitRail: '#00000049',
			transitSubway: '#01010049',
			transitCycle: '#333333',
			boundary: '#5B6374',
			boundaryDisputed: '#5B6374',
			label: '#666666',
			labelHalo: '#212223',
			labelSymbol: '#2B5CEA',
			labelPoi: '#F19B6E',
			labelHousenumber: '#525252',
			labelWater: '#717784',
			roadStreet: '#343434',
			roadStreetBg: '#1F1F1F',
			roadMotorwayBg: '#1F1F1F',
			roadTrunk: '#3D3D3D',
			roadTrunkBg: '#1F1F1F',
			roadSecondary: '#3D3D3D',
			roadSecondaryBg: '#1F1F1F',
		},
		// As `protocol`.
		lines: {
			'roads.paths': false,
			'roads.footway': false,
			'roads.steps': false,
			'boundaries.country': [2, 1],
			'boundaries.state': [2, 1],
		},
	},
	protostar: {
		resembles: 'Protomaps White',
		dark: false,
		land: '#FFFFFF',
		contrast: { fill: 0.3, line: 1, label: 1 },
		chroma: { fill: 0, line: 0, label: 0 },
		decolorize: 1,
		colors: {
			glacier: '#FCFCFCCC',
			natureWood: '#FDFDFD',
			natureGrass: '#FAFAFA',
			naturePark: '#FCFCFC',
			natureLeisure: '#FCFCFCB3',
			areaIndustrial: '#FCFCFC',
			areaBurial: '#FCFCFC',
			siteEducation: '#F8F8F8',
			siteHospital: '#F9F9F8',
			building: '#EFEFEF7F',
			roadMotorway: '#EBEBEB',
			transitRail: '#C5C5C549',
			transitSubway: '#C4C4C449',
			transitFoot: '#F5F5F5',
			boundary: '#ADADAD',
			label: '#848484',
			labelHalo: '#FCFBFC',
			labelHousenumber: '#ADADAD',
			labelWater: '#ADADAD',
			water: '#DDDDDD',
			natureSand: '#FAFAFA',
			roadStreet: '#F2F2F2',
			roadStreetBg: '#FFFFFF',
			roadMotorwayBg: '#FFFFFF',
			roadTrunk: '#EBEBEB',
			roadTrunkBg: '#FFFFFF',
			transitCycle: '#F5F5F5',
			boundaryDisputed: '#ADADAD',
			roadSecondary: '#EBEBEB',
			roadSecondaryBg: '#FFFFFF',
		},
		// As `protocol`.
		lines: {
			'roads.paths': false,
			'roads.footway': false,
			'roads.steps': false,
			'boundaries.country': [2, 1],
			'boundaries.state': [2, 1],
		},
	},
	'protostar-dark': {
		resembles: 'Protomaps Black',
		dark: true,
		land: '#141414',
		contrast: { fill: 0.3, line: 1, label: 1 },
		chroma: { fill: 0, line: 0, label: 0 },
		decolorize: 1,
		colors: {
			water: '#323232',
			glacier: '#191919CC',
			natureWood: '#171717',
			naturePark: '#181818',
			natureLeisure: '#181818B3',
			siteEducation: '#111111',
			siteHospital: '#1D1D1D',
			building: '#090A0A7F',
			roadStreet: '#262626',
			roadMotorway: '#292929',
			roadTrunk: '#292929',
			transitRail: '#3A3B3A49',
			transitSubway: '#3B3B3A49',
			transitCycle: '#1F1F1F',
			transitFoot: '#1F1F1F',
			boundary: '#707070',
			boundaryDisputed: '#707070',
			label: '#767676',
			labelHalo: '#171717',
			labelHousenumber: '#525252',
			labelWater: '#707070',
			natureGrass: '#1C1C1C',
			roadStreetBg: '#141414',
			roadMotorwayBg: '#141414',
			roadTrunkBg: '#141414',
			roadSecondary: '#292929',
			roadSecondaryBg: '#141414',
		},
		// As `protocol`.
		lines: {
			'roads.paths': false,
			'roads.footway': false,
			'roads.steps': false,
			'boundaries.country': [2, 1],
			'boundaries.state': [2, 1],
		},
	},
	protozoa: {
		resembles: 'Protomaps Grayscale',
		dark: false,
		land: '#CCCCCC',
		contrast: { fill: 0.3, line: 1, label: 1 },
		chroma: { fill: 0, line: 0, label: 0 },
		decolorize: 1,
		colors: {
			water: '#A4A4A4',
			glacier: '#D2D2D2CC',
			natureWood: '#C4C4C4',
			natureGrass: '#C2C2C2',
			naturePark: '#C2C2C2',
			natureSand: '#CDCDCD',
			natureLeisure: '#C2C2C2B3',
			areaIndustrial: '#C6C6C6',
			areaBurial: '#C2C2C2',
			siteEducation: '#D0D0D0',
			siteHospital: '#D0D0D0',
			building: '#E0E0E07F',
			roadStreet: '#EAEAEA',
			roadMotorway: '#EBEBEB',
			roadTrunk: '#EBEBEB',
			transitRail: '#F1F1F149',
			transitSubway: '#F0F0F049',
			transitCycle: '#E0E0E0',
			transitFoot: '#E0E0E0',
			boundary: '#5C5C5C',
			boundaryDisputed: '#5C5C5C',
			label: '#6D6D6D',
			labelHalo: '#CDCDCD',
			labelHousenumber: '#999999',
			labelWater: '#7A7A7A',
			roadStreetBg: '#CCCCCC',
			roadMotorwayBg: '#CCCCCC',
			roadTrunkBg: '#CCCCCC',
			roadSecondary: '#EBEBEB',
			roadSecondaryBg: '#CCCCCC',
		},
		// As `protocol`.
		lines: {
			'roads.paths': false,
			'roads.footway': false,
			'roads.steps': false,
			'boundaries.country': [2, 1],
			'boundaries.state': [2, 1],
		},
	},
	// Not read by the importer: OpenStreetMap Carto is a CartoCSS style, so these are the colours its
	// style sheets define, assigned to our keys by hand. Where the two do not line up:
	//  - it colours trunk roads red and primary roads orange, and `roadTrunk` paints both. It takes
	//    the primary orange, which is most of what it paints.
	//  - its foot and cycle paths are thin dashed lines in salmon and blue. Ours are filled, where those
	//    colours flood a city centre, so `transitFoot` takes its pedestrian-area fill and `transitCycle`
	//    is derived.
	classic: {
		resembles: 'OpenStreetMap Carto',
		dark: false,
		land: '#F2EFE9',
		colors: {
			water: '#AAD3DF',
			glacier: '#DDECEC',
			natureWood: '#ADD19E',
			natureGrass: '#CDEBB0',
			naturePark: '#C8FACC',
			natureAgriculture: '#EEF0D5',
			natureSand: '#F5E9C6',
			natureRock: '#EEE5DC',
			natureLeisure: '#DFFCE2',
			areaResidential: '#E0DFDF',
			areaCommercial: '#F2DAD9',
			areaIndustrial: '#EBDBE8',
			areaBurial: '#AACBAF',
			siteConstruction: '#C7C7B4',
			siteEducation: '#FFFFE5',
			siteHospital: '#FFFFE5',
			siteDanger: '#FF55551A',
			sitePrison: '#8E8E8E24',
			siteParking: '#EEEEEE',
			siteSports: '#88E0BE',
			building: '#D9D0C9',
			buildingBg: '#C4B6AB',
			roadStreet: '#FFFFFF',
			roadStreetBg: '#BBBBBB',
			roadMotorway: '#E892A2',
			roadMotorwayBg: '#DC2A67',
			roadTrunk: '#FCD6A4',
			roadTrunkBg: '#A06B00',
			transitRail: '#707070',
			transitSubway: '#999999',
			transitFoot: '#DDDDE8',
			boundary: '#8D618B',
			boundaryDisputed: '#A37DA1',
			label: '#222222',
			labelHalo: '#FFFFFF99',
			labelSymbol: '#0092DA',
			labelPoi: '#734A08',
			labelWater: '#4D80B3',
			roadSecondary: '#F7FABF',
			roadSecondaryBg: '#707D05',
		},
		// OpenStreetMap Carto: sparse dashes for foot and cycle paths, a closer one for steps.
		lines: {
			'roads.paths': [1, 3],
			'roads.footway': [1, 3],
			'roads.steps': [2, 1],
		},
	},
	// Not read by the importer either: there is no style to read. These are the most frequent pixel
	// colours of each feature in screenshots of the map at eight places, taken on 2026-10-05. Where the
	// two do not line up:
	//  - its minor roads have no casing, so `roadStreetBg` takes the road's own colour.
	//  - its footpaths are thin dashed lines; ours are filled, so `transitFoot` stays close to the land.
	googol: {
		resembles: 'Google Maps',
		dark: false,
		land: '#F5F3F3',
		contrast: { fill: 0.5, line: 1, label: 1 },
		colors: {
			water: '#90DAEE',
			glacier: '#FFFFFF',
			natureWood: '#BEF0D2',
			natureGrass: '#D3F8E2',
			naturePark: '#C3F1D5',
			natureSand: '#F5F0E5',
			natureRock: '#EDEDED',
			natureLeisure: '#C3F1D5',
			areaResidential: '#F5F3F3',
			areaCommercial: '#F8F0DE',
			siteHospital: '#FCE8E6',
			building: '#E8E9ED',
			roadStreet: '#D8E0E7',
			roadStreetBg: '#D8E0E7',
			roadMotorway: '#ABBCD6',
			roadMotorwayBg: '#899CC0',
			roadTrunk: '#B3C2D4',
			roadTrunkBg: '#B3C2D4',
			transitRail: '#D0D3D7',
			transitSubway: '#D0D3D7',
			transitFoot: '#F8F7F7',
			label: '#303034',
			labelHalo: '#FFFFFF',
			labelWater: '#088797',
			roadSecondary: '#D6DEE6',
			roadSecondaryBg: '#D6DEE6',
			natureAgriculture: '#D3F8E2',
			boundary: '#9AA0A6',
			boundaryDisputed: '#9AA0A6',
		},
	},
	// Read by the importer from OpenFreeMap's Liberty style.
	freedom: {
		resembles: 'OSM Liberty',
		dark: false,
		land: '#F8F4F0',
		colors: {
			water: '#A0BFFE',
			glacier: '#E0ECECCC',
			natureWood: '#A3DF8830',
			natureGrass: '#B0D59A4D',
			naturePark: '#B0D59A5C',
			natureSand: '#E2E5B8C9',
			areaResidential: '#E6E2DD',
			areaBurial: '#D8E0BD',
			siteEducation: '#ECEECC',
			siteHospital: '#FFDDEE',
			siteSports: '#DEE3CD',
			building: '#DCD9D6',
			roadStreet: '#F9F6E9F2',
			roadStreetBg: '#D4C1B0',
			roadMotorway: '#FFCC88',
			roadMotorwayBg: '#E9AC77',
			roadTrunk: '#FFEEAA',
			roadTrunkBg: '#E9AC77',
			roadSecondary: '#FFEEAA',
			roadSecondaryBg: '#E9AC77',
			transitRail: '#9E9E9E',
			transitSubway: '#9E9E9E',
			transitCycle: '#FFFFFF',
			transitFoot: '#FFFFFF',
			boundary: '#8D8D8E',
			boundaryDisputed: '#68686A',
			labelHalo: '#FFFFFFF7',
			labelSymbol: '#2E5A80',
			labelPoi: '#666666',
			labelWater: '#74AEE9',
		},
		// OSM Liberty: a tight dash for paths, a long one for state borders.
		lines: {
			'roads.paths': [1, 0.7],
			'roads.footway': [1, 0.7],
			'roads.steps': [1, 0.7],
			'boundaries.state': [5, 1],
		},
	},
	// Read from the Mapbox Streets v12 style definition (2026-10-06): the fills, borders and labels are
	// what the importer derives from it, which is the palette value our own layers need to come out as
	// Mapbox draws them. Where the importer has to settle several Mapbox colours on one of our keys, the
	// key takes the one that covers most of what it paints, read off the style directly:
	//  - `roadTrunk` paints trunk and primary roads. Mapbox draws trunks yellow (#F7E06E) and primary
	//    roads white; the importer's fit lands between them. It takes the white.
	//  - `roadStreet` also paints runways, and `transitRail` aerialways, each in a colour of its own on
	//    that map; the fit is a blend no road or rail there has. They take the street's and the rail's.
	//  - `labelPoi`: Mapbox colours its POI labels by category. One key cannot, so it is derived.
	// `natureRock` and `areaResidential` are not drawn by that style at these zooms; they are the bare
	// ground of a screenshot and the land.
	crate: {
		resembles: 'Mapbox Streets',
		dark: false,
		land: '#ECE7E4',
		contrast: { fill: 0.6, line: 1, label: 1 },
		colors: {
			water: '#9CDEFF',
			glacier: '#D3ECF766',
			natureWood: '#9AE199BC',
			natureGrass: '#D5F1D099',
			naturePark: '#B8EBAD',
			natureAgriculture: '#D5F1D099',
			natureSand: '#E8ECC5D9',
			natureRock: '#D9D2CC',
			natureLeisure: '#B8EBAD',
			areaResidential: '#ECE7E4',
			areaCommercial: '#F7F2E3',
			areaIndustrial: '#E0E2EB',
			areaBurial: '#CDEBC6',
			siteEducation: '#F0E6D1',
			siteHospital: '#F5E0E1',
			siteSports: '#D0F3BE',
			building: '#DFD7D3',
			buildingBg: '#CFC8C4',
			roadStreet: '#FFFFFF',
			roadStreetBg: '#D1D6E0',
			roadMotorway: '#FFB366',
			roadMotorwayBg: '#F6F7F9',
			roadTrunk: '#FFFFFF',
			roadTrunkBg: '#D1D6E0',
			roadSecondary: '#FFFFFF',
			roadSecondaryBg: '#D1D6E0',
			transitRail: '#B2B4B8',
			transitSubway: '#B2B4B8',
			transitCycle: '#FFFFFF',
			transitFoot: '#FFFFFF',
			boundary: '#7070CF',
			boundaryDisputed: '#6666CC',
			label: '#07090EF2',
			labelHalo: '#FFFFFFEA',
			labelHousenumber: '#8E817B',
			labelWater: '#47AADC',
		},
		// Mapbox Streets, at the zooms the importer reads them: a tight dash for paths, short rungs for
		// steps, long dash short dash for state borders.
		lines: {
			'roads.paths': [1, 0.25],
			'roads.footway': [1, 0.25],
			'roads.steps': [0.3, 0.3],
			'boundaries.state': [2, 2, 6, 2],
			'boundaries.disputed': [2, 1.5],
		},
	},
	// Measured like `googol`: the most frequent pixel colours of each feature in screenshots of the map
	// at eight places, taken on 2026-10-05. Colours that could not be told apart that way are derived.
	mosaic: {
		resembles: 'MapTiler Streets',
		dark: false,
		land: '#F6F1E4',
		contrast: { fill: 0.6, line: 1, label: 1 },
		colors: {
			water: '#85CBFA',
			glacier: '#FDFBF7',
			natureWood: '#DBEAC7',
			natureGrass: '#E5EDD7',
			naturePark: '#D7E9C8',
			natureLeisure: '#DBEBD0',
			areaResidential: '#EEEAD8',
			areaCommercial: '#F4EDD6',
			areaIndustrial: '#E4DECC',
			siteEducation: '#EAF2EE',
			siteHospital: '#F9ECE5',
			building: '#E8E4D5',
			buildingBg: '#CAC7B9',
			roadStreet: '#FFFFFF',
			roadMotorway: '#FFCC85',
			roadTrunk: '#FFEEA8',
			roadSecondary: '#FFEEA8',
			transitRail: '#B8B4AB',
			transitSubway: '#B8B4AB',
			label: '#333333',
			labelHalo: '#FFFFFF',
			boundary: '#B2B2B2',
			boundaryDisputed: '#B2B2B2',
		},
	},
	// Read by hand from the MapLibre style Bing Maps itself loads ("Symbolic Style23 Bing"): its tiles
	// have a schema of their own, which the importer does not know. Where a colour changes with zoom,
	// the value from z13 on is taken. Where the two do not line up:
	//  - its road classes are street, arterial, major road, highway and controlled-access highway.
	//    Arterials are white like streets, so they take `roadSecondary`; major roads and highways are
	//    the same orange and take `roadTrunk`; controlled-access highways take `roadMotorway`.
	//  - its trails are dashed lines in a green of their own (#98B38F). `transitFoot` also fills
	//    pedestrian streets and plazas, which it draws near-white, so that key is derived.
	//  - it has no farmland of its own. Rendered from its own tiles over rural Brandenburg (four places,
	//    z9, z11 and z13), it draws its grass land cover on 43–67% of what OpenStreetMap has as farmland
	//    and plain land on 23–46%. `natureAgriculture` is the two mixed in that proportion — about two
	//    parts grass to one part land — so farmland reads as the paler green it averages to there.
	//  - a building there is `#DFDFD8` at 82% over the land, which shows as `#E4E4DE`. Ours is drawn over
	//    its own outline layer, where the same translucent colour comes out darker, so `building` is
	//    the colour as it shows.
	//  - controlled-access highways are `#FFB47F` in some regions and the highway orange in the rest;
	//    rendered from its own tiles around Berlin they are the latter, which `roadMotorway` takes.
	//  - `buildingBg` has no counterpart in the style and is the outline measured from a screenshot.
	ping: {
		resembles: 'Bing Maps',
		dark: false,
		land: '#F9FAF7',
		contrast: { fill: 0.6, line: 1, label: 1 },
		colors: {
			water: '#A6D5FF',
			glacier: '#FFFFFF',
			natureWood: '#B0E5BD',
			natureGrass: '#CBEFD4',
			natureAgriculture: '#DCF3E1',
			naturePark: '#B0E5BD',
			natureLeisure: '#CEE9CE',
			areaResidential: '#F9FAF7',
			areaCommercial: '#FFF5EB',
			areaIndustrial: '#F0F0F0',
			areaBurial: '#CEE9CE',
			siteEducation: '#DDEBEF',
			siteHospital: '#FFE8E8',
			siteDanger: '#90373712',
			siteParking: '#E0E0E0',
			siteSports: '#89A98E54',
			building: '#E4E4DE',
			buildingBg: '#C9C9C8',
			roadStreet: '#FFFFFF',
			roadStreetBg: '#AFAFAF',
			roadMotorway: '#FFC7A3',
			roadMotorwayBg: '#FF8C3A',
			roadTrunk: '#FFC7A3',
			roadTrunkBg: '#FFA05D',
			roadSecondary: '#FFFFFF',
			roadSecondaryBg: '#AFAFAF',
			transitRail: '#BFB9BD',
			transitSubway: '#BFB9BD',
			boundary: '#704747',
			boundaryDisputed: '#704747',
			label: '#1A1A1A',
			labelHalo: '#F9FAF7',
			labelSymbol: '#056FC0',
			labelHousenumber: '#5F5F70',
			labelWater: '#1F4980',
		},
		// Bing Maps' borders, as its tiles give them around Berlin and its style draws them at z10–z13.
		// A state border is a 1–1.5px line in 6px dashes and 3px gaps: half our width, and — a pattern
		// being in multiples of the width — its own `[6, 3]`. A country border is a 1–1.5px line too, and
		// a disputed one an even dash of about 10px on a 1.8px line. Its state and disputed borders have
		// nothing beneath them, where ours keep their casing. Its trails are read at the zoom they are
		// widest.
		lines: {
			'roads.paths': [2, 1.5],
			'roads.footway': [2, 1.5],
			'boundaries.country': { width: 0.3 },
			'boundaries.state': { dashed: [6, 3], width: 0.5 },
			'boundaries.disputed': { dashed: [5.5, 5.5], width: 0.45 },
		},
	},
};

/**
 * Colours that should deviate from colorful's relationships, per mode.
 *
 * Empty means every theme keeps those relationships exactly. Each entry names its keys once across
 * the themes it covers — two fixes touching one colour in one theme is an error, not a precedence
 * question.
 */
export const FIXES: readonly Fix[] = [
	{
		themes: ['gray'],
		keys: ['water'],
		light: { lightness: 1.2 },
		dark: { lightness: 0.9 },
	},
	{
		themes: ['gray'],
		keys: [
			'natureWood',
			'natureGrass',
			'naturePark',
			'natureAgriculture',
			'natureSand',
			'natureRock',
			'natureWetland',
			'natureLeisure',
		],
		light: { blend: 0.8 },
		dark: { blend: 0.7 },
	},
	{
		themes: ['gray'],
		keys: [
			'roadStreet',
			'roadStreetBg',
			'roadMotorway',
			'roadMotorwayBg',
			'roadTrunk',
			'roadTrunkBg',
			'roadSecondary',
			'roadSecondaryBg',
			'transitRail',
			'transitSubway',
		],
		light: { blend: 0.5 },
		dark: { blend: 0.6 },
	},
];

/**
 * Literal colours dropped on top of a generated table.
 *
 * The last resort: an override bypasses the derivation, so it does not follow when colorful moves and
 * nothing re-solves against it. Prefer a `FIXES` entry, which bends the derivation instead.
 */
export const OVERRIDES: Overrides = {};

/** The rows `npm run generate-themes -- --report` prints, one contrast each. */
export const REPORT_PAIRS: readonly ContrastPair[] = [
	{ label: 'label/land', fg: 'label', bg: 'land' },
	{ label: 'labelWater/water', fg: 'labelWater', bg: 'water' },
	{ label: 'street/land', fg: 'roadStreet', bg: 'land' },
	{ label: 'streetBg/land', fg: 'roadStreetBg', bg: 'land' },
	{ label: 'street/streetBg', fg: 'roadStreet', bg: 'roadStreetBg' },
	{ label: 'motorway/land', fg: 'roadMotorway', bg: 'land' },
	{ label: 'rail/land', fg: 'transitRail', bg: 'land' },
	{ label: 'water/land', fg: 'water', bg: 'land' },
	{ label: 'building/land', fg: 'building', bg: 'land' },
	{ label: 'wood/land', fg: 'natureWood', bg: 'land' },
	{ label: 'glacier/land', fg: 'glacier', bg: 'land' },
	{ label: 'boundary/land', fg: 'boundary', bg: 'land' },
];

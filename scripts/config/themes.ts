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
			natureWood: '#DCE0DC',
			areaResidential: '#EAEAE699',
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
			roadTrunk: '#121212',
			roadTrunkBg: '#3C3C3CCC',
			transitRail: '#1D1D1D',
			transitSubway: '#1D1D1D',
			transitCycle: '#1B1B1DE6',
			transitFoot: '#1B1B1DE6',
			boundary: '#383838',
			boundaryDisputed: '#3B3B3B',
			label: '#616060',
			labelHalo: '#000000C4',
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
			boundary: '#86B9DA69',
			boundaryDisputed: '#9BBDE88F',
			label: '#86A5B9',
			labelHalo: '#1C2751C4',
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
			natureWood: '#92D1B1',
			natureGrass: '#99D2BB',
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
			roadTrunk: '#474747',
			roadTrunkBg: '#1F1F1F',
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
			natureWood: '#FCFCFC',
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
			natureWood: '#191919',
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
			natureWood: '#C0C0C0',
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
		},
	},
	// Not read by the importer: OpenStreetMap Carto is a CartoCSS style, so these are the colours its
	// style sheets define, assigned to our keys by hand. Where the two do not line up:
	//  - it colours five road classes and we have three keys. `roadTrunk` also paints primary and
	//    secondary roads, which are most of what it paints, so it takes Carto's primary orange rather
	//    than its trunk red; tertiary roads are white in both.
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
		},
	},
	// Not read by the importer either: there is no style to read. These are the most frequent pixel
	// colours of each feature in screenshots of the map at eight places, taken on 2026-10-05. Where the
	// two do not line up:
	//  - that map colours primary roads darker than secondary ones, and `roadTrunk` paints both. It
	//    takes the secondary colour, so primary roads come out lighter than on that map.
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
			roadMotorway: '#8BA5C1',
			roadMotorwayBg: '#7090B2',
			roadTrunk: '#B3C2D4',
			roadTrunkBg: '#7E9BBA',
			transitRail: '#D0D3D7',
			transitSubway: '#D0D3D7',
			transitFoot: '#F8F7F7',
			label: '#303034',
			labelHalo: '#FFFFFF',
			labelWater: '#088797',
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

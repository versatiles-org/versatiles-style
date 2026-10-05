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

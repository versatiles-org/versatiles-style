/**
 * What the nine derived themes should look like.
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

import type { ContrastPair, Fix, LightTheme, Overrides, ThemeSettings } from '../lib/theme-types.js';

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

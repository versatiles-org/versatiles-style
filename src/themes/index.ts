import type { Palette, ResolvedColors } from '../options/index.js';
import { colorful } from './colorful.js';
import { gray } from './gray.js';
import { muted } from './muted.js';
import { natural } from './natural.js';
import { toner } from './toner.js';

export type { PaletteDefinition } from './types.js';
export { colorful, gray, muted, natural, toner };

export const PALETTES: ReadonlyArray<Palette> = [
	'colorful',
	'colorful-dark',
	'natural',
	'natural-dark',
	'muted',
	'muted-dark',
	'gray',
	'gray-dark',
	'toner',
	'toner-dark',
] as const;

// Each palette file defines its light and its dark theme as colour tables. `colorful` (light) is the
// reference; the other nine were derived from it. Each colour keeps its theme's hue, takes a chroma
// relative to colorful's, and gets the lightness at which its contrast against the land matches
// colorful's, scaled per theme: stronger nature fills in `natural`, softer fills in `muted` and
// `gray`, much stronger lines in `toner`. The dark themes do the same against a dark land, with water
// darker and everything else lighter than it, and streets lighter than their casings.
const PALETTE_COLORS: Record<Palette, () => ResolvedColors> = {
	colorful: () => colorful.light,
	'colorful-dark': () => colorful.dark,
	natural: () => natural.light,
	'natural-dark': () => natural.dark,
	muted: () => muted.light,
	'muted-dark': () => muted.dark,
	gray: () => gray.light,
	'gray-dark': () => gray.dark,
	toner: () => toner.light,
	'toner-dark': () => toner.dark,
};

export function getPaletteColors(palette: Palette): ResolvedColors {
	return PALETTE_COLORS[palette]();
}

/** Whether a palette is a dark theme, whose derived colours blend toward black instead of white. */
export function isDarkPalette(palette: Palette): boolean {
	return palette.endsWith('-dark');
}

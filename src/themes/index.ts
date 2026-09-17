import type { Palette, ResolvedColors } from '../options/index.js';
// The local leaf, never `../options/index.js`, which re-exports the same two names: the options barrel
// reaches `options/parts/colors.ts`, which imports *this* module. The type import above is erased and so
// costs nothing, but `colorOptionsKeys` is a value, and taking it from the barrel closes a runtime loop
// that surfaces as `TypeError: mapTopics is not a function` from a module initialiser in
// `options/osm-overlay.ts`, nowhere near here.
import { colorOptionsKeys } from './color-keys.js';
import { COLORFUL } from './colorful.js';
import { TABLES } from './tables.js';

// Frozen, not merely `ReadonlyArray`: this is handed out as `osm.palettes` (and `omt`'s, and
// `protomaps`'), and `readonly` is a compile-time claim a JS caller never sees. It also backs the
// palette validation and the theme search in `deriveOptions`, so a caller sorting it in place would
// break `osm({ theme })` for the rest of the process.
export const PALETTES: ReadonlyArray<Palette> = Object.freeze([
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
] as const);

/**
 * The colour table of a palette.
 *
 * `colorful` is the hand-written reference (`colorful.ts`); the other nine are derived from it and
 * stored in `tables.ts` as one string each — the 45 colours of `colorOptionsKeys`, in that order,
 * comma-separated and without their `#`. Writing them as objects cost 5.4 KB in the browser bundle for
 * nothing but the same 45 identifiers repeated nine times; this form is a tenth of that.
 *
 * Decoding is cheap and the result is not cached: every caller here — `resolveColors`, the palette
 * search in `deriveOptions` — copies or reshapes the table anyway, so a shared frozen object would buy
 * nothing and risk being mutated by one of them.
 *
 * Every palette therefore returns a **fresh** object, `colorful` included. It used to hand back the
 * `COLORFUL` constant itself, which is public API through `osm.colors` — so a caller editing the
 * returned palette (exactly what a style editor does) silently repainted every later `osm()` in the
 * process, and every derived table with it, since all nine are generated from this one.
 */
export function getPaletteColors(palette: Palette): ResolvedColors {
	if (palette === 'colorful') return { ...COLORFUL };
	const values = TABLES[palette].split(',');
	return Object.fromEntries(colorOptionsKeys.map((key, index) => [key, `#${values[index]}`])) as ResolvedColors;
}

/** Whether a palette is a dark theme, whose derived colours blend toward black instead of white. */
export function isDarkPalette(palette: Palette): boolean {
	return palette.endsWith('-dark');
}

/**
 * Writing a colour back out.
 *
 * Three outputs, three jobs, and the split is the whole point of this file:
 *
 *   - `formatStyleColor` — what goes into a MapLibre style. sRGB, legacy syntax, nothing else, ever.
 *   - `formatHex` — sRGB hex, for palettes, option equality and anything comparing colours as strings.
 *   - `formatCSS` — the colour in any space, in CSS syntax, for humans.
 *
 * The narrowness of the first is not a simplification, it is the contract. MapLibre's two parsers accept
 * hex, `rgb()`, `hsl()`, their `*a()` spellings, `transparent` and named colours — and nothing else. Give
 * either one an `oklch()` and the browser rejects the style outright, while the native renderer used by
 * the screenshot scripts logs a warning nobody reads and draws the layer **fully transparent**. So a
 * colour may be authored in any of the six spaces, and is converted on its way out.
 *
 * Out-of-gamut colours are gamut-mapped rather than clipped (see `toGamut`), because clipping an
 * `oklch()` a screen cannot show would change its hue on the way into the style.
 */

import { toGamut } from './ops.js';
import { SPACES } from './space.js';
import type { Coords, Space } from './space.js';

/** Digits kept per space when writing CSS: enough that the value re-reads to the same colour. */
const CSS_PRECISION: Readonly<Record<Space, number>> = {
	srgb: 3,
	hsl: 3,
	hwb: 3,
	hsv: 3,
	// CSS Color 4 §16.4 asks for at least 5 decimals on OKLab/OKLCh, whose lightness runs 0–1
	oklab: 5,
	oklch: 5,
};

/** Alpha is written to three decimals — the precision v5 used, and finer than 8-bit output can carry. */
const ALPHA_PRECISION = 3;

/** Rounds to `digits`, then drops trailing zeros and any bare decimal point: 0.500 → "0.5", 2.000 → "2". */
function number(value: number, digits: number): string {
	const text = value.toFixed(digits);
	return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}

/**
 * Alpha rounded the way it will be written.
 *
 * Rounding before the comparison against 1 is what keeps the output self-consistent: v5 tested the raw
 * value, so an alpha of 0.9999 chose the `rgba()` spelling and then printed its alpha as `1`.
 */
function roundAlpha(alpha: number): number {
	return Number(alpha.toFixed(ALPHA_PRECISION));
}

/** The colour as showable sRGB, 0–255, gamut-mapped if it is outside what a screen can display. */
function showable(space: Space, coords: Coords): Coords {
	return space === 'srgb' ? coords : toGamut(coords, space);
}

/**
 * `#RRGGBB`, or `#RRGGBBAA` when the colour is not opaque. Uppercase, as v5 wrote it — `minimize`
 * compares these strings, and `scripts/extract-palette.ts` writes them into palette files.
 */
export function formatHex(space: Space, coords: Coords, alpha = 1): string {
	const byte = (value: number) =>
		Math.round(Math.min(255, Math.max(0, value)))
			.toString(16)
			.padStart(2, '0')
			.toUpperCase();
	const [r, g, b] = showable(space, coords);
	const rounded = roundAlpha(alpha);
	const suffix = rounded < 1 ? byte(rounded * 255) : '';
	return `#${byte(r)}${byte(g)}${byte(b)}${suffix}`;
}

/**
 * The one format a MapLibre style may contain: `rgb(r,g,b)`, or `rgba(r,g,b,a)` when not opaque.
 *
 * Integers, no spaces, three-decimal alpha — byte for byte what v5 emitted, so adopting this changes no
 * shipped style.
 */
export function formatStyleColor(space: Space, coords: Coords, alpha = 1): string {
	const [r, g, b] = showable(space, coords);
	const channels = `${Math.round(r)},${Math.round(g)},${Math.round(b)}`;
	const rounded = roundAlpha(alpha);
	return rounded < 1 ? `rgba(${channels},${number(rounded, ALPHA_PRECISION)})` : `rgb(${channels})`;
}

/**
 * The colour written in `space`, in CSS's modern syntax: `oklch(0.7 0.15 45)`, `hsl(120 50% 50%)`,
 * `rgb(255 0 0 / 0.5)`.
 *
 * This writes the colour in the space you ask for. It does not reproduce what a browser's CSSOM would
 * return, which converts every sRGB colour to `rgb()` regardless of how it was written (CSS Color 4
 * §16.2.2) — useful inside a stylesheet engine, useless when you asked to see a colour in OKLCh.
 *
 * Not for style output: most of what this can produce, MapLibre cannot read.
 */
export function formatCSS(space: Space, coords: Coords, alpha = 1, precision = CSS_PRECISION[space]): string {
	const { channels } = SPACES[space];
	const parts = coords.map((value, index) => {
		const channel = channels[index];
		// percentage channels are written as percentages, which is how CSS spells hsl(), hwb() and hsv()
		const percentage = channel.percent === 100;
		return percentage ? `${number(value, precision)}%` : number(value, precision);
	});
	const rounded = roundAlpha(alpha);
	const tail = rounded < 1 ? ` / ${number(rounded, ALPHA_PRECISION)}` : '';
	const name = space === 'srgb' ? 'rgb' : space;
	return `${name}(${parts.join(' ')}${tail})`;
}

/** Every colour string this library is willing to put into a style — the guard tests read this. */
export const STYLE_COLOR_PATTERN = /^(#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?|rgba?\([\d.,]+\))$/;

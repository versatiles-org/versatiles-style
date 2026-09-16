import { describe, expect, it } from 'vitest';
import { ColorParseError, parseColor } from './parser.js';
import type { Space } from './space.js';

/** `[input, space, coords, alpha]` — coordinates are compared to 6 decimals. */
type Accepted = [string, Space, [number, number, number], number];

const accepted: Accepted[] = [
	// ── hex ──────────────────────────────────────────────────────────────────
	['#f00', 'srgb', [255, 0, 0], 1],
	['#F00', 'srgb', [255, 0, 0], 1],
	['#f0c', 'srgb', [255, 0, 204], 1], // each digit doubles: #f0c is #ff00cc
	['#f008', 'srgb', [255, 0, 0], 0.533333],
	['#ff00', 'srgb', [255, 255, 0], 0],
	['#ff0000', 'srgb', [255, 0, 0], 1],
	['#FF0000', 'srgb', [255, 0, 0], 1],
	['#ff000080', 'srgb', [255, 0, 0], 0.501961],
	['  #ff0000  ', 'srgb', [255, 0, 0], 1],
	['\t#ff0000\n', 'srgb', [255, 0, 0], 1],

	// ── rgb ──────────────────────────────────────────────────────────────────
	['rgb(255,0,0)', 'srgb', [255, 0, 0], 1],
	['rgb(255, 0, 0)', 'srgb', [255, 0, 0], 1],
	['rgb( 255 , 0 , 0 )', 'srgb', [255, 0, 0], 1],
	['RGB(255,0,0)', 'srgb', [255, 0, 0], 1],
	['rgb(255 0 0)', 'srgb', [255, 0, 0], 1],
	['rgba(255,0,0,0.5)', 'srgb', [255, 0, 0], 0.5],
	['rgba(255,0,0,.5)', 'srgb', [255, 0, 0], 0.5],
	['rgba(255,0,0)', 'srgb', [255, 0, 0], 1], // rgba() is just another spelling of rgb()
	['rgb(255,0,0,0.5)', 'srgb', [255, 0, 0], 0.5],
	['rgb(255 0 0 / 50%)', 'srgb', [255, 0, 0], 0.5],
	['rgb(255 0 0/.5)', 'srgb', [255, 0, 0], 0.5],
	['rgb(10.5, 0, 0)', 'srgb', [10.5, 0, 0], 1], // v5 rejected decimals outright
	['rgb(1e2, 0, 0)', 'srgb', [100, 0, 0], 1],
	// the v5 silent-mangling cases: percentages and signs were stripped before matching
	['rgb(100%,0%,0%)', 'srgb', [255, 0, 0], 1],
	['rgb(50%, 0%, 0%)', 'srgb', [127.5, 0, 0], 1],
	['rgba(255,0,0,50%)', 'srgb', [255, 0, 0], 0.5],
	['rgb(-5,0,0)', 'srgb', [0, 0, 0], 1],
	['rgb(300,0,0)', 'srgb', [255, 0, 0], 1],
	['rgb(255 0% 128)', 'srgb', [255, 0, 128], 1], // CSS allows mixing in the modern form
	['rgba(255,0,0,2)', 'srgb', [255, 0, 0], 1], // alpha clamps
	['rgba(255,0,0,-1)', 'srgb', [255, 0, 0], 0],

	// ── hsl ──────────────────────────────────────────────────────────────────
	['hsl(120,50%,50%)', 'hsl', [120, 50, 50], 1],
	['hsl(120 50% 50%)', 'hsl', [120, 50, 50], 1],
	['hsl(120deg,50%,50%)', 'hsl', [120, 50, 50], 1],
	['hsl(0.5turn 50% 50%)', 'hsl', [180, 50, 50], 1],
	['hsl(200grad 50% 50%)', 'hsl', [180, 50, 50], 1],
	['hsl(3.14159265rad 50% 50%)', 'hsl', [180, 50, 50], 1],
	['hsl(-120,50%,50%)', 'hsl', [240, 50, 50], 1], // v6: HSL.parse said 240, Color.parse threw
	['hsl(+120,50%,50%)', 'hsl', [120, 50, 50], 1],
	['hsl(480,50%,50%)', 'hsl', [120, 50, 50], 1],
	['hsla(120,50%,50%,0.5)', 'hsl', [120, 50, 50], 0.5],
	['hsl(120,50,50)', 'hsl', [120, 50, 50], 1], // relaxation: bare numbers where CSS demands %
	['hsl(120 50% 50% / 25%)', 'hsl', [120, 50, 50], 0.25],

	// ── hwb / hsv ────────────────────────────────────────────────────────────
	['hwb(120 30% 40%)', 'hwb', [120, 30, 40], 1],
	['hwb(120, 30%, 40%)', 'hwb', [120, 30, 40], 1], // relaxation: CSS gives hwb() no comma form
	['hwb(120 30% 40% / 0.5)', 'hwb', [120, 30, 40], 0.5],
	['hsv(120 50% 75%)', 'hsv', [120, 50, 75], 1],
	['hsv(120,50%,75%)', 'hsv', [120, 50, 75], 1],

	// ── oklab / oklch ────────────────────────────────────────────────────────
	['oklab(0.5 0.1 -0.1)', 'oklab', [0.5, 0.1, -0.1], 1],
	['oklab(50% 25% -25%)', 'oklab', [0.5, 0.1, -0.1], 1], // ±100% is ±0.4 on the opponent axes
	['oklab(0.5 0.1 -0.1 / 0.5)', 'oklab', [0.5, 0.1, -0.1], 0.5],
	['oklch(0.7 0.15 45)', 'oklch', [0.7, 0.15, 45], 1],
	['oklch(70% 37.5% 45deg)', 'oklch', [0.7, 0.15, 45], 1],
	['oklch(0.7 0.15 45 / 50%)', 'oklch', [0.7, 0.15, 45], 0.5],
	['oklch(0.7 0.15 -45)', 'oklch', [0.7, 0.15, 315], 1],
	['OKLCH(0.7 0.15 45)', 'oklch', [0.7, 0.15, 45], 1],
	['oklch(1.5 0.15 45)', 'oklch', [1, 0.15, 45], 1], // lightness clamps
	['oklch(0.7 -0.2 45)', 'oklch', [0.7, 0, 45], 1], // chroma clamps at the bottom
	['oklab(0.5 3 -4)', 'oklab', [0.5, 3, -4], 1], // …but the opponent axes stay open

	// ── keywords ─────────────────────────────────────────────────────────────
	['transparent', 'srgb', [0, 0, 0], 0],
	['TRANSPARENT', 'srgb', [0, 0, 0], 0],
];

describe('parseColor() accepts', () => {
	it.each(accepted)('%s', (input, space, coords, alpha) => {
		const result = parseColor(input);
		expect(result.space).toBe(space);
		for (let i = 0; i < 3; i++) expect(result.coords[i], `channel ${i}`).toBeCloseTo(coords[i], 6);
		expect(result.alpha).toBeCloseTo(alpha, 6);
	});
});

/** `[input, a fragment of the expected message]` */
const rejected: [string, string | RegExp][] = [
	// unsupported by design — each named, rather than a generic parse failure
	['steelblue', 'named colours are not supported'],
	['red', 'named colours are not supported'],
	['currentColor', 'currentColor is not supported'],
	['color-mix(in oklab, red, blue)', 'color-mix() is not supported'],
	['color(srgb 1 0 0)', 'color() is not supported'],
	['color(display-p3 1 0 0)', 'color() is not supported'],
	['lab(50% 40 59.5)', 'lab() is not supported'],
	['lch(52.2% 72.2 50)', 'lch() is not supported'],
	['light-dark(#fff, #000)', 'light-dark() is not supported'],
	['device-cmyk(0 1 1 0)', 'device-cmyk() is not supported'],
	['rgb(calc(10 + 10) 0 0)', 'calc() is not supported'],
	['rgb(from red r g b)', 'relative colour syntax is not supported'],
	['oklch(from red l c h / 50%)', 'relative colour syntax is not supported'],
	['rgb(none 0 0)', '"none" components are not supported'],
	['rgb(0 0 0 / none)', '"none" components are not supported'],

	// malformed
	['', 'the string is empty'],
	['   ', 'the string is empty'],
	['#ff', 'needs 3, 4, 6 or 8 digits'],
	['#fffff', 'needs 3, 4, 6 or 8 digits'],
	['#1234567', 'needs 3, 4, 6 or 8 digits'],
	['#f0g', 'may only contain the digits'],
	['rgb(255,0,0);', 'expected a hex colour or a colour function'],
	['rgb (255,0,0)', 'expected a hex colour or a colour function'],
	['xyz(1,2,3)', 'unknown colour function "xyz()"'],
	['hsb(1,2,3)', 'unknown colour function "hsb()"'],
	['rgb(255,0)', 'takes 3 components'],
	['rgb(1,2,3,4,5)', 'takes 3 components'],
	['hsl(120,50%)', 'takes 3 components'],
	['rgb()', 'takes 3 components'],
	['rgb(1 2 3 / )', 'not followed by an alpha'],
	['rgb(1 2 3 / 0.5 / 0.2)', 'more than one "/"'],
	['rgb(a,b,c)', '"a" is not a number'],
	['rgb(255,,0)', 'takes 3 components'],
	['rgba(255,0,0,x)', '"x" is not a valid alpha'],

	// unit errors — a hue is an angle, everything else is not
	['hsl(50% 50% 50%)', '"h" is an angle and takes no percentage'],
	['oklch(0.5 0.1 50%)', '"h" is an angle and takes no percentage'],
	['rgb(10deg 0 0)', '"r" is not an angle'],
	['hsl(120 50deg 50%)', '"s" is not an angle'],
];

describe('parseColor() rejects', () => {
	it.each(rejected)('%s', (input, expected) => {
		expect(() => parseColor(input)).toThrow(ColorParseError);
		expect(() => parseColor(input)).toThrow(expected as string);
	});

	it('quotes the caller original string, not a sanitised one', () => {
		// v5 reported rgb(255 0 0) as "rgb(25500)" — it stripped the input before matching, then
		// complained about the result
		try {
			parseColor('  rgb(1 2 3 / 0.5 / 0.2)  ');
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(ColorParseError);
			expect((error as ColorParseError).input).toBe('  rgb(1 2 3 / 0.5 / 0.2)  ');
			expect((error as Error).message).toContain('"  rgb(1 2 3 / 0.5 / 0.2)  "');
		}
	});
});

describe('parseColor() normalises', () => {
	it('wraps hues and clamps everything that clamps', () => {
		expect(parseColor('hsl(-30 150% -20%)').coords).toStrictEqual([330, 100, 0]);
		expect(parseColor('rgb(-1 999 128)').coords).toStrictEqual([0, 255, 128]);
	});

	it('keeps the space the colour was written in', () => {
		// parsing does not convert: an oklch() input stays oklch, so nothing is lost before it is used
		expect(parseColor('oklch(0.7 0.15 45)').space).toBe('oklch');
		expect(parseColor('hwb(120 30% 40%)').space).toBe('hwb');
	});
});

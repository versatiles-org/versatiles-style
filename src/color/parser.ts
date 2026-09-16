/**
 * Reading a colour written by hand.
 *
 * One parser for all six spaces, replacing v6's three (`Color.parse`, `RGB.parse`, `HSL.parse`), which
 * disagreed with each other: `hsl(-120,50%,50%)` was a colour to one and an error to another, and
 * `rgb(100%,0%,0%)` was silently read as `rgb(100,0,0)` because the input was stripped of every
 * character outside `[0-9a-z.#,()]` before matching — taking `%` and `-` with it.
 *
 * The grammar is CSS Color 4's, minus the parts that only make sense inside a stylesheet engine and with
 * two deliberate relaxations, because these inputs are written by hand rather than generated:
 *
 *   - **Commas or spaces, anywhere.** CSS gives `rgb()` and `hsl()` a legacy comma form and gives
 *     `hwb()`, `oklab()` and `oklch()` no comma form at all. Here every function takes either.
 *   - **Bare numbers where CSS's legacy form demands a percentage.** `hsl(120, 50, 50)` is an error in a
 *     browser and a colour here, reading 50 as 50%, exactly as the modern space-separated form does.
 *
 * Both relaxations accept more than CSS, never less, and never change what a valid CSS colour means.
 *
 * Not supported, each with an error that says so by name rather than a generic parse failure: named
 * colours (a 148-entry table costs more than it gives when hex is right there), `calc()`, `color-mix()`,
 * relative colour syntax, `color()`, `light-dark()`, `currentColor`, system colours, and `none`
 * components. `transparent` is supported — it is one keyword, not a table.
 */

import { normalize } from './space.js';
import type { ChannelSpec, Coords, Space } from './space.js';
import { SPACES } from './space.js';

/** A colour as written: which space it was written in, its coordinates in that space, and its alpha. */
export interface ParsedColor {
	readonly space: Space;
	readonly coords: Coords;
	readonly alpha: number;
}

/** Thrown for every input this parser rejects. Carries the caller's original string, never a sanitised one. */
export class ColorParseError extends Error {
	readonly input: string;

	constructor(input: string, reason: string) {
		super(`Cannot parse colour ${JSON.stringify(input)}: ${reason}`);
		this.name = 'ColorParseError';
		this.input = input;
	}
}

/** Colour functions, and the space each one writes in. `rgba`/`hsla` are v3 spellings of `rgb`/`hsl`. */
const FUNCTIONS: Readonly<Record<string, Space>> = {
	rgb: 'srgb',
	rgba: 'srgb',
	hsl: 'hsl',
	hsla: 'hsl',
	hwb: 'hwb',
	hsv: 'hsv',
	oklab: 'oklab',
	oklch: 'oklch',
};

/** Functions we can name but will not parse, and what to say about each. */
const UNSUPPORTED: Readonly<Record<string, string>> = {
	'color-mix': 'color-mix() is not supported — mix colours with Color.mix()',
	color: `color() is not supported — supported spaces: ${Object.keys(SPACES).join(', ')}`,
	'light-dark': 'light-dark() is not supported — build the two colours separately',
	lab: 'lab() is not supported — use oklab(), which this library converts from',
	lch: 'lch() is not supported — use oklch(), which this library converts from',
	'device-cmyk': 'device-cmyk() is not supported',
};

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const PERCENT = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)%$/i;
const ANGLE = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(deg|grad|rad|turn)$/i;
const HEX = /^#([0-9a-f]+)$/i;
const CALL = /^([a-z-]+)\(([\s\S]*)\)$/i;

const ANGLE_SCALE: Readonly<Record<string, number>> = { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 };

/** The value of one channel, interpreting `%` against that channel's reference and angles as degrees. */
function channelValue(raw: string, channel: ChannelSpec, input: string): number {
	const percent = PERCENT.exec(raw);
	if (percent) {
		if (channel.percent === undefined) {
			throw new ColorParseError(input, `"${channel.name}" is an angle and takes no percentage`);
		}
		return (parseFloat(percent[1]) / 100) * channel.percent;
	}

	const angle = ANGLE.exec(raw);
	if (angle) {
		if (!channel.hue) throw new ColorParseError(input, `"${channel.name}" is not an angle, so "${raw}" is invalid`);
		return parseFloat(angle[1]) * ANGLE_SCALE[angle[2].toLowerCase()];
	}

	if (NUMBER.test(raw)) return parseFloat(raw);

	if (raw.toLowerCase() === 'none') {
		throw new ColorParseError(input, '"none" components are not supported — write the number the colour means');
	}
	throw new ColorParseError(input, `"${raw}" is not a number`);
}

function alphaValue(raw: string, input: string): number {
	const percent = PERCENT.exec(raw);
	const value = percent ? parseFloat(percent[1]) / 100 : NUMBER.test(raw) ? parseFloat(raw) : NaN;
	if (Number.isNaN(value)) {
		if (raw.toLowerCase() === 'none') {
			throw new ColorParseError(input, '"none" components are not supported — write the number the colour means');
		}
		throw new ColorParseError(input, `"${raw}" is not a valid alpha`);
	}
	return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Splits a function's arguments into its three components and an optional alpha. */
function splitArguments(body: string, input: string): { components: string[]; alpha?: string } {
	const slashed = body.split('/');
	if (slashed.length > 2) throw new ColorParseError(input, 'more than one "/" in the arguments');

	const parts = slashed[0]
		.split(slashed[0].includes(',') ? ',' : /\s+/)
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	if (slashed.length === 2) {
		const alpha = slashed[1].trim();
		if (alpha.length === 0) throw new ColorParseError(input, 'the "/" is not followed by an alpha value');
		return { components: parts, alpha };
	}
	// no slash: a fourth argument is the alpha, as the rgba()/hsla() spellings write it
	return parts.length === 4 ? { components: parts.slice(0, 3), alpha: parts[3] } : { components: parts };
}

function parseHex(digits: string, input: string): ParsedColor {
	const size = digits.length;
	if (size !== 3 && size !== 4 && size !== 6 && size !== 8) {
		throw new ColorParseError(input, `a hex colour needs 3, 4, 6 or 8 digits, not ${size}`);
	}
	const short = size < 6;
	// the 3- and 4-digit forms duplicate each digit: #f0c is #ff00cc, not #f0c000
	const channel = (index: number): number => {
		const text = short ? digits[index].repeat(2) : digits.slice(index * 2, index * 2 + 2);
		return parseInt(text, 16);
	};
	const hasAlpha = size === 4 || size === 8;
	return {
		space: 'srgb',
		coords: [channel(0), channel(1), channel(2)],
		alpha: hasAlpha ? channel(3) / 255 : 1,
	};
}

/**
 * Reads a colour string.
 *
 * @throws {ColorParseError} for anything it cannot read — never a silently different colour.
 */
export function parseColor(input: string): ParsedColor {
	const text = input.trim();
	if (text.length === 0) throw new ColorParseError(input, 'the string is empty');

	const hex = HEX.exec(text);
	if (hex) return parseHex(hex[1], input);
	if (text.startsWith('#')) throw new ColorParseError(input, 'a hex colour may only contain the digits 0-9 and a-f');

	const call = CALL.exec(text);
	if (!call) {
		const keyword = text.toLowerCase();
		if (keyword === 'transparent') return { space: 'srgb', coords: [0, 0, 0], alpha: 0 };
		if (keyword === 'currentcolor') {
			throw new ColorParseError(input, 'currentColor is not supported — it has no value outside a stylesheet');
		}
		if (/^[a-z]+$/.test(keyword)) {
			throw new ColorParseError(input, 'named colours are not supported — write the colour as hex, e.g. "#4682B4"');
		}
		throw new ColorParseError(input, 'expected a hex colour or a colour function such as rgb() or oklch()');
	}

	const name = call[1].toLowerCase();
	const body = call[2];

	if (name in UNSUPPORTED) throw new ColorParseError(input, UNSUPPORTED[name]);
	if (!(name in FUNCTIONS)) {
		throw new ColorParseError(
			input,
			`unknown colour function "${name}()" — supported: ${Object.keys(FUNCTIONS).join(', ')}`
		);
	}
	if (/\bcalc\s*\(/i.test(body)) {
		throw new ColorParseError(input, 'calc() is not supported — write the number it computes');
	}
	if (/^\s*from\b/i.test(body)) {
		throw new ColorParseError(input, 'relative colour syntax is not supported — convert the origin colour yourself');
	}

	const space = FUNCTIONS[name];
	const { components, alpha } = splitArguments(body, input);
	if (components.length !== 3) {
		throw new ColorParseError(
			input,
			`${name}() takes 3 components${alpha === undefined ? '' : ' and an alpha'}, got ${components.length}`
		);
	}

	const { channels } = SPACES[space];
	return {
		space,
		coords: normalize(space, [
			channelValue(components[0], channels[0], input),
			channelValue(components[1], channels[1], input),
			channelValue(components[2], channels[2], input),
		]),
		alpha: alpha === undefined ? 1 : alphaValue(alpha, input),
	};
}

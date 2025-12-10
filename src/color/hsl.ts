import { Color } from './abstract.js';
import { HSV } from './hsv.js';
import { RGB } from './rgb.js';
import { clamp, formatFloat, mod } from './utils.js';

/**
 * Represents a color in the HSL (Hue, Saturation, Lightness) color space.
 * Extends the base `Color` class.
 */
export class HSL extends Color {
	/**
	 * The hue component of the color, in the range [0, 360].
	 */
	readonly h: number;

	/**
	 * The saturation component of the color, in the range [0, 100].
	 */
	readonly s: number;

	/**
	 * The lightness component of the color, in the range [0, 100].
	 */
	readonly l: number;

	/**
	 * The alpha (opacity) component of the color, in the range [0, 1].
	 */
	readonly a: number;

	/**
	 * Creates a new HSL color.
	 * @param h - The hue component, in the range [0, 360].
	 * @param s - The saturation component, in the range [0, 100].
	 * @param l - The lightness component, in the range [0, 100].
	 * @param a - The alpha (opacity) component, in the range [0, 1]. Defaults to 1.
	 */
	constructor(h: number, s: number, l: number, a: number = 1) {
		super();
		this.h = mod(h, 360);
		this.s = clamp(s, 0, 100);
		this.l = clamp(l, 0, 100);
		this.a = clamp(a, 0, 1);
	}

	/**
	 * Returns the HSL color as an array of numbers.
	 * @returns An array containing the hue, saturation, lightness, and alpha components.
	 */
	asArray(): [number, number, number, number] {
		return [this.h, this.s, this.l, this.a];
	}

	/**
	 * Returns a new HSL color with rounded components.
	 * @returns A new HSL color with rounded hue, saturation, lightness, and alpha components.
	 */
	round(): HSL {
		return new HSL(Math.round(this.h), Math.round(this.s), Math.round(this.l), Math.round(this.a * 1000) / 1000);
	}

	/**
	 * Creates a copy of the current HSL color.
	 * @returns A new HSL color with the same components as the current color.
	 */
	clone(): HSL {
		return new HSL(this.h, this.s, this.l, this.a);
	}

	/**
	 * Returns the HSL color as a CSS-compatible string.
	 * @returns A string representing the HSL color in CSS format.
	 */
	asString(): string {
		if (this.a === 1) {
			return `hsl(${this.h.toFixed(0)},${this.s.toFixed(0)}%,${this.l.toFixed(0)}%)`;
		} else {
			return `hsla(${this.h.toFixed(0)},${this.s.toFixed(0)}%,${this.l.toFixed(0)}%,${formatFloat(this.a, 3)})`;
		}
	}

	/**
	 * Returns the current HSL color.
	 * @returns The current HSL color.
	 */
	asHSL(): HSL {
		return this.clone();
	}

	/**
	 * Returns the current HSL color.
	 * @returns The current HSL color.
	 */
	toHSL(): HSL {
		return this;
	}

	/**
	 * Converts the HSL color to an HSV color.
	 * @returns A new HSV color representing the same color.
	 */
	asHSV(): HSV {
		const s = this.s / 100,
			l = this.l / 100;
		const v = l + s * Math.min(l, 1 - l);
		const sv = v === 0 ? 0 : 2 * (1 - l / v);
		return new HSV(this.h, sv * 100, v * 100, this.a);
	}

	/**
	 * Converts the HSL color to an RGB color.
	 * @returns A new RGB color representing the same color.
	 */
	asRGB(): RGB {
		const h = this.h / 360;
		const s = this.s / 100;
		const l = this.l / 100;

		// Achromatic (grey)
		if (s === 0) return new RGB(l * 255, l * 255, l * 255, this.a);

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;

		const hueToRgb = (t: number): number => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		// Convert to RGB in the 0-255 range and return
		return new RGB(255 * hueToRgb(h + 1 / 3), 255 * hueToRgb(h), 255 * hueToRgb(h - 1 / 3), this.a);
	}

	/**
	 * Parses a string or Color object into an HSL color.
	 * @param input - The input string or Color object to parse.
	 * @returns A new HSL color parsed from the input.
	 * @throws Will throw an error if the input string is not a valid HSL color string.
	 */
	static parse(input: string | Color): HSL {
		if (input instanceof Color) return input.asHSL();

		input = input.replace(/\s+/g, '').toLowerCase();

		let match = input.match(/^hsl\((?<h>[-+0-9.]+)(?:deg)?,(?<s>[-+0-9.]+)%,(?<l>[-+0-9.]+)%\)$/);
		if (match) {
			return new HSL(parseFloat(match.groups!.h), parseFloat(match.groups!.s), parseFloat(match.groups!.l));
		}

		match = input.match(/^hsla\((?<h>[-+0-9.]+)(?:deg)?,(?<s>[-+0-9.]+)%,(?<l>[-+0-9.]+)%,(?<a>[-+0-9.]+)\)$/);
		if (match) {
			return new HSL(
				parseFloat(match.groups!.h),
				parseFloat(match.groups!.s),
				parseFloat(match.groups!.l),
				parseFloat(match.groups!.a)
			);
		}

		throw new Error(`Invalid HSL color string: "${input}"`);
	}

	/**
	 * Inverts the lightness component of the HSL color.
	 * @returns A new HSL color with the lightness component inverted.
	 */
	invertLuminosity(): HSL {
		return new HSL(this.h, this.s, 100 - this.l, this.a);
	}

	/**
	 * Rotates the hue component of the HSL color by a given offset.
	 * @param offset - The amount to rotate the hue by, in degrees.
	 * @returns A new HSL color with the hue rotated by the given offset.
	 */
	rotateHue(offset: number): HSL {
		return new HSL(mod(this.h + offset, 360), this.s, this.l, this.a);
	}

	/**
	 * Increases the saturation of the HSL color by a given ratio.
	 * @param ratio - The ratio by which to increase the saturation.
	 * @returns A new HSL color with increased saturation.
	 */
	saturate(ratio: number): HSL {
		return new HSL(this.h, clamp(this.s * (1 + ratio), 0, 100), this.l, this.a);
	}

	/**
	 * Decreases the alpha (opacity) of the HSL color by a given value.
	 * @param value - The value by which to decrease the alpha.
	 * @returns A new HSL color with decreased alpha.
	 */
	fade(value: number): HSL {
		return new HSL(this.h, this.s, this.l, this.a * (1 - value));
	}
}

import { HSL } from './hsl.js';
import { HSV } from './hsv.js';
import { Color } from './abstract.js';
import { clamp, formatFloat } from './utils.js';

/**
 * Represents an RGB color with optional alpha transparency.
 *
 * @extends Color
 */
export class RGB extends Color {
	/**
	 * Red component (0-255).
	 */
	readonly r;

	/**
	 * Green component (0-255).
	 */
	readonly g;

	/**
	 * Blue component (0-255).
	 */
	readonly b;

	/**
	 * Alpha component (0-1).
	 */
	readonly a;

	/**
	 * Creates an instance of RGB.
	 *
	 * @param r - Red component (0-255).
	 * @param g - Green component (0-255).
	 * @param b - Blue component (0-255).
	 * @param a - Alpha component (0-1), defaults to 1.
	 */
	constructor(r: number, g: number, b: number, a: number = 1) {
		super();
		this.r = clamp(r, 0, 255);
		this.g = clamp(g, 0, 255);
		this.b = clamp(b, 0, 255);
		this.a = clamp(a, 0, 1);
	}

	/**
	 * Creates a clone of the current RGB color.
	 *
	 * @returns A new RGB instance with the same color values.
	 */
	clone(): RGB {
		return new RGB(this.r, this.g, this.b, this.a);
	}

	/**
	 * Returns the RGB color as an array.
	 *
	 * @returns An array containing the red, green, blue, and alpha components.
	 */
	asArray(): [number, number, number, number] {
		return [this.r, this.g, this.b, this.a];
	}

	/**
	 * Rounds the RGB color components to the nearest integer.
	 *
	 * @returns A new RGB instance with rounded color values.
	 */
	round(): RGB {
		return new RGB(Math.round(this.r), Math.round(this.g), Math.round(this.b), Math.round(this.a * 1000) / 1000);
	}

	/**
	 * Returns the RGB color as a string.
	 *
	 * @returns A string representation of the RGB color in either `rgb` or `rgba` format.
	 */
	asString(): string {
		if (this.a === 1) {
			return `rgb(${this.r.toFixed(0)},${this.g.toFixed(0)},${this.b.toFixed(0)})`;
		} else {
			return `rgba(${this.r.toFixed(0)},${this.g.toFixed(0)},${this.b.toFixed(0)},${formatFloat(this.a, 3)})`;
		}
	}

	/**
	 * Returns the RGB color as a hexadecimal string.
	 *
	 * @returns A string representation of the RGB color in hexadecimal format.
	 */
	asHex(): string {
		const r = Math.round(this.r).toString(16).padStart(2, '0');
		const g = Math.round(this.g).toString(16).padStart(2, '0');
		const b = Math.round(this.b).toString(16).padStart(2, '0');

		if (this.a === 1) {
			return `#${r}${g}${b}`.toUpperCase();
		} else {
			const a = Math.round(this.a * 255)
				.toString(16)
				.padStart(2, '0');
			return `#${r}${g}${b}${a}`.toUpperCase();
		}
	}

	/**
	 * Converts the RGB color to an HSL color.
	 *
	 * @returns An HSL instance representing the same color.
	 */
	asHSL(): HSL {
		const r = this.r / 255;
		const g = this.g / 255;
		const b = this.b / 255;
		const min = Math.min(r, g, b);
		const max = Math.max(r, g, b);
		const delta = max - min;
		let h = 0;
		let s = 0;

		if (max === min) h = 0;
		else if (r === max) h = (g - b) / delta;
		else if (g === max) h = 2 + (b - r) / delta;
		else if (b === max) h = 4 + (r - g) / delta;

		h = Math.min(h * 60, 360);
		if (h < 0) h += 360;

		const l = (min + max) / 2;

		if (max === min) s = 0;
		else if (l <= 0.5) s = delta / (max + min);
		else s = delta / (2 - max - min);

		return new HSL(h, s * 100, l * 100, this.a);
	}

	/**
	 * Converts the RGB color to an HSV color.
	 *
	 * @returns An HSV instance representing the same color.
	 */
	asHSV(): HSV {
		const r = this.r / 255;
		const g = this.g / 255;
		const b = this.b / 255;
		const v = Math.max(r, g, b);
		const diff = v - Math.min(r, g, b);

		let h = 0;
		let s = 0;
		if (diff !== 0) {
			function diffc(c: number): number {
				return (v - c) / 6 / diff + 1 / 2;
			}

			s = diff / v;
			const rdif = diffc(r);
			const gdif = diffc(g);
			const bdif = diffc(b);

			if (r === v) h = bdif - gdif;
			else if (g === v) h = 1 / 3 + rdif - bdif;
			else if (b === v) h = 2 / 3 + gdif - rdif;

			if (h < 0) h += 1;
			else if (h > 1) h -= 1;
		}

		return new HSV(h * 360, s * 100, v * 100, this.a);
	}

	/**
	 * Returns the RGB color.
	 *
	 * @returns The current RGB instance.
	 */
	asRGB(): RGB {
		return this.clone();
	}

	/**
	 * Returns the RGB color.
	 *
	 * @returns The current RGB instance.
	 */
	toRGB(): RGB {
		return this;
	}

	/**
	 * Parses a string or Color instance into an RGB color.
	 *
	 * @param input - The input string or Color instance to parse.
	 * @returns A new RGB instance representing the parsed color.
	 * @throws Will throw an error if the input string is not a valid RGB color string.
	 */
	static parse(input: string | Color): RGB {
		if (input instanceof Color) return input.asRGB();

		input = input.toLowerCase().replaceAll(/[^0-9a-z.#,()]/g, '');

		let match;

		match = input.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/);
		if (match) {
			const r = parseInt(match[1], 16);
			const g = parseInt(match[2], 16);
			const b = parseInt(match[3], 16);
			const a = match[4] ? parseInt(match[4], 16) / 255 : 1;
			return new RGB(r, g, b, a);
		}

		match = input.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/);
		if (match) {
			const r = parseInt(match[1], 16) * 17;
			const g = parseInt(match[2], 16) * 17;
			const b = parseInt(match[3], 16) * 17;
			const a = match[4] ? parseInt(match[4], 16) / 15 : 1;
			return new RGB(r, g, b, a);
		}

		input = input.trim().toLowerCase().replaceAll(' ', '');

		match = input.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
		if (match) {
			const r = parseInt(match[1]);
			const g = parseInt(match[2]);
			const b = parseInt(match[3]);
			return new RGB(r, g, b);
		}

		match = input.match(/^rgba\((\d+),(\d+),(\d+),([.\d]+)\)$/);
		if (match) {
			const r = parseInt(match[1]);
			const g = parseInt(match[2]);
			const b = parseInt(match[3]);
			const a = parseFloat(match[4]);
			return new RGB(r, g, b, a);
		}

		throw new Error(`Invalid RGB color string: "${input}"`);
	}

	/**
	 * Adjusts the gamma of the RGB color.
	 *
	 * @param value - The gamma value to apply.
	 * @returns A new RGB instance with the adjusted gamma.
	 */
	gamma(value: number): RGB {
		if (value < 1e-3) value = 1e-3;
		if (value > 1e3) value = 1e3;
		return new RGB(
			Math.pow(this.r / 255, value) * 255,
			Math.pow(this.g / 255, value) * 255,
			Math.pow(this.b / 255, value) * 255,
			this.a
		);
	}

	/**
	 * Inverts the RGB color.
	 *
	 * @returns A new RGB instance with the inverted color values.
	 */
	invert(): RGB {
		return new RGB(255 - this.r, 255 - this.g, 255 - this.b, this.a);
	}

	/**
	 * Adjusts the contrast of the RGB color.
	 *
	 * @param value - The contrast value to apply.
	 * @returns A new RGB instance with the adjusted contrast.
	 */
	contrast(value: number): RGB {
		if (value < 0) value = 0;
		if (value > 1e6) value = 1e6;
		return new RGB(
			clamp((this.r - 127.5) * value + 127.5, 0, 255),
			clamp((this.g - 127.5) * value + 127.5, 0, 255),
			clamp((this.b - 127.5) * value + 127.5, 0, 255),
			this.a
		);
	}

	/**
	 * Adjusts the brightness of the RGB color.
	 *
	 * @param value - The brightness value to apply.
	 * @returns A new RGB instance with the adjusted brightness.
	 */
	brightness(value: number): RGB {
		if (value < -1) value = -1;
		if (value > 1) value = 1;
		const a = 1 - Math.abs(value);
		const b = value < 0 ? 0 : 255 * value;
		return new RGB(this.r * a + b, this.g * a + b, this.b * a + b, this.a);
	}

	/**
	 * Tints the RGB color with another color.
	 *
	 * @param value - The tint value to apply.
	 * @param tintColor - The color to use for tinting.
	 * @returns A new RGB instance with the applied tint.
	 */
	tint(value: number, tintColor: Color): RGB {
		if (value < 0) value = 0;
		if (value > 1) value = 1;
		const rgbNew = this.setHue(tintColor.asHSV().h).asRGB();
		return new RGB(
			this.r * (1 - value) + value * rgbNew.r,
			this.g * (1 - value) + value * rgbNew.g,
			this.b * (1 - value) + value * rgbNew.b,
			this.a
		);
	}

	/**
	 * Blends the RGB color with another color.
	 *
	 * @param value - The blend value to apply.
	 * @param blendColor - The color to blend with.
	 * @returns A new RGB instance with the blended color.
	 */
	blend(value: number, blendColor: Color): RGB {
		value = clamp(value ?? 0, 0, 1);
		const rgbNew = blendColor.asRGB();
		return new RGB(
			this.r * (1 - value) + value * rgbNew.r,
			this.g * (1 - value) + value * rgbNew.g,
			this.b * (1 - value) + value * rgbNew.b,
			this.a
		);
	}

	/**
	 * Lightens the RGB color.
	 *
	 * @param ratio - The ratio to lighten the color by.
	 * @returns A new RGB instance with the lightened color.
	 */
	lighten(ratio: number): RGB {
		return new RGB(
			clamp(255 - (255 - this.r) * (1 - ratio), 0, 255),
			clamp(255 - (255 - this.g) * (1 - ratio), 0, 255),
			clamp(255 - (255 - this.b) * (1 - ratio), 0, 255),
			this.a
		);
	}

	/**
	 * Darkens the RGB color.
	 *
	 * @param ratio - The ratio to darken the color by.
	 * @returns A new RGB instance with the darkened color.
	 */
	darken(ratio: number): RGB {
		return new RGB(
			clamp(this.r * (1 - ratio), 0, 255),
			clamp(this.g * (1 - ratio), 0, 255),
			clamp(this.b * (1 - ratio), 0, 255),
			this.a
		);
	}

	/**
	 * Fades the RGB color by reducing its alpha value.
	 *
	 * @param value - The fade value to apply.
	 * @returns A new RGB instance with the faded color.
	 */
	fade(value: number): RGB {
		return new RGB(this.r, this.g, this.b, this.a * (1 - value));
	}
}

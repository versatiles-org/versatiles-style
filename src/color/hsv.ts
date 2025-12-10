import { Color } from './abstract.js';
import { HSL } from './hsl.js';
import randomColor, { RandomColorOptions } from './random.js';
import { RGB } from './rgb.js';
import { clamp, mod } from './utils.js';

/**
 * Represents a color in the HSV (Hue, Saturation, Value) color space.
 * Extends the base `Color` class.
 */
export class HSV extends Color {
	/**
	 * The hue component of the color, in the range [0, 360].
	 */
	readonly h: number;

	/**
	 * The saturation component of the color, in the range [0, 100].
	 */
	readonly s: number;

	/**
	 * The value (brightness) component of the color, in the range [0, 100].
	 */
	readonly v: number;

	/**
	 * The alpha (opacity) component of the color, in the range [0, 1].
	 */
	readonly a: number;

	/**
	 * Constructs a new HSV color.
	 * @param h - The hue component, in the range [0, 360].
	 * @param s - The saturation component, in the range [0, 100].
	 * @param v - The value (brightness) component, in the range [0, 100].
	 * @param a - The alpha (opacity) component, in the range [0, 1]. Defaults to 1.
	 */
	constructor(h: number, s: number, v: number, a: number = 1) {
		super();
		this.h = mod(h, 360);
		this.s = clamp(s, 0, 100);
		this.v = clamp(v, 0, 100);
		this.a = clamp(a, 0, 1);
	}

	/**
	 * Returns the HSV color as an array of numbers.
	 * @returns An array containing the hue, saturation, value, and alpha components.
	 */
	asArray(): [number, number, number, number] {
		return [this.h, this.s, this.v, this.a];
	}

	/**
	 * Returns a new HSV color with the components rounded to the nearest integer.
	 * @returns A new HSV color with rounded components.
	 */
	round(): HSV {
		return new HSV(Math.round(this.h), Math.round(this.s), Math.round(this.v), Math.round(this.a * 1000) / 1000);
	}

	/**
	 * Returns the color as a string representation.
	 * @returns A string representation of the color.
	 */
	asString(): string {
		return this.asHSL().asString();
	}

	/**
	 * Creates a new HSV color that is a copy of the current color.
	 * @returns A new HSV color that is a clone of the current color.
	 */
	clone(): HSV {
		return new HSV(this.h, this.s, this.v, this.a);
	}

	/**
	 * Converts the HSV color to an HSL color.
	 * @returns An HSL representation of the color.
	 */
	asHSL(): HSL {
		const s = this.s / 100;
		const v = this.v / 100;
		const k = (2 - s) * v;
		const q = k < 1 ? k : 2 - k;
		return new HSL(this.h, q == 0 ? 0 : (100 * s * v) / q, (100 * k) / 2, this.a);
	}

	/**
	 * Returns the current HSV color.
	 * @returns The current HSV color.
	 */
	asHSV(): HSV {
		return this.clone();
	}

	/**
	 * Returns the current HSV color.
	 * @returns The current HSV color.
	 */
	toHSV(): HSV {
		return this;
	}

	/**
	 * Converts the HSV color to an RGB color.
	 * @returns An RGB representation of the color.
	 */
	asRGB(): RGB {
		const h = this.h / 360; // Normalize h to range [0, 1]
		const s = this.s / 100; // Normalize s to range [0, 1]
		const v = this.v / 100; // Normalize v to range [0, 1]

		let r = 0,
			g = 0,
			b = 0;

		if (s === 0) {
			// Achromatic (grey)
			r = g = b = v;
		} else {
			const i = Math.floor(h * 6); // Determine the sector of the color wheel
			const f = h * 6 - i; // Fractional part of h * 6
			const p = v * (1 - s);
			const q = v * (1 - s * f);
			const t = v * (1 - s * (1 - f));

			switch (i % 6) {
				case 0:
					r = v;
					g = t;
					b = p;
					break;
				case 1:
					r = q;
					g = v;
					b = p;
					break;
				case 2:
					r = p;
					g = v;
					b = t;
					break;
				case 3:
					r = p;
					g = q;
					b = v;
					break;
				case 4:
					r = t;
					g = p;
					b = v;
					break;
				case 5:
					r = v;
					g = p;
					b = q;
					break;
			}
		}

		// Convert to RGB in the 0-255 range and return
		return new RGB(r * 255, g * 255, b * 255, this.a);
	}

	/**
	 * Fades the color by a given value.
	 * @param value - The amount to fade the color by, in the range [0, 1].
	 * @returns A new HSV color with the alpha component faded by the given value.
	 */
	fade(value: number): HSV {
		return new HSV(this.h, this.s, this.v, this.a * (1 - value));
	}

	/**
	 * Sets the hue component of the color.
	 * @param value - The new hue value, in the range [0, 360].
	 * @returns A new HSV color with the updated hue component.
	 */
	setHue(value: number): HSV {
		return new HSV(value, this.s, this.v, this.a);
	}

	static randomColor(options?: RandomColorOptions): HSV {
		return randomColor(options);
	}
}

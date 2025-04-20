import type { HSL } from './hsl.js';
import type { HSV } from './hsv.js';
import type { RGB } from './rgb.js';

/**
 * The abstract `Color` class provides a blueprint for color manipulation and conversion.
 * It includes methods for converting between different color models ({@link HSL}, {@link HSV}, {@link RGB}),
 * as well as various color transformations such as inversion, rotation, saturation, and blending.
 * 
 * @abstract
 */
/**
 * Abstract class representing a color.
 */
export abstract class Color {
	/**
	 * Parses a color from a string or another Color instance.
	 * @param input - The input color as a string or Color instance.
	 * @returns The parsed Color instance.
	 */
	static parse: (input: Color | string) => Color;

	/**
	 * The HSL color model.
	 */
	static HSL: typeof HSL;

	/**
	 * The HSV color model.
	 */
	static HSV: typeof HSV;

	/**
	 * The RGB color model.
	 */
	static RGB: typeof RGB;

	/**
	 * Creates a clone of the current color instance.
	 * @returns A new Color instance that is a clone of the current instance.
	 */
	abstract clone(): Color;

	/**
	 * Converts the color to a hexadecimal string.
	 * @returns The hexadecimal representation of the color.
	 */
	asHex(): string {
		return this.asRGB().asHex();
	}

	/**
	 * Converts the color to a string representation.
	 * @returns The string representation of the color.
	 */
	abstract asString(): string;

	/**
	 * Rounds the color values.
	 * @returns A new Color instance with rounded values.
	 */
	abstract round(): Color;

	/**
	 * Converts the color to an array of numbers.
	 * @returns An array representing the color.
	 */
	abstract asArray(): number[];

	/**
	 * Converts the color to the HSL color model.
	 * @returns The HSL representation of the color.
	 */
	abstract asHSL(): HSL;

	/**
	 * Converts the color to the HSV color model.
	 * @returns The HSV representation of the color.
	 */
	abstract asHSV(): HSV;

	/**
	 * Converts the color to the RGB color model.
	 * @returns The RGB representation of the color.
	 */
	abstract asRGB(): RGB;

	/**
	 * Inverts the luminosity of the color.
	 * @returns A new HSL color with inverted luminosity.
	 */
	invertLuminosity(): HSL {
		return this.asHSL().invertLuminosity();
	}

	/**
	 * Rotates the hue of the color by a given offset.
	 * @param offset - The amount to rotate the hue.
	 * @returns A new HSL color with the hue rotated.
	 */
	rotateHue(offset: number): HSL {
		return this.asHSL().rotateHue(offset);
	}

	/**
	 * Saturates the color by a given ratio.
	 * @param ratio - The ratio to saturate the color.
	 * @returns A new HSL color with increased saturation.
	 */
	saturate(ratio: number): HSL {
		return this.asHSL().saturate(ratio);
	}

	/**
	 * Applies gamma correction to the color.
	 * @param value - The gamma correction value.
	 * @returns A new RGB color with gamma correction applied.
	 */
	gamma(value: number): RGB {
		return this.asRGB().gamma(value);
	}

	/**
	 * Inverts the color.
	 * @returns A new RGB color with inverted values.
	 */
	invert(): RGB {
		return this.asRGB().invert();
	}

	/**
	 * Adjusts the contrast of the color.
	 * @param value - The contrast adjustment value.
	 * @returns A new RGB color with adjusted contrast.
	 */
	contrast(value: number): RGB {
		return this.asRGB().contrast(value);
	}

	/**
	 * Adjusts the brightness of the color.
	 * @param value - The brightness adjustment value.
	 * @returns A new RGB color with adjusted brightness.
	 */
	brightness(value: number): RGB {
		return this.asRGB().brightness(value);
	}

	/**
	 * Lightens the color by a given value.
	 * @param value - The amount to lighten the color.
	 * @returns A new RGB color that is lightened.
	 */
	lighten(value: number): RGB {
		return this.asRGB().lighten(value);
	}

	/**
	 * Darkens the color by a given value.
	 * @param value - The amount to darken the color.
	 * @returns A new RGB color that is darkened.
	 */
	darken(value: number): RGB {
		return this.asRGB().darken(value);
	}

	/**
	 * Tints the color by blending it with another color.
	 * @param value - The blend ratio.
	 * @param tintColor - The color to blend with.
	 * @returns A new RGB color that is tinted.
	 */
	tint(value: number, tintColor: Color): RGB {
		return this.asRGB().tint(value, tintColor);
	}

	/**
	 * Blends the color with another color.
	 * @param value - The blend ratio.
	 * @param blendColor - The color to blend with.
	 * @returns A new RGB color that is blended.
	 */
	blend(value: number, blendColor: Color): RGB {
		return this.asRGB().blend(value, blendColor);
	}

	/**
	 * Sets the hue of the color.
	 * @param value - The new hue value.
	 * @returns A new HSV color with the hue set.
	 */
	setHue(value: number): HSV {
		return this.asHSV().setHue(value);
	}

	/**
	 * Fades the color by a given value.
	 * @param value - The fade value.
	 * @returns A new Color instance that is faded.
	 */
	abstract fade(value: number): Color;
}

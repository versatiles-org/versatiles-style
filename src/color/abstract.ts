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
	 * Returns a new color with the HSL lightness flipped (L → 100 − L).
	 * Hue and saturation are preserved, so a light cream becomes a dark cream of the same hue.
	 * Useful for deriving a dark-theme palette from a light-theme palette.
	 *
	 * @returns A new HSL color with the lightness inverted.
	 */
	invertLuminosity(): HSL {
		return this.asHSL().invertLuminosity();
	}

	/**
	 * Rotates the hue around the color wheel.
	 *
	 * @param offset - Rotation in degrees. Any number is accepted and reduced modulo 360.
	 *                 0 leaves the hue unchanged; 180 yields the complementary hue.
	 * @returns A new HSL color with the rotated hue.
	 */
	rotateHue(offset: number): HSL {
		return this.asHSL().rotateHue(offset);
	}

	/**
	 * Scales the HSL saturation by `(1 + ratio)`, then clamps to [0, 100].
	 *
	 * @param ratio - Saturation change ratio. Range: [-1, ∞).
	 *                -1 fully desaturates (gray); 0 is identity; 1 doubles saturation;
	 *                values that would push S past 100 are clamped.
	 * @returns A new HSL color with adjusted saturation.
	 */
	saturate(ratio: number): HSL {
		return this.asHSL().saturate(ratio);
	}

	/**
	 * Applies a per-channel gamma correction: `c → 255 · (c/255)^value`.
	 *
	 * @param value - Gamma exponent. Clamped to [1e-3, 1e3].
	 *                1 is identity; <1 brightens midtones; >1 darkens midtones.
	 * @returns A new RGB color with gamma correction applied.
	 */
	gamma(value: number): RGB {
		return this.asRGB().gamma(value);
	}

	/**
	 * Inverts each RGB channel: `c → 255 − c`. The hue is also flipped.
	 * For a hue-preserving "dark mode" inversion, use {@link invertLuminosity} instead.
	 *
	 * @returns A new RGB color with all channels inverted.
	 */
	invert(): RGB {
		return this.asRGB().invert();
	}

	/**
	 * Scales each RGB channel around the midpoint 127.5: `c → (c − 127.5) · value + 127.5`,
	 * clamped to [0, 255].
	 *
	 * @param value - Contrast multiplier. Clamped to [0, 1e6].
	 *                1 is identity; 0 collapses the color to mid-gray (#808080);
	 *                values >1 increase contrast; very large values push each channel to 0 or 255.
	 * @returns A new RGB color with adjusted contrast.
	 */
	contrast(value: number): RGB {
		return this.asRGB().contrast(value);
	}

	/**
	 * Linearly shifts each RGB channel toward black (negative `value`) or white (positive `value`).
	 *
	 * @param value - Brightness shift. Clamped to [-1, 1].
	 *                0 is identity; -1 yields pure black; +1 yields pure white.
	 * @returns A new RGB color with adjusted brightness.
	 */
	brightness(value: number): RGB {
		return this.asRGB().brightness(value);
	}

	/**
	 * Blends each RGB channel toward white. Mathematically equivalent to {@link blend} with white as target.
	 *
	 * Note: this operation is theme-absolute — under luminosity inversion it still moves toward white,
	 * which means "lighten" inverts in meaning relative to a dark background.
	 * For inversion-safe rules use `blend(value, bg)` where `bg` is your style's background reference.
	 *
	 * @param value - Lightening ratio. Range: [0, 1] (values are clamped).
	 *                0 is identity; 1 yields pure white.
	 * @returns A new RGB color, lightened.
	 */
	lighten(value: number): RGB {
		return this.asRGB().lighten(value);
	}

	/**
	 * Multiplies each RGB channel by `(1 − value)`. Mathematically equivalent to {@link blend} with black as target.
	 *
	 * Note: this operation is theme-absolute — under luminosity inversion it still moves toward black,
	 * not toward the dark-theme contrast endpoint.
	 * For inversion-safe rules use `blend(value, fg)` where `fg` is your style's foreground/contrast reference.
	 *
	 * @param value - Darkening ratio. Range: [0, 1] (values are clamped).
	 *                0 is identity; 1 yields pure black.
	 * @returns A new RGB color, darkened.
	 */
	darken(value: number): RGB {
		return this.asRGB().darken(value);
	}

	/**
	 * Shifts the hue toward `tintColor`'s hue, blending in RGB space.
	 * Internally: derives a version of this color carrying `tintColor`'s hue, then linearly interpolates
	 * between this and that variant by `value`.
	 *
	 * @param value - Tint amount. Range: [0, 1] (clamped).
	 *                0 is identity; 1 yields this color's luminosity/saturation but with `tintColor`'s hue.
	 * @param tintColor - Color whose hue is used for tinting; only its hue matters.
	 * @returns A new RGB color, tinted.
	 */
	tint(value: number, tintColor: Color): RGB {
		return this.asRGB().tint(value, tintColor);
	}

	/**
	 * Linearly interpolates between this color and `blendColor` in RGB space.
	 *
	 * @param value - Blend ratio. Range: [0, 1] (clamped; `null`/`undefined` treated as 0).
	 *                0 returns this color; 1 returns `blendColor`.
	 * @param blendColor - Target color to blend toward.
	 * @returns A new RGB color, blended.
	 */
	blend(value: number, blendColor: Color): RGB {
		return this.asRGB().blend(value, blendColor);
	}

	/**
	 * Replaces the hue, preserving saturation and value.
	 *
	 * @param value - Hue in degrees. Any number; reduced modulo 360.
	 * @returns A new HSV color with the new hue.
	 */
	setHue(value: number): HSV {
		return this.asHSV().setHue(value);
	}

	/**
	 * Reduces the alpha proportionally: `a → a · (1 − value)`.
	 *
	 * @param value - Fade amount. Range: [0, 1].
	 *                0 is identity; 1 yields fully transparent.
	 * @returns A new color with reduced alpha.
	 */
	abstract fade(value: number): Color;
}

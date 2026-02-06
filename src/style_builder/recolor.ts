/**
 * Module for applying various color transformations such as hue rotation, saturation, contrast, brightness,
 * tinting, and blending. These transformations are defined through the `RecolorOptions` interface.
 */

import { Color } from '../color/index.js';

/**
 * Configuration options for recoloring all map colors.
 *
 * The transformations (if specified) are done in the following order:
 * 1. [Invert brightness](#invertbrightness)
 * 2. [Rotate hue](#rotate)
 * 3. [Saturate](#saturate)
 * 4. [Gamma correction](#gamma)
 * 5. [Contrast adjustment](#contrast)
 * 6. [Brightness adjustment](#brightness)
 * 7. [Tinting](#tint)
 * 8. [Blending](#blend)
 *
 * Usage Examples
 *
 * ```typescript
 * const style = VersaTilesStyle.colorful({
 *   recolor: {
 *     rotate: 180,
 *     saturate: 0.5,
 *     brightness: 0.2,
 *   }
 * };
 * ```
 *
 * If you want do make you map simply brighter or darker, you can use the `blend` option:
 * ```typescript
 * const style = VersaTilesStyle.colorful({
 *   recolor: {
 *     blend: 0.5,
 *     blendColor: '#000000', // to blend all colors with black
 *     // or blendColor: '#FFFFFF', // to blend all colors with white
 *   }
 * };
 * ```
 *
 */

export interface RecolorOptions {
	/**
	 * If true, inverts all colors' brightness.
	 * See also {@link HSL.invertLuminosity}
	 */
	invertBrightness?: boolean;

	/**
	 * Rotate the hue of all colors in degrees (0-360).
	 * See also {@link HSL.rotateHue}
	 */
	rotate?: number;

	/**
	 * Adjust the saturation level. Positive values increase, negative values decrease saturation.
	 * |value|effect           |
	 * |----:|-----------------|
	 * |   -1|grayscale        |
	 * |    0|no effect        |
	 * |    1|double saturation|
	 *
	 * See also {@link HSL.saturate}
	 */
	saturate?: number;

	/**
	 * Adjust the gamma (non-linear brightness adjustment).
	 * Defaults to 1.
	 * See also {@link RGB.gamma}
	 */
	gamma?: number;

	/**
	 * Adjust the contrast level.
	 * Values > 1 increase contrast, values < 1 decrease it.
	 * Defaults to 1.
	 * See also {@link RGB.contrast}
	 */
	contrast?: number;

	/**
	 * Adjust the brightness level.
	 * Positive values make it brighter, negative values make it darker.
	 * Defaults to 0.
	 *	See also {@link RGB.brightness}
	 */
	brightness?: number;

	/**
	 * Intensity of the tinting effect (0 = none, 1 = full effect).
	 * See also {@link RGB.tint}
	 */
	tint?: number;

	/**
	 * The tinting color in hex format (default: '#FF0000').
	 * See also {@link RGB.tint}
	 */
	tintColor?: string;

	/**
	 * Intensity of the blending effect (0 = none, 1 = full effect).
	 * See also {@link RGB.blend}
	 */
	blend?: number;

	/**
	 * The blending color in hex format (default: '#000000').
	 *	See also {@link RGB.blend}
	 */
	blendColor?: string;
}

/**
 * Returns the default recolor settings.
 */
export function getDefaultRecolorFlags(): RecolorOptions {
	return {
		invertBrightness: false,
		rotate: 0,
		saturate: 0,
		gamma: 1,
		contrast: 1,
		brightness: 0,
		tint: 0,
		tintColor: '#FF0000',
		blend: 0,
		blendColor: '#000000',
	};
}

/**
 * Checks if the given options object contains any active recolor transformations.
 * @param opt The recolor options to validate.
 */
function isValidRecolorOptions(opt?: RecolorOptions): opt is RecolorOptions {
	if (!opt) return false;
	return (
		opt.invertBrightness ||
		(opt.rotate != null && opt.rotate !== 0) ||
		(opt.saturate != null && opt.saturate !== 0) ||
		(opt.gamma != null && opt.gamma !== 1) ||
		(opt.contrast != null && opt.contrast !== 1) ||
		(opt.brightness != null && opt.brightness !== 0) ||
		(opt.tint != null && opt.tint !== 0) ||
		(opt.tintColor != null && opt.tintColor !== '#FF0000') ||
		(opt.blend != null && opt.blend !== 0) ||
		(opt.blendColor != null && opt.blendColor !== '#000000')
	);
}

/**
 * Applies recoloring transformations to a record of colors.
 * @param colors A record of color names to `Color` instances.
 * @param opt Optional recolor options.
 */
export function recolorObject(colors: Record<string, Color>, opt?: RecolorOptions): void {
	if (!isValidRecolorOptions(opt)) return;

	for (const [key, color] of Object.entries(colors)) {
		colors[key] = recolor(color, opt);
	}
}

/**
 * Applies recoloring transformations to an array of colors.
 * @param colors An array of `Color` instances.
 * @param opt Optional recolor options.
 */
export function recolorArray(colors: Color[], opt?: RecolorOptions): void {
	if (!isValidRecolorOptions(opt)) return;

	for (let i = 0; i < colors.length; i++) {
		colors[i] = recolor(colors[i], opt);
	}
}

/**
 * Caches recolored colors to optimize performance.
 */
export class CachedRecolor {
	private readonly skip: boolean;
	private readonly opt?: RecolorOptions;
	private readonly cache: Map<string, Color>;

	/**
	 * Creates a cached recolor instance.
	 * @param opt Optional recolor options.
	 */
	public constructor(opt?: RecolorOptions) {
		this.skip = !isValidRecolorOptions(opt);
		this.cache = new Map();
		this.opt = opt;
	}

	/**
	 * Applies cached recoloring to a given color.
	 * @param color The color to recolor.
	 * @returns The recolored color, either from cache or newly computed.
	 */
	public do(color: Color): Color {
		if (this.skip) return color;

		const key = color.asHex();
		if (this.cache.has(key)) return this.cache.get(key)!;

		const recolored = recolor(color, this.opt);
		this.cache.set(key, recolored);
		return recolored;
	}
}

/**
 * Applies the specified recoloring transformations to a single color.
 * @param color The original color.
 * @param opt Optional recolor options.
 * @returns A new `Color` instance with applied transformations.
 */
export function recolor(color: Color, opt?: RecolorOptions): Color {
	if (!isValidRecolorOptions(opt)) return color;

	if (opt.invertBrightness) color = color.invertLuminosity();
	if (opt.rotate) color = color.rotateHue(opt.rotate);
	if (opt.saturate) color = color.saturate(opt.saturate);
	if (opt.gamma != null && opt.gamma !== 1) color = color.gamma(opt.gamma);
	if (opt.contrast != null && opt.contrast !== 1) color = color.contrast(opt.contrast);
	if (opt.brightness) color = color.brightness(opt.brightness);
	if (opt.tint && opt.tintColor != null) color = color.tint(opt.tint, Color.parse(opt.tintColor));
	if (opt.blend && opt.blendColor != null) color = color.blend(opt.blend, Color.parse(opt.blendColor));

	return color;
}

import Color from 'color';

export interface RecolorOptions {
	// If true, inverts all colors.
	invertBrightness?: boolean;

	// Rotate the hue of all colors (in degrees).
	rotate?: number;

	// Adjusts the saturation level of all colors. Positive values increase saturation, negative values decrease it.
	saturate?: number;

	// Adjusts the gamma of all colors. Affects the brightness in a non-linear manner.
	gamma?: number;

	// Adjusts the contrast of all colors. Higher values produce more contrast.
	contrast?: number;

	// Adjusts the brightness of all colors. Positive values make it brighter, negative values make it darker.
	brightness?: number;

	// Specifies the intensity of the tinting effect. Ranges from 0 (no effect) to 1 (full effect).
	tint?: number;

	// Specifies the color used for tinting, in a string format (e.g., '#FF0000').
	tintColor?: string;
}

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
	};
}

function isValidRecolorOptions(opt?: RecolorOptions): opt is RecolorOptions {
	if (!opt) return false;
	if ((opt.invertBrightness != null) && opt.invertBrightness) return true;
	if ((opt.rotate != null) && (opt.rotate !== 0)) return true;
	if ((opt.saturate != null) && (opt.saturate !== 0)) return true;
	if ((opt.gamma != null) && (opt.gamma !== 1)) return true;
	if ((opt.contrast != null) && (opt.contrast !== 1)) return true;
	if ((opt.brightness != null) && (opt.brightness !== 0)) return true;
	if ((opt.tint != null) && (opt.tint !== 0)) return true;
	if ((opt.tintColor != null) && (opt.tintColor !== '#FF0000')) return true;
	return false;
}

export function recolorObject(colors: Record<string, Color>, opt?: RecolorOptions): void {
	if (!isValidRecolorOptions(opt)) return;

	for (const [k, c] of Object.entries(colors)) {
		colors[k] = recolor(c, opt);
	}
}

export class CachedRecolor {
	private readonly skip: boolean;

	private readonly opt?: RecolorOptions;

	private readonly cache: Map<string, Color>;

	public constructor(opt?: RecolorOptions) {
		this.skip = !isValidRecolorOptions(opt);
		this.cache = new Map();
		this.opt = opt;
	}

	public do(color: Color): Color {
		if (this.skip) return color;

		const key = color.string();

		const result = this.cache.get(key);
		if (result) return result;

		color = recolor(color, this.opt);
		this.cache.set(key, color);
		return color;
	}
}

export function recolor(color: Color, opt?: RecolorOptions): Color {
	if (!isValidRecolorOptions(opt)) return color;

	if (opt.invertBrightness ?? false) color = invert(color);
	if ((opt.rotate !== undefined) && (opt.rotate !== 0)) color = color.rotate(opt.rotate);
	if ((opt.saturate !== undefined) && (opt.saturate !== 0)) color = color.saturate(opt.saturate);
	if ((opt.gamma !== undefined) && (opt.gamma !== 1)) color = gamma(color, opt.gamma);
	if ((opt.contrast !== undefined) && (opt.contrast !== 1)) color = contrast(color, opt.contrast);
	if ((opt.brightness !== undefined) && (opt.brightness !== 0)) color = brightness(color, opt.brightness);
	if ((opt.tint !== undefined) && (opt.tintColor !== undefined) && (opt.tint !== 0)) color = tint(color, opt.tint, Color(opt.tintColor));

	return color;

	function invert(c: Color): Color {
		c = c.hsl();
		return c.lightness(100 - c.lightness()).rgb();
	}

	function gamma(c: Color, value: number): Color {
		if (value < 1e-3) value = 1e-3;
		if (value > 1e3) value = 1e3;
		const rgb: number[] = c.rgb().array();
		return Color.rgb(
			Math.pow(rgb[0] / 255, value) * 255,
			Math.pow(rgb[1] / 255, value) * 255,
			Math.pow(rgb[2] / 255, value) * 255,
			c.alpha(),
		);
	}

	function contrast(c: Color, value: number): Color {
		if (value < 0) value = 0;
		if (value > 1e6) value = 1e6;
		const rgb: number[] = c.rgb().array();
		return Color.rgb(
			(rgb[0] - 127.5) * value + 127.5,
			(rgb[1] - 127.5) * value + 127.5,
			(rgb[2] - 127.5) * value + 127.5,
			c.alpha(),
		);
	}

	function brightness(c: Color, value: number): Color {
		if (value < -1e6) value = -1e6;
		if (value > 1e6) value = 1e6;
		const a = 1 - Math.abs(value);
		const b = (value < 0) ? 0 : 255 * value;
		const rgb: number[] = c.rgb().array();
		return Color.rgb(
			rgb[0] * a + b,
			rgb[1] * a + b,
			rgb[2] * a + b,
			c.alpha(),
		);
	}

	function tint(c: Color, value: number, tintColor: Color): Color {
		if (value < 0) value = 0;
		if (value > 1) value = 1;
		const rgb0: number[] = c.rgb().array();
		const hsv: number[] = c.hsv().array();
		hsv[0] = tintColor.hue();
		const rgbNew = Color.hsv(hsv).rgb().array();

		return Color.rgb(
			rgb0[0] * (1 - value) + value * rgbNew[0],
			rgb0[1] * (1 - value) + value * rgbNew[1],
			rgb0[2] * (1 - value) + value * rgbNew[2],
			c.alpha(),
		);
	}
}

import Color from '../color/index.ts';

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

export function recolorArray(colors: Color[], opt?: RecolorOptions): void {
	if (!isValidRecolorOptions(opt)) return;

	for (let i = 0; i < colors.length; i++) {
		colors[i] = recolor(colors[i], opt);
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

		const key = color.asHex();

		const result = this.cache.get(key);
		if (result) return result;

		color = recolor(color, this.opt);
		this.cache.set(key, color);
		return color;
	}
}

export function recolor(color: Color, opt?: RecolorOptions): Color {
	if (!isValidRecolorOptions(opt)) return color;

	if (opt.invertBrightness ?? false) color = color.invertLuminosity();
	if ((opt.rotate !== undefined) && (opt.rotate !== 0)) color = color.rotateHue(opt.rotate);
	if ((opt.saturate !== undefined) && (opt.saturate !== 0)) color = color.saturate(opt.saturate);
	if ((opt.gamma !== undefined) && (opt.gamma !== 1)) color = color.gamma(opt.gamma);
	if ((opt.contrast !== undefined) && (opt.contrast !== 1)) color = color.contrast(opt.contrast);
	if ((opt.brightness !== undefined) && (opt.brightness !== 0)) color = color.brightness(opt.brightness);
	if ((opt.tint !== undefined) && (opt.tintColor !== undefined) && (opt.tint !== 0)) color = color.tint(opt.tint, Color.parse(opt.tintColor));

	return color;
}

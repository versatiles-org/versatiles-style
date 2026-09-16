import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Color } from './color.js';
import type { ResolvedRecolor, ResolvedColors } from '../options/index.js';

/**
 * Whether a string found under a `*-color` key is a colour rather than part of an expression.
 *
 * Deliberately a prefix test and not a parse: the values walked here include expression operators
 * (`interpolate`, `linear`) and property names, and trying to parse each one would turn every one of
 * them into an exception.
 */
function isColorString(s: string): boolean {
	return /^(#|rgba?\(|hsla?\(|hwb\(|hsv\(|oklab\(|oklch\(|transparent$)/i.test(s.trim());
}

function transformColor(color: Color, opt: ResolvedRecolor): Color {
	if (opt.invertBrightness) color = color.invertLuminosity();
	if (opt.rotateHue !== 0) color = color.rotateHue(opt.rotateHue);
	if (opt.saturate !== 0) color = color.saturate(opt.saturate);
	if (opt.gamma !== 1) color = color.gamma(opt.gamma);
	if (opt.contrast !== 1) color = color.contrast(opt.contrast);
	if (opt.brightness !== 0) color = color.brightness(opt.brightness);
	if (opt.tint.amount > 0) color = color.tint(opt.tint.amount, Color.parse(opt.tint.color));
	if (opt.blend.amount > 0) color = color.blend(opt.blend.amount, Color.parse(opt.blend.color));
	return color;
}

function walkValue(value: unknown, recolorFn: (s: string) => string): unknown {
	if (typeof value === 'string' && isColorString(value)) return recolorFn(value);
	if (Array.isArray(value)) return value.map((v) => walkValue(v, recolorFn));
	return value;
}

export function calculateDarkModeColors(colors: ResolvedColors): ResolvedColors {
	return Object.fromEntries(
		Object.entries(colors).map(([key, value]) => [key, Color.parse(value).invertLuminosity().asHex()])
	) as ResolvedColors;
}

export function applyRecolor(style: StyleSpecification, opt: ResolvedRecolor) {
	const cache = new Map<string, string>();

	const recolorString = (input: string): string => {
		let result = cache.get(input);
		if (result === undefined) {
			result = transformColor(Color.parse(input), opt).asString();
			cache.set(input, result);
		}
		return result;
	};

	for (const layer of style.layers) {
		const paint = (layer as Record<string, unknown>).paint as Record<string, unknown> | undefined;
		if (!paint) continue;
		for (const key of Object.keys(paint)) {
			if (key.endsWith('-color')) paint[key] = walkValue(paint[key], recolorString);
		}
	}

	// The sky sits outside `layers` and used to be missed: an inverted-brightness map darkened the
	// ground and kept a bright blue sky above it.
	//
	// `style.light` is deliberately left alone. Its colour is an illuminant, not a surface: inverting
	// the brightness of a white light gives a black one, which does not mean "dark lighting" but "no
	// light", and every extruded building loses its shading.
	const sky = style.sky as Record<string, unknown> | undefined;
	if (sky) {
		for (const key of Object.keys(sky)) {
			if (key.endsWith('-color')) sky[key] = walkValue(sky[key], recolorString);
		}
	}
}

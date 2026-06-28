import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { RecolorOptions } from '../types/colors.js';
import { Color } from './abstract.js';

function isColorString(s: string): boolean {
	const t = s.trim().toLowerCase();
	return t.startsWith('#') || t.startsWith('rgb') || t.startsWith('hsl');
}

function transformColor(color: Color, opt: RecolorOptions, tintColor?: Color, blendColor?: Color): Color {
	if (opt.invertBrightness) color = color.invertLuminosity();
	if (opt.rotateHue) color = color.rotateHue(opt.rotateHue);
	if (opt.saturate) color = color.saturate(opt.saturate);
	if (opt.gamma != null && opt.gamma !== 1) color = color.gamma(opt.gamma);
	if (opt.contrast != null && opt.contrast !== 1) color = color.contrast(opt.contrast);
	if (opt.brightness) color = color.brightness(opt.brightness);
	if (opt.tint) color = color.tint(opt.tint.amount ?? 1, tintColor ?? Color.parse(opt.tint.color));
	if (opt.blend) color = color.blend(opt.blend.amount ?? 1, blendColor ?? Color.parse(opt.blend.color));
	return color;
}

function walkValue(value: unknown, recolorFn: (s: string) => string): unknown {
	if (typeof value === 'string' && isColorString(value)) return recolorFn(value);
	if (Array.isArray(value)) return value.map((v) => walkValue(v, recolorFn));
	return value;
}

export function applyRecolor(style: StyleSpecification, opt: RecolorOptions): StyleSpecification {
	const tintColor = opt.tint ? Color.parse(opt.tint.color) : undefined;
	const blendColor = opt.blend ? Color.parse(opt.blend.color) : undefined;
	const cache = new Map<string, string>();

	const recolorString = (input: string): string => {
		let result = cache.get(input);
		if (result === undefined) {
			result = transformColor(Color.parse(input), opt, tintColor, blendColor).asString();
			cache.set(input, result);
		}
		return result;
	};

	const result = structuredClone(style);
	for (const layer of result.layers) {
		const paint = (layer as Record<string, unknown>).paint as Record<string, unknown> | undefined;
		if (!paint) continue;
		for (const key of Object.keys(paint)) {
			if (key.endsWith('-color')) paint[key] = walkValue(paint[key], recolorString);
		}
	}
	return result;
}

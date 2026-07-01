import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Color } from './abstract.js';
import type { ResolvedRecolorOptions } from '../options/index.js';

function isColorString(s: string): boolean {
	const t = s.trim().toLowerCase();
	return t.startsWith('#') || t.startsWith('rgb') || t.startsWith('hsl');
}

function transformColor(color: Color, opt: ResolvedRecolorOptions): Color {
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

export function applyRecolor(style: StyleSpecification, opt: ResolvedRecolorOptions) {
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
}

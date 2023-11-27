import Color from 'color';
import type { RecolorOptions, StylemakerColors } from './types.js';
import type StyleBuilder from './style_builder.ts';

export function getDefaultRecolorFlags(): RecolorOptions {
	return {
		invert: false,
		rotate: 0,
		saturate: 0,
		gamma: 1,
		contrast: 1,
		brightness: 0,
		tint: 0,
		tintColor: '#FF0000',
	};
}

export function recolor<Subclass extends StyleBuilder<Subclass>>(colors: StylemakerColors<Subclass>, opt?: RecolorOptions): void {
	if (!opt) return;

	if (opt.invert ?? false) invert();
	if ((opt.rotate !== undefined) && (opt.rotate !== 0)) rotate(opt.rotate);
	if ((opt.saturate !== undefined) && (opt.saturate !== 0)) saturate(opt.saturate);
	if ((opt.gamma !== undefined) && (opt.gamma !== 1)) gamma(opt.gamma);
	if ((opt.contrast !== undefined) && (opt.contrast !== 1)) contrast(opt.contrast);
	if ((opt.brightness !== undefined) && (opt.brightness !== 0)) brightness(opt.brightness);
	if ((opt.tint !== undefined) && (opt.tintColor !== undefined) && (opt.tint !== 0)) tint(opt.tint, Color(opt.tintColor));

	function forEachColor(callback: (color: Color) => Color): void {
		for (const k in colors) colors[k] = callback(colors[k]);
	}

	function invert(): void {
		forEachColor(c => c.negate());
	}

	function rotate(value: number): void {
		forEachColor(c => c.rotate(value));
	}

	function saturate(value: number): void {
		forEachColor(c => c.saturate(value));
	}

	function gamma(value: number): void {
		if (value < 1e-3) value = 1e-3;
		if (value > 1e3) value = 1e3;
		forEachColor(color => {
			const rgb: number[] = color.rgb().array();
			return Color.rgb(
				Math.pow(rgb[0] / 255, value) * 255,
				Math.pow(rgb[1] / 255, value) * 255,
				Math.pow(rgb[2] / 255, value) * 255,
				color.alpha(),
			);
		});
	}

	function contrast(value: number): void {
		if (value < 0) value = 0;
		if (value > 1e6) value = 1e6;
		forEachColor(color => {
			const rgb: number[] = color.rgb().array();
			return Color.rgb(
				(rgb[0] - 127.5) * value + 127.5,
				(rgb[1] - 127.5) * value + 127.5,
				(rgb[2] - 127.5) * value + 127.5,
				color.alpha(),
			);
		});
	}

	function brightness(value: number): void {
		if (value < -1e6) value = -1e6;
		if (value > 1e6) value = 1e6;
		const a = 1 - Math.abs(value);
		const b = (value < 0) ? 0 : 255 * value;
		forEachColor(color => {
			const rgb: number[] = color.rgb().array();
			return Color.rgb(
				rgb[0] * a + b,
				rgb[1] * a + b,
				rgb[2] * a + b,
				color.alpha(),
			);
		});
	}

	function tint(value: number, tintColor: Color): void {
		if (value < 0) value = 0;
		if (value > 1) value = 1;
		const tintColorHSV: number[] = tintColor.hsv().array();
		forEachColor(color => {
			const rgb0: number[] = color.rgb().array();

			const hsv: number[] = color.hsv().array();
			// eslint-disable-next-line @typescript-eslint/prefer-destructuring
			hsv[0] = tintColorHSV[0];
			hsv[1] *= tintColorHSV[1];
			hsv[2] *= tintColorHSV[2];
			const rgbNew = Color.hsv(hsv).rgb().array();

			return Color.rgb(
				rgb0[0] * (1 - value) + value * rgbNew[0],
				rgb0[1] * (1 - value) + value * rgbNew[1],
				rgb0[2] * (1 - value) + value * rgbNew[2],
				color.alpha(),
			);
		});
	}
}

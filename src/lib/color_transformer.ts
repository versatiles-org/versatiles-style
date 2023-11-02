import WrappedColor from 'color';
import { ColorTransformerFlags, StylemakerColorLookup } from './types.js';

export function getDefaultColorTransformer(): ColorTransformerFlags {
	return {
		invert: false,
		rotate: 0,
		saturate: 0,
		gamma: 1,
		contrast: 1,
		brightness: 0,
		tint: 0,
		tintColor: WrappedColor('#F00'),
	}
}

export function transformColors(colors: StylemakerColorLookup, flags: ColorTransformerFlags): void {
	if (!flags) return;

	if (flags.invert) invert();
	if ((flags.rotate !== undefined) && (flags.rotate !== 0)) rotate(flags.rotate);
	if ((flags.saturate !== undefined) && (flags.saturate !== 0)) saturate(flags.saturate);
	if ((flags.gamma !== undefined) && (flags.gamma !== 1)) gamma(flags.gamma);
	if ((flags.contrast !== undefined) && (flags.contrast !== 1)) contrast(flags.contrast);
	if ((flags.brightness !== undefined) && (flags.brightness !== 0)) brightness(flags.brightness);
	if ((flags.tint !== undefined) && (flags.tintColor !== undefined) && (flags.tint !== 0)) tint(flags.tint, flags.tintColor);

	function forEachColor(callback: (color: WrappedColor) => WrappedColor): void {
		Object.entries(colors).forEach(([k, c]) => colors[k] = callback(c));
	}

	function invert(): void {
		forEachColor(c => c.negate());
	}

	function rotate(value: number): void {
		forEachColor(c => c.rotate(value))
	}

	function saturate(value: number): void {
		forEachColor(c => c.saturate(value));
	}

	function gamma(value: number): void {
		if (value < 1e-3) value = 1e-3;
		if (value > 1e3) value = 1e3;
		forEachColor(color => {
			const rgb: number[] = color.rgb().array();
			return WrappedColor.rgb(
				Math.pow(rgb[0] / 255, value) * 255,
				Math.pow(rgb[1] / 255, value) * 255,
				Math.pow(rgb[2] / 255, value) * 255,
				color.alpha()
			);
		});
	}

	function contrast(value: number): void {
		if (value < 0) value = 0;
		if (value > 1e6) value = 1e6;
		forEachColor(color => {
			const rgb: number[] = color.rgb().array();
			return WrappedColor.rgb(
				(rgb[0] - 127.5) * value + 127.5,
				(rgb[1] - 127.5) * value + 127.5,
				(rgb[2] - 127.5) * value + 127.5,
				color.alpha()
			);
		})
	}

	function brightness(value: number): void {
		if (value < -1e6) value = -1e6;
		if (value > 1e6) value = 1e6;
		const a = 1 - Math.abs(value);
		const b = (value < 0) ? 0 : 255 * value;
		forEachColor(color => {
			const rgb: number[] = color.rgb().array();
			return WrappedColor.rgb(
				rgb[0] * a + b,
				rgb[1] * a + b,
				rgb[2] * a + b,
				color.alpha()
			);
		})
	}

	function tint(value: number, tintColor: WrappedColor): void {
		const tintColorHSV: number[] = tintColor.hsv().array();
		forEachColor(color => {
			const rgb0: number[] = color.rgb().array();

			const hsv: number[] = color.hsv().array();
			hsv[0] = tintColorHSV[0];
			hsv[1] *= tintColorHSV[1];
			hsv[2] *= tintColorHSV[2];
			const rgbNew = WrappedColor.hsv(hsv).rgb().array();

			return WrappedColor.rgb(
				rgb0[0] * (1 - value) + value * rgbNew[0],
				rgb0[1] * (1 - value) + value * rgbNew[1],
				rgb0[2] * (1 - value) + value * rgbNew[2],
				color.alpha(),
			)
		})
	}
}

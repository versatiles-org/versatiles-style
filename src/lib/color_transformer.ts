import ColorWrapper from 'color';

export type ColorLookup = { [name: string]: ColorWrapper };


export function getDefaultColorTransformer(): TransformColorsFlags {
	return {
		invert: false,
		rotate: 0,
		saturate: 0,
		gamma: 1,
		contrast: 1,
		brightness: 0,
		tint: 0,
		tintColor: ColorWrapper('#F00'),
	}
}

export type TransformColorsFlags = {
	invert: boolean,
	rotate: number,
	saturate: number,
	gamma: number,
	contrast: number,
	brightness: number,
	tint: number,
	tintColor: ColorWrapper,
}

export function transformColors(colors: ColorLookup, flags: TransformColorsFlags) {
	if (!flags) return;

	if (flags.invert) invert();
	if (flags.rotate !== 0) rotate(flags.rotate);
	if (flags.saturate !== 0) saturate(flags.saturate);
	if (flags.gamma !== 1) gamma(flags.gamma);
	if (flags.contrast !== 1) contrast(flags.contrast);
	if (flags.brightness !== 0) brightness(flags.brightness);
	if (flags.tint !== 0) tint(flags.tint, flags.tintColor);

	function forEachColor(callback: (color: ColorWrapper) => ColorWrapper): void {
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
			let rgb: number[] = color.rgb().array();
			return ColorWrapper.rgb(
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
			let rgb: number[] = color.rgb().array();
			return ColorWrapper.rgb(
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
		let a = 1 - Math.abs(value);
		let b = (value < 0) ? 0 : 255 * value;
		forEachColor(color => {
			let rgb: number[] = color.rgb().array();
			return ColorWrapper.rgb(
				rgb[0] * a + b,
				rgb[1] * a + b,
				rgb[2] * a + b,
				color.alpha()
			);
		})
	}

	function tint(value: number, tintColor: ColorWrapper): void {
		let tintColorHSV: number[] = tintColor.hsv().array();
		forEachColor(color => {
			let rgb0: number[] = color.rgb().array();

			let hsv: number[] = color.hsv().array();
			hsv[0] = tintColorHSV[0];
			hsv[1] *= tintColorHSV[1];
			hsv[2] *= tintColorHSV[2];
			let rgbNew = ColorWrapper.hsv(hsv).rgb().array();

			return ColorWrapper.rgb(
				rgb0[0] * (1 - value) + value * rgbNew[0],
				rgb0[1] * (1 - value) + value * rgbNew[1],
				rgb0[2] * (1 - value) + value * rgbNew[2],
				color.alpha(),
			)
		})
	}
}

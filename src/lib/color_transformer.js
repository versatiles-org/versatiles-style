import Color from 'color';

export function getDefaultColorTransformer() {
	return {
		invert: false,
		rotate: 0,
		saturate: 0,
		gamma: 1,
		contrast: 1,
		brightness: 0,
		tint: 0,
		tintColor: '#F00',
	}
}

export function transformColors(colors, flags) {
	if (!flags) return;

	let colorArray;

	if (flags.invert) invert();
	if (flags.rotate !== 0) rotate(flags.rotate);
	if (flags.saturate !== 0) saturate(flags.saturate);
	if (flags.gamma !== 1) gamma(flags.gamma);
	if (flags.contrast !== 1) contrast(flags.contrast);
	if (flags.brightness !== 0) brightness(flags.brightness);
	if (flags.tint !== 0) tint(flags.tint, flags.tintColor);

	if (colorArray) colorArray.forEach(c => colors[c.key] = c.color.hexa());

	function invert() {
		if (!colorArray) makeColorArray();
		colorArray.forEach(c => c.color = c.color.negate())
	}

	function rotate(value) {
		if (!colorArray) makeColorArray();
		colorArray.forEach(c => c.color = c.color.rotate(value))
	}

	function saturate(value) {
		if (!colorArray) makeColorArray();
		colorArray.forEach(c => c.color = c.color.saturate(value));
	}

	function gamma(value) {
		if (!colorArray) makeColorArray();
		if (value < 1e-3) value = 1e-3;
		if (value > 1e3) value = 1e3;
		colorArray.forEach(c => {
			c.color = c.color.rgb();
			for (let i = 0; i < 3; i++) {
				c.color.color[i] = Math.pow(c.color.color[i] / 255, value) * 255;
			}
		});
	}

	function contrast(value) {
		if (!colorArray) makeColorArray();
		if (value < 0) value = 0;
		if (value > 1e6) value = 1e6;
		colorArray.forEach(c => {
			c.color = c.color.rgb();
			for (let i = 0; i < 3; i++) {
				c.color.color[i] = clamp((c.color.color[i] - 127.5) * value) + 127.5;
			}
		});
	}

	function brightness(value) {
		if (!colorArray) makeColorArray();
		if (value < -1e6) value = -1e6;
		if (value > 1e6) value = 1e6;
		let a = 1 - Math.abs(value);
		let b = (value < 0) ? 0 : 255 * value;
		colorArray.forEach(c => {
			c.color = c.color.rgb();
			for (let i = 0; i < 3; i++) {
				c.color.color[i] = c.color.color[i] * a + b;
			}
		});
	}

	function tint(value, tintColor) {
		if (!colorArray) makeColorArray();
		tintColor = Color(tintColor).hsv();
		colorArray.forEach(c => {
			// generate tinted color
			let temp = c.color.hsv();
			temp.color[0] = tintColor.color[0];
			temp.color[1] *= tintColor.color[1];
			temp.color[2] *= tintColor.color[2];

			// blend tinted color with original color
			temp = temp.rgb();
			c.color = c.color.rgb()
			for (let i = 0; i < 3; i++) {
				c.color.color[i] = c.color.color[i] * (1 - value) + value * temp.color[i];
			}
		});
	}

	function makeColorArray() {
		colorArray = Object.entries(colors).map(([key, color]) => ({ key, color: Color(color) }));
	}
}

function clamp(value) {
	if (value < 0) return 0;
	if (value > 255) return 255;
	return value;
}
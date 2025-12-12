import { Color } from './abstract.js';
import { HSL } from './hsl.js';
import { HSV } from './hsv.js';
import { RGB } from './rgb.js';

Color.parse = function (input: string | Color): Color {
	if (input instanceof Color) return input;

	input = input.trim().toLowerCase();

	if (input.startsWith('#')) return RGB.parse(input);

	const prefix = input.replace(/\d.*/, '').trim().toLowerCase();

	switch (prefix) {
		case 'rgb(':
		case 'rgba(':
			return RGB.parse(input);
		case 'hsl(':
		case 'hsla(':
			return HSL.parse(input);
		default:
			throw new Error(
				`Color.parse: Unknown color format "${input}". Expected formats: "#RRGGBB", "#RGB", "rgb(...)", "rgba(...)", "hsl(...)", or "hsla(...)".`
			);
	}
};

Color.HSL = HSL;
Color.HSV = HSV;
Color.RGB = RGB;

export type { RandomColorOptions } from './random.js';
export type { HSL } from './hsl.js';
export type { HSV } from './hsv.js';
export type { RGB } from './rgb.js';
export { Color };

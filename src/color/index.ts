import { Color } from './abstract';
import { HSL } from './hsl';
import { HSV } from './hsv';
import randomColor from './random';
import { RGB } from './rgb';

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
			throw Error('Unknown color format: ' + input);
	}
}

Color.HSL = HSL;
Color.HSV = HSV;
Color.RGB = RGB;

Color.random = randomColor;

export type { RandomColorOptions } from './random';
export type { HSL } from './hsl';
export type { HSV } from './hsv';
export type { RGB } from './rgb';
export { Color };

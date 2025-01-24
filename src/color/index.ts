import { Color } from './abstract';
import { HSL } from './hsl';
import { HSV } from './hsv';
import randomColor from './random';
import { RGB } from './rgb';

Color.parse = function (str: string): Color {
	str = str.trim().toLowerCase();

	if (str.startsWith('#')) return RGB.parse(str);

	const prefix = str.replace(/\d.*/, '').trim().toLowerCase();

	switch (prefix) {
		case 'rgb(':
		case 'rgba(':
			return RGB.parse(str);
		case 'hsl(':
		case 'hsla(':
			return HSL.parse(str);
		default:
			throw Error('Unknown color format: ' + str);
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

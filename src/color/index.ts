import { Color } from './abstract.js';
import { HSL } from './hsl.js';
import { HSV } from './hsv.js';
import randomColor from './random.js';
import { RGB } from './rgb.js';


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

export { Color };
export default Color;

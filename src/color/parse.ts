import { Color } from './abstract.js';
import { HSL } from './hsl.js';
import { HSV } from './hsv.js';
import { RGB } from './rgb.js';

/**
 * Wires the concrete colour classes onto the abstract one.
 *
 * `Color.parse` cannot live on `Color` itself: parsing needs `RGB`/`HSL`, and those extend `Color`,
 * so the class cannot import them without a cycle. The statics are therefore assigned here, at
 * module load.
 *
 * This lives in its own module rather than in `index.ts` so that anything needing `Color.parse` can
 * depend on it **explicitly**. When the assignment sat in the barrel, a module that imported only
 * `./abstract.js` — `recolor.ts` did — worked or threw `Color.parse is not a function` depending on
 * whether something else had already loaded the barrel.
 */
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

export { Color };

import type { HSL } from './hsl.js';
import type { HSV } from './hsv.js';
import { RandomColorOptions } from './random.js';
import type { RGB } from './rgb.js';

export abstract class Color {
	static parse: (str: string) => Color;
	static HSL: typeof HSL;
	static HSV: typeof HSV;
	static RGB: typeof RGB;
	static random: (options?: RandomColorOptions) => HSV;
	abstract clone(): Color;

	asHex(): string {
		return this.toRGB().asHex();
	}

	abstract asString(): string;
	abstract round(): Color;
	abstract asArray(): number[];

	abstract asHSL(): HSL;
	abstract asHSV(): HSV;
	abstract asRGB(): RGB;

	toHSL(): HSL {
		return this.asHSL();
	}

	toHSV(): HSV {
		return this.asHSV();
	}

	toRGB(): RGB {
		return this.asRGB();
	}

	invertLuminosity(): HSL {
		return this.toHSL().invertLuminosity();
	}

	rotateHue(offset: number): HSL {
		return this.toHSL().rotateHue(offset);
	}

	saturate(ratio: number): HSL {
		return this.toHSL().saturate(ratio);
	}

	gamma(value: number): RGB {
		return this.toRGB().gamma(value);
	}

	invert(): RGB {
		return this.toRGB().invert();
	}

	contrast(value: number): RGB {
		return this.toRGB().contrast(value);
	}

	brightness(value: number): RGB {
		return this.toRGB().brightness(value);
	}

	lighten(value: number): RGB {
		return this.toRGB().lighten(value);
	}

	darken(value: number): RGB {
		return this.toRGB().darken(value);
	}

	tint(value: number, tintColor: Color): RGB {
		return this.toRGB().tint(value, tintColor);
	}

	abstract fade(value: number): Color;
}

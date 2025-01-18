import { Color } from './abstract.js';
import { HSL } from './hsl.js';
import { RGB } from './rgb.js';
import { clamp, mod } from './utils.js';

export class HSV extends Color {
	h: number = 0; // between 0 and 360
	s: number = 0; // between 0 and 100
	v: number = 0; // between 0 and 100
	a: number = 1; // between 0 and 1

	constructor(h: number, s: number, v: number, a: number = 1) {
		super();
		this.h = mod(h, 360);
		this.s = clamp(s, 0, 100);
		this.v = clamp(v, 0, 100);
		this.a = clamp(a, 0, 1);
	}

	asArray(): [number, number, number, number] {
		return [this.h, this.s, this.v, this.a];
	}

	round(): HSV {
		this.h = Math.round(this.h);
		this.s = Math.round(this.s);
		this.v = Math.round(this.v);
		this.a = Math.round(this.a * 1000) / 1000;
		return this;
	}

	asString(): string {
		return this.asHSL().asString();
	}

	clone(): HSV {
		return new HSV(this.h, this.s, this.v, this.a);
	}

	asHSL(): HSL {
		const s = this.s / 100;
		const v = this.v / 100;
		const k = (2 - s) * v;
		const q = k < 1 ? k : 2 - k
		return new HSL(
			this.h,
			q == 0 ? 0 : 100 * s * v / q,
			100 * k / 2,
			this.a
		);
	}

	asHSV(): HSV {
		return this.clone();
	}

	toHSV(): HSV {
		return this;
	}

	asRGB(): RGB {
		const h = this.h / 360; // Normalize h to range [0, 1]
		const s = this.s / 100; // Normalize s to range [0, 1]
		const v = this.v / 100; // Normalize v to range [0, 1]

		let r = 0, g = 0, b = 0;

		if (s === 0) {
			// Achromatic (grey)
			r = g = b = v;
		} else {
			const i = Math.floor(h * 6); // Determine the sector of the color wheel
			const f = h * 6 - i;         // Fractional part of h * 6
			const p = v * (1 - s);
			const q = v * (1 - s * f);
			const t = v * (1 - s * (1 - f));

			switch (i % 6) {
				case 0: r = v; g = t; b = p; break;
				case 1: r = q; g = v; b = p; break;
				case 2: r = p; g = v; b = t; break;
				case 3: r = p; g = q; b = v; break;
				case 4: r = t; g = p; b = v; break;
				case 5: r = v; g = p; b = q; break;
			}
		}

		// Convert to RGB in the 0-255 range and return
		return new RGB(r * 255, g * 255, b * 255, this.a);
	}

	fade(value: number): HSV {
		this.a *= 1 - value;
		return this;
	}
}
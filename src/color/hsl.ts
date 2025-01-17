import { Color } from './abstract.ts';
import { HSV } from './hsv.ts';
import { RGB } from './rgb.ts';
import { clamp, formatFloat, mod } from './utils.ts';

export class HSL extends Color {
	h: number = 0; // between 0 and 360
	s: number = 0; // between 0 and 100
	l: number = 0; // between 0 and 100
	a: number = 1; // between 0 and 1

	constructor(h: number, s: number, l: number, a: number = 1) {
		super();
		this.h = mod(h, 360);
		this.s = clamp(s, 0, 100);
		this.l = clamp(l, 0, 100);
		this.a = clamp(a, 0, 1);
	}

	asArray(): number[] {
		return [this.h, this.s, this.l, this.a];
	}

	clone(): HSL {
		return new HSL(this.h, this.s, this.l, this.a);
	}

	asString(): string {
		if (this.a === 1) {
			return `hsl(${this.h.toFixed(0)},${this.s.toFixed(0)}%,${this.l.toFixed(0)}%)`;
		} else {
			return `hsla(${this.h.toFixed(0)},${this.s.toFixed(0)}%,${this.l.toFixed(0)}%,${formatFloat(this.a, 3)})`;
		}
	}

	asHSL(): HSL {
		return this.clone();
	}

	toHSL(): HSL {
		return this;
	}

	asHSV(): HSV {
		const s = this.s / 100, l = this.l / 100;
		const v = l + s * Math.min(l, 1 - l);
		const sv = v === 0 ? 0 : 2 * (1 - l / v);
		return new HSV(this.h, sv * 100, v * 100, this.a);
	}

	asRGB(): RGB {
		const h = this.h / 360;
		const s = this.s / 100;
		const l = this.l / 100;

		// Achromatic (grey)
		if (s === 0) return new RGB(l * 255, l * 255, l * 255, this.a);

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;

		const hueToRgb = (t: number): number => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		// Convert to RGB in the 0-255 range and return
		return new RGB(
			255 * hueToRgb(h + 1 / 3),
			255 * hueToRgb(h),
			255 * hueToRgb(h - 1 / 3),
			this.a
		);
	}

	static parse(str: string): HSL {
		str = str.replace(/\s+/g, '').toLowerCase();

		let match = str.match(/^hsl\((?<h>[-+0-9.]+)(?:deg)?,(?<s>[-+0-9.]+)%,(?<l>[-+0-9.]+)%\)$/);
		if (match) {
			return new HSL(parseFloat(match.groups!.h), parseFloat(match.groups!.s), parseFloat(match.groups!.l));
		}

		match = str.match(/^hsla\((?<h>[-+0-9.]+)(?:deg)?,(?<s>[-+0-9.]+)%,(?<l>[-+0-9.]+)%,(?<a>[-+0-9.]+)\)$/);
		if (match) {
			return new HSL(parseFloat(match.groups!.h), parseFloat(match.groups!.s), parseFloat(match.groups!.l), parseFloat(match.groups!.a));
		}

		throw new Error(`Invalid HSL color string: "${str}"`);
	}

	invertLuminosity(): HSL {
		this.l = 100 - this.l;
		return this;
	}

	rotateHue(offset: number): HSL {
		this.h = mod(this.h + offset, 360);
		return this;
	}

	saturate(ratio: number): HSL {
		if (ratio < 0) {
			this.s = clamp(this.s * (1 + ratio), 0, 100);
		} else {
			this.s = clamp(100 - (100 - this.s) * (1 - ratio), 0, 100);
		}
		return this;
	}

	fade(value: number): HSL {
		this.a *= 1 - value;
		return this;
	}
}
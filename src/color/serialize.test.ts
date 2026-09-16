import { describe, expect, it } from 'vitest';
import { convert } from './convert.js';
import { STYLE_COLOR_PATTERN, formatCSS, formatHex, formatStyleColor } from './serialize.js';
import { deltaEOK, inGamut, toGamut } from './ops.js';
import { parseColor } from './parser.js';
import type { Coords, Space } from './space.js';

function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

describe('formatHex()', () => {
	it('writes uppercase six-digit hex, as v5 did', () => {
		expect(formatHex('srgb', [11, 20, 31])).toBe('#0B141F');
		expect(formatHex('srgb', [255, 0, 0])).toBe('#FF0000');
	});

	it('appends alpha only when the colour is not opaque', () => {
		expect(formatHex('srgb', [255, 0, 0], 1)).toBe('#FF0000');
		expect(formatHex('srgb', [255, 0, 0], 0.5)).toBe('#FF000080');
		expect(formatHex('srgb', [255, 0, 0], 0)).toBe('#FF000000');
	});

	it('converts from any space', () => {
		expect(formatHex('hsl', [0, 100, 50])).toBe('#FF0000');
		expect(formatHex('hwb', [120, 0, 0])).toBe('#00FF00');
		expect(formatHex('oklch', convert([0, 0, 255], 'srgb', 'oklch'))).toBe('#0000FF');
	});
});

describe('formatStyleColor()', () => {
	it('writes exactly what v5 wrote — integers, no spaces', () => {
		expect(formatStyleColor('srgb', [11, 20, 31])).toBe('rgb(11,20,31)');
		expect(formatStyleColor('srgb', [11, 20, 31], 0.123)).toBe('rgba(11,20,31,0.123)');
	});

	it('rounds channels to integers', () => {
		expect(formatStyleColor('srgb', [10.6, 20.4, 30.5])).toBe('rgb(11,20,31)');
	});

	it('never emits a space MapLibre cannot read', () => {
		const spaces: [Space, Coords][] = [
			['hsl', [120, 50, 50]],
			['hwb', [200, 20, 30]],
			['hsv', [300, 80, 90]],
			['oklab', [0.6, 0.1, -0.05]],
			['oklch', [0.7, 0.15, 45]],
		];
		for (const [space, coords] of spaces) {
			expect(formatStyleColor(space, coords), space).toMatch(/^rgba?\(/);
			expect(formatStyleColor(space, coords), space).toMatch(STYLE_COLOR_PATTERN);
		}
	});

	it('keeps the alpha spelling consistent with the alpha it prints', () => {
		// v5 tested the raw value, so 0.9999 chose rgba() and then printed its alpha as 1
		expect(formatStyleColor('srgb', [1, 2, 3], 0.9999)).toBe('rgb(1,2,3)');
		expect(formatStyleColor('srgb', [1, 2, 3], 0.9994)).toBe('rgba(1,2,3,0.999)');
		// the other end keeps its rgba() spelling: a colour that rounds to alpha 0 is invisible, and
		// saying so is right — it is only the contradiction between spelling and value that was a bug
		expect(formatStyleColor('srgb', [1, 2, 3], 0.0001)).toBe('rgba(1,2,3,0)');
	});

	it('gamut-maps rather than clipping, so an unshowable colour keeps its hue', () => {
		// oklch(0.7 0.4 145) is a green far outside sRGB; clipping each channel would pull it to yellow
		const mapped = formatStyleColor('oklch', [0.7, 0.4, 145]);
		const [, , hue] = convert(parseColor(mapped).coords, 'srgb', 'oklch');
		expect(Math.abs(hue - 145)).toBeLessThan(5);
	});
});

describe('formatCSS()', () => {
	it('writes each space in its own CSS syntax', () => {
		expect(formatCSS('srgb', [255, 0, 0])).toBe('rgb(255 0 0)');
		expect(formatCSS('hsl', [120, 50, 50])).toBe('hsl(120 50% 50%)');
		expect(formatCSS('hwb', [120, 30, 40])).toBe('hwb(120 30% 40%)');
		expect(formatCSS('hsv', [120, 50, 75])).toBe('hsv(120 50% 75%)');
		expect(formatCSS('oklab', [0.5, 0.1, -0.1])).toBe('oklab(0.5 0.1 -0.1)');
		expect(formatCSS('oklch', [0.7, 0.15, 45])).toBe('oklch(0.7 0.15 45)');
	});

	it('writes alpha after a slash, and omits it when opaque', () => {
		expect(formatCSS('oklch', [0.7, 0.15, 45], 0.5)).toBe('oklch(0.7 0.15 45 / 0.5)');
		expect(formatCSS('srgb', [255, 0, 0], 1)).toBe('rgb(255 0 0)');
	});

	it('drops trailing zeros', () => {
		expect(formatCSS('oklch', [0.7, 0.15, 45.0])).toBe('oklch(0.7 0.15 45)');
		expect(formatCSS('srgb', [255.0, 0, 0])).toBe('rgb(255 0 0)');
	});

	it('keeps OKLab precise enough to re-read', () => {
		// CSS Color 4 §16.4 asks for at least five decimals, because the lightness runs 0–1
		expect(formatCSS('oklab', [0.123456789, 0.000012, -0.1])).toBe('oklab(0.12346 0.00001 -0.1)');
	});
});

describe('round trip', () => {
	it.each(['srgb', 'hsl', 'hwb', 'hsv', 'oklab', 'oklch'] as Space[])('%s survives formatCSS → parseColor', (space) => {
		const random = seeded(99);
		let worst = 0;
		for (let i = 0; i < 2000; i++) {
			const rgb: Coords = [random() * 255, random() * 255, random() * 255];
			const coords = convert(rgb, 'srgb', space);
			const alpha = Math.round(random() * 1000) / 1000;
			const parsed = parseColor(formatCSS(space, coords, alpha));
			expect(parsed.space).toBe(space);
			expect(parsed.alpha).toBeCloseTo(alpha, 6);
			worst = Math.max(worst, deltaEOK(parsed.coords, coords, space, space));
		}
		// a JND is 0.02; this is three orders of magnitude below that
		expect(worst).toBeLessThan(2e-5);
	});

	it('hex survives formatHex → parseColor exactly', () => {
		const random = seeded(5);
		for (let i = 0; i < 2000; i++) {
			const rgb: Coords = [Math.floor(random() * 256), Math.floor(random() * 256), Math.floor(random() * 256)];
			expect(parseColor(formatHex('srgb', rgb)).coords).toStrictEqual(rgb);
		}
	});
});

describe('inGamut() and toGamut()', () => {
	it('recognises what a screen can show', () => {
		expect(inGamut([0, 0, 0])).toBe(true);
		expect(inGamut([255, 255, 255])).toBe(true);
		expect(inGamut([-0.5, 0, 0])).toBe(false);
		expect(inGamut([0, 300, 0])).toBe(false);
	});

	it('leaves an in-gamut colour untouched', () => {
		const random = seeded(3);
		for (let i = 0; i < 1000; i++) {
			const rgb: Coords = [random() * 255, random() * 255, random() * 255];
			// 1e-3, not more: the trip through OKLCh carries OKLab's ~4e-4 matrix drift (see convert.test.ts)
			expect(toGamut(convert(rgb, 'srgb', 'oklch'), 'oklch')[0]).toBeCloseTo(rgb[0], 3);
		}
	});

	it('brings an out-of-gamut colour in, holding its lightness and hue', () => {
		const random = seeded(11);
		let mapped = 0;
		for (let i = 0; i < 4000; i++) {
			// lightness 0–1, chroma up to 0.4 — well past what sRGB holds at most hues
			const coords: Coords = [random(), random() * 0.4, random() * 360];
			if (inGamut(convert(coords, 'oklch', 'srgb'))) continue;
			mapped++;
			const result = toGamut(coords, 'oklch');
			expect(inGamut(result), `${coords.join()} → ${result.join()}`).toBe(true);

			const [lightness, chroma] = convert(result, 'srgb', 'oklch');
			expect(Math.abs(lightness - coords[0]), 'lightness held').toBeLessThan(0.02);
			// The guarantee the algorithm actually makes (CSS Color 4 §14.2.2): the result sits within one
			// JND of the requested hue leaf — the same lightness and hue, at whatever chroma survived.
			// Distance from the *original* colour is necessarily large, because the original is unshowable.
			expect(deltaEOK(result, [coords[0], chroma, coords[2]], 'srgb', 'oklch')).toBeLessThan(0.02);
		}
		expect(mapped).toBeGreaterThan(1000); // the sample really did exercise the mapping
	});

	it('takes the short way out at the ends of the lightness range', () => {
		expect(toGamut([1.2, 0.3, 45], 'oklch')).toStrictEqual([255, 255, 255]);
		expect(toGamut([0, 0.3, 45], 'oklch')).toStrictEqual([0, 0, 0]);
	});

	it('holds hue while dropping chroma', () => {
		const target: Coords = [0.7, 0.4, 145];
		const [, chroma, hue] = convert(toGamut(target, 'oklch'), 'srgb', 'oklch');
		expect(chroma).toBeLessThan(0.4);
		expect(Math.abs(hue - 145)).toBeLessThan(5);
	});
});

describe('deltaEOK()', () => {
	it('is zero for a colour against itself', () => {
		expect(deltaEOK([0.5, 0.1, 0.1], [0.5, 0.1, 0.1])).toBe(0);
	});

	it('converts both sides into OKLab first', () => {
		expect(deltaEOK([255, 0, 0], [255, 0, 0], 'srgb', 'srgb')).toBe(0);
		expect(deltaEOK([255, 0, 0], convert([255, 0, 0], 'srgb', 'oklch'), 'srgb', 'oklch')).toBeLessThan(1e-12);
	});

	it('puts black and white a full lightness apart', () => {
		expect(deltaEOK([0, 0, 0], [255, 255, 255], 'srgb', 'srgb')).toBeCloseTo(1, 3);
	});
});

import { describe, expect, it } from 'vitest';
import { Color } from './index.js';
import { HSL } from './hsl.js';
import { HSV } from './hsv.js';
import { RGB } from './rgb.js';
import { clamp } from './utils.js';
import { calculateDarkModeColors } from './recolor.js';

// Edge cases not covered by the per-model color tests: the abstract-class delegates
// (opaque/over/colorize) invoked on HSL/HSV instances, Color.parse's identity path,
// clamp's null/NaN guard, and calculateDarkModeColors.

describe('Color.parse identity path', () => {
	it('returns the same instance when given a Color', () => {
		const c = new RGB(1, 2, 3, 1);
		expect(Color.parse(c)).toBe(c);
	});
});

describe('clamp null/NaN guard', () => {
	it('returns min for null, undefined or NaN', () => {
		expect(clamp(null as unknown as number, 5, 10)).toBe(5);
		expect(clamp(undefined as unknown as number, 5, 10)).toBe(5);
		expect(clamp(NaN, 5, 10)).toBe(5);
	});
});

describe('abstract delegates on HSL / HSV instances', () => {
	const hsl = new HSL(120, 50, 50, 0.5);
	const hsv = new HSV(200, 50, 60, 0.4);

	it('opaque() forces alpha to 1 and returns an RGB', () => {
		expect(hsl.opaque()).toBeInstanceOf(RGB);
		expect(hsl.opaque().alpha).toBe(1);
		expect(hsv.opaque().alpha).toBe(1);
	});

	it('over() an opaque top yields the top color', () => {
		expect(hsl.over(new RGB(255, 0, 0, 1)).asString()).toBe('rgb(255,0,0)');
		expect(hsv.over(new RGB(0, 0, 255, 1)).asString()).toBe('rgb(0,0,255)');
	});

	it('over() a fully transparent top leaves the base visible', () => {
		const base = hsv.asRGB().asArray();
		const out = hsv.over(new RGB(0, 0, 0, 0)).asArray();
		for (let i = 0; i < 4; i++) expect(out[i]).toBeCloseTo(base[i]);
	});

	it('colorize() recolors while preserving the base alpha', () => {
		expect(hsl.colorize(new RGB(0, 0, 255, 1)).alpha).toBe(hsl.alpha);
		expect(hsv.colorize(new RGB(0, 0, 255, 1)).alpha).toBe(hsv.alpha);
	});

	it('asHex() delegates through asRGB()', () => {
		expect(hsl.asHex()).toBe(hsl.asRGB().asHex());
		expect(hsv.asHex()).toBe(hsv.asRGB().asHex());
	});
});

describe('calculateDarkModeColors', () => {
	it('inverts the luminosity of every palette color, returning hex', () => {
		expect(calculateDarkModeColors({ background: '#ffffff', water: '#89c6fc' } as never)).toStrictEqual({
			background: '#000000',
			water: '#034076',
		});
	});
});

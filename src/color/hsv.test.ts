import { describe, expect, it } from 'vitest';
import { HSV } from './hsv.js';
import { HSL } from './hsl.js';
import { RGB } from './rgb.js';

describe('HSV Class', () => {

	it('constructor initializes values correctly with clamping', () => {
		const color = new HSV(400, 120, 120, 2);
		expect(color.asArray()).toStrictEqual([40, 100, 100, 1]);

		const colorNegative = new HSV(-60, -10, -10, -1);
		expect(colorNegative.asArray()).toStrictEqual([300, 0, 0, 0]);
	});

	it('asArray returns correct array representation', () => {
		const color = new HSV(120, 50, 50, 0.5);
		expect(color.asArray()).toStrictEqual([120, 50, 50, 0.5]);
	});

	it('clone returns a new instance with identical values', () => {
		const color = new HSV(180, 70, 70, 0.7);
		const clone = color.clone();
		expect(clone).toBeInstanceOf(HSV);
		expect(clone).toEqual(color);
		expect(clone).not.toBe(color);
	});

	describe('asString', () => {
		it('converts fully saturated colors correctly', () => {
			expect(new HSV(0, 100, 100).asString()).toBe('hsl(0,100%,50%)');
			expect(new HSV(120, 100, 100).asString()).toBe('hsl(120,100%,50%)');
			expect(new HSV(240, 100, 100).asString()).toBe('hsl(240,100%,50%)');
		});

		it('handles partially saturated colors', () => {
			expect(new HSV(60, 50, 100).asString()).toBe('hsl(60,100%,75%)');
			expect(new HSV(300, 25, 50).asString()).toBe('hsl(300,14%,44%)');
		});

		it('handles achromatic (grey) colors', () => {
			expect(new HSV(0, 0, 0).asString()).toBe('hsl(0,0%,0%)');
			expect(new HSV(0, 0, 50).asString()).toBe('hsl(0,0%,50%)');
			expect(new HSV(0, 0, 100).asString()).toBe('hsl(0,0%,100%)');
		});

		it('handles hue wrapping and extreme values', () => {
			expect(new HSV(-60, 100, 100).asString()).toBe('hsl(300,100%,50%)');
			expect(new HSV(420, 100, 100).asString()).toBe('hsl(60,100%,50%)');
		});

		it('handles alpha transparency', () => {
			expect(new HSV(0, 100, 100, 0.5).asString()).toBe('hsla(0,100%,50%,0.5)');
			expect(new HSV(120, 100, 100, 0.25).asString()).toBe('hsla(120,100%,50%,0.25)');
			expect(new HSV(240, 100, 100, 1).asString()).toBe('hsl(240,100%,50%)');
		});

		it('produces consistent results for repeated calls', () => {
			const color = new HSV(60, 50, 50);
			expect(color.asString()).toBe('hsl(60,33%,38%)');
			expect(color.asString()).toBe('hsl(60,33%,38%)');
		});
	});

	describe('color conversion', () => {

		it('asHSL converts HSV to HSL correctly', () => {
			function check(input: [number, number, number], output: [number, number, number]) {
				const hsv = new HSV(...input);
				const hsl = hsv.asHSL();
				expect(hsl).toBeInstanceOf(HSL);
				expect(hsl.asArray().map(Math.round))
					.toStrictEqual([...output, 1]);

				expect(hsv.asHex()).toStrictEqual(hsl.asHex());
			}

			check([10, 0, 0], [10, 0, 0]);
			check([11, 0, 50], [11, 0, 50]);
			check([12, 0, 100], [12, 0, 100]);
			check([13, 50, 0], [13, 0, 0]);
			check([14, 50, 50], [14, 33, 38]);
			check([15, 50, 100], [15, 100, 75]);
			check([16, 100, 0], [16, 0, 0]);
			check([17, 100, 50], [17, 100, 25]);
			check([18, 100, 100], [18, 100, 50]);
		});

		it('asRGB converts HSV to RGB correctly', () => {
			const color = new HSV(120, 100, 100);
			const rgb = color.asRGB();
			expect(rgb).toBeInstanceOf(RGB);
			expect(rgb.asArray().map(value => Math.round(value)))
				.toStrictEqual([0, 255, 0, 1]);
		});

		it('asHSV and toHSV return the same instance or clone', () => {
			const color = new HSV(240, 100, 50, 1);
			expect(color.asHSV()).toStrictEqual(color);
			expect(color.toHSV()).toStrictEqual(color);
		});

		it('asRGB conversion S and V', () => {
			function check(input: [number, number, number], output: [number, number, number]) {
				const color = new HSV(...input);
				const rgb = color.asRGB();
				expect(rgb.asArray().map(value => Math.round(value)))
					.toStrictEqual([...output, 1]);
			}

			check([10, 0, 0], [0, 0, 0]);
			check([11, 0, 50], [128, 128, 128]);
			check([12, 0, 100], [255, 255, 255]);
			check([13, 50, 0], [0, 0, 0]);
			check([14, 50, 50], [128, 79, 64]);
			check([15, 50, 100], [255, 159, 128]);
			check([16, 100, 0], [0, 0, 0]);
			check([17, 100, 50], [128, 36, 0]);
			check([18, 100, 100], [255, 77, 0]);
		});

		it('asRGB conversion H', () => {
			function check(hue: number, output: string) {
				const color = new HSV(hue, 100, 100);
				expect(color.asRGB().asHex()).toBe(output);
			}

			check(-1, '#FF0004');
			check(0, '#FF0000');
			check(1, '#FF0400');
			check(30, '#FF8000');
			check(60, '#FFFF00');
			check(90, '#80FF00');
			check(120, '#00FF00');
			check(150, '#00FF80');
			check(180, '#00FFFF');
			check(210, '#0080FF');
			check(240, '#0000FF');
			check(270, '#8000FF');
			check(300, '#FF00FF');
			check(330, '#FF0080');
			check(359, '#FF0004');
			check(360, '#FF0000');
			check(361, '#FF0400');
		});

	});

	describe('parse errors and validations', () => {
		it('constructor clamps out-of-bound values', () => {
			const color = new HSV(400, 150, 150, 2);
			expect(color.asArray()).toStrictEqual([40, 100, 100, 1]);
		});

		it('negative values are handled correctly', () => {
			const color = new HSV(-360, -50, -50, -1);
			expect(color.asArray()).toStrictEqual([0, 0, 0, 0]);
		});
	});

	describe('fade', () => {
		it('reduces alpha correctly', () => {
			const color = new HSV(120, 50, 50, 0.8);
			expect(color.fade(0.5).asArray()).toStrictEqual([120, 50, 50, 0.4]); // Alpha reduced by 50%
		});

		it('handles edge cases for fading', () => {
			const opaque = new HSV(0, 50, 50, 1);
			expect(opaque.fade(1).asArray()).toStrictEqual([0, 50, 50, 0]); // Fully faded to transparent

			const transparent = new HSV(0, 50, 50, 0);
			expect(transparent.fade(0.5).asArray()).toStrictEqual([0, 50, 50, 0]); // Remains fully transparent
		});
	});
});
import { describe, expect, it, beforeEach } from 'vitest';
import { HSL } from './hsl.js';
import { HSV } from './hsv.js';
import { RGB } from './rgb.js';

describe('HSL Class', () => {
	describe('constructor', () => {
		it('should initialize small HSL values correctly', () => {
			const color = new HSL(10, 20, 30, 0.4);
			expect(color.asArray()).toStrictEqual([10, 20, 30, 0.4]);
		});

		it('should initialize big HSL values correctly', () => {
			const color = new HSL(400, 120, 120, 2);
			expect(color.asArray()).toStrictEqual([40, 100, 100, 1]);
		});

		it('should initialize small HSL values correctly', () => {
			const color = new HSL(-60, -10, -10, -1);
			expect(color.asArray()).toStrictEqual([300, 0, 0, 0]);
		});
	});

	it('clone should return a new HSL instance with identical values', () => {
		const color = new HSL(120, 50, 50, 0.5);
		const clone = color.clone();
		expect(clone).toBeInstanceOf(HSL);
		expect(clone).toEqual(color);
		expect(clone).not.toBe(color);
	});

	describe('conversion', () => {
		it('asString should return correct HSL and HSLA strings', () => {
			const color1 = new HSL(120, 50, 50);
			expect(color1.asString()).toBe('hsl(120,50%,50%)');

			const color2 = new HSL(120, 50, 50, 0.5);
			expect(color2.asString()).toBe('hsla(120,50%,50%,0.5)');
		});

		it('asHSL should return a clone', () => {
			const color = new HSL(120, 50, 50);
			expect(color.asHSL()).toStrictEqual(color);
		});

		it('asHSV should correctly convert HSL to HSV', () => {
			function check(input: [number, number, number], output: [number, number, number]) {
				const hsl = new HSL(...input);
				const hsv = hsl.asHSV();
				expect(hsv).toBeInstanceOf(HSV);
				expect(hsv.asArray().map(Math.round)).toStrictEqual([...output, 1]);
			}

			check([10, 0, 0], [10, 0, 0]);
			check([11, 0, 50], [11, 0, 50]);
			check([12, 0, 100], [12, 0, 100]);
			check([13, 50, 0], [13, 0, 0]);
			check([14, 50, 50], [14, 67, 75]);
			check([15, 50, 100], [15, 0, 100]);
			check([16, 100, 0], [16, 0, 0]);
			check([17, 100, 50], [17, 100, 100]);
			check([18, 100, 100], [18, 0, 100]);
		});

		it('asRGB should correctly convert HSL to RGB', () => {
			function check(input: [number, number, number], output: [number, number, number]) {
				const hsl = new HSL(...input);
				const rgb = hsl.asRGB();
				expect(rgb).toBeInstanceOf(RGB);
				expect(rgb.asArray().map(Math.round)).toStrictEqual([...output, 1]);
			}

			check([10, 0, 0], [0, 0, 0]);
			check([11, 0, 50], [128, 128, 128]);
			check([12, 0, 100], [255, 255, 255]);
			check([13, 50, 0], [0, 0, 0]);
			check([14, 50, 50], [191, 94, 64]);
			check([15, 50, 100], [255, 255, 255]);
			check([16, 100, 0], [0, 0, 0]);
			check([17, 100, 50], [255, 72, 0]);
			check([18, 100, 100], [255, 255, 255]);
		});
	});

	describe('should parse valid HSL and HSLA strings', () => {
		function check(str: string, result: number[]) {
			it(`parse "${str}"`, () => {
				const color = HSL.parse(str);
				expect(color).toBeInstanceOf(HSL);
				expect(color.asArray()).toStrictEqual(result);
			});
		}

		check('hsl(240,100%,50%)', [240, 100, 50, 1]);
		check('hsla(240,100%,50%,0.75)', [240, 100, 50, 0.75]);
		check('hsl(400,50%,50%)', [40, 50, 50, 1]);

		it('parse should throw an error for invalid strings', () => {
			expect(() => HSL.parse('invalid')).toThrow('Invalid HSL color string');
		});
	});

	describe('invertLuminosity', () => {
		let color: HSL;
		beforeEach(() => (color = new HSL(120, 50, 50, 0.8)));

		it('inverts luminosity correctly', () => {
			expect(color.invertLuminosity().asArray()).toStrictEqual([120, 50, 50, 0.8]); // Luminosity inverted to 50%
		});

		it('handles edge cases for luminosity inversion', () => {
			const black = new HSL(0, 0, 0, 1);
			expect(black.invertLuminosity().asArray()).toStrictEqual([0, 0, 100, 1]); // Black becomes white

			const white = new HSL(0, 0, 100, 1);
			expect(white.invertLuminosity().asArray()).toStrictEqual([0, 0, 0, 1]); // White becomes black
		});
	});

	describe('rotateHue', () => {
		let color: HSL;
		beforeEach(() => (color = new HSL(120, 50, 50, 0.8)));

		it('rotates hue correctly within the range of 0-360', () => {
			expect(color.rotateHue(180).asArray()).toStrictEqual([300, 50, 50, 0.8]); // Hue rotated by 180 degrees
		});

		it('handles negative rotation correctly', () => {
			expect(color.rotateHue(-270).asArray()).toStrictEqual([210, 50, 50, 0.8]); // Hue rotated negatively
		});

		it('handles rotations that exceed 360 degrees', () => {
			expect(color.rotateHue(540).asArray()).toStrictEqual([300, 50, 50, 0.8]); // Hue wrapped around to 300
		});
	});

	describe('saturate', () => {
		let color: HSL, grey: HSL;
		beforeEach(() => {
			color = new HSL(120, 50, 50, 0.8);
			grey = new HSL(120, 0, 50, 0.8);
		});

		it('increases saturation correctly', () => {
			expect(color.saturate(0.5).asArray()).toStrictEqual([120, 75, 50, 0.8]);
			expect(grey.saturate(0.5).asArray()).toStrictEqual([120, 0, 50, 0.8]);
		});

		it('decreases saturation correctly', () => {
			expect(color.saturate(-0.5).asArray()).toStrictEqual([120, 25, 50, 0.8]); // Saturation decreased by 50%
		});

		it('clamps saturation to the valid range', () => {
			expect(color.saturate(1.5).asArray()).toStrictEqual([120, 100, 50, 0.8]); // Saturation clamped to 100%

			expect(color.saturate(-2).asArray()).toStrictEqual([120, 0, 50, 0.8]); // Saturation clamped to 0%
		});
	});

	describe('fade', () => {
		let color: HSL;
		beforeEach(() => (color = new HSL(120, 50, 50, 0.8)));

		it('reduces alpha correctly', () => {
			expect(color.fade(0.5).asArray()).toStrictEqual([120, 50, 50, 0.4]); // Alpha reduced by 50%
		});

		it('handles edge cases for fading', () => {
			const opaque = new HSL(0, 50, 50, 1);
			expect(opaque.fade(1).asArray()).toStrictEqual([0, 50, 50, 0]); // Fully faded to transparent

			const transparent = new HSL(0, 50, 50, 0);
			expect(transparent.fade(0.5).asArray()).toStrictEqual([0, 50, 50, 0]); // Remains fully transparent
		});
	});
});

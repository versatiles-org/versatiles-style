import { describe, expect, it } from 'vitest';
import { RGB } from './rgb.js';
import { HSL } from './hsl.js';
import { HSV } from './hsv.js';

describe('RGB Class', () => {

	it('constructor initializes values correctly with clamping', () => {
		const color = new RGB(300, -50, 500, 2);
		expect(color.asArray()).toStrictEqual([255, 0, 255, 1]);

		const colorNegative = new RGB(-10, -20, -30, -1);
		expect(colorNegative.asArray()).toStrictEqual([0, 0, 0, 0]);
	});

	it('asArray returns the correct array representation', () => {
		const color = new RGB(128, 64, 255, 0.5);
		expect(color.asArray()).toStrictEqual([128, 64, 255, 0.5]);
	});

	it('clone creates a new instance with identical values', () => {
		const color = new RGB(128, 255, 64, 0.8);
		const clone = color.clone();
		expect(clone).toBeInstanceOf(RGB);
		expect(clone).toEqual(color);
		expect(clone).not.toBe(color);
	});

	it('asString returns correct RGB/RGBA string', () => {
		const color1 = new RGB(255, 128, 64);
		expect(color1.asString()).toBe('rgb(255,128,64)');

		const color2 = new RGB(255, 128, 64, 0.5);
		expect(color2.asString()).toBe('rgba(255,128,64,0.5)');
	});

	it('asHex returns correct hexadecimal representation', () => {
		const color1 = new RGB(255, 128, 64);
		expect(color1.asHex()).toBe('#FF8040');

		const color2 = new RGB(255, 128, 64, 0.5);
		expect(color2.asHex()).toBe('#FF804080');
	});

	describe('color conversion', () => {
		it('asHSL converts RGB to HSL correctly', () => {
			const hsl = new RGB(255, 0, 0).asHSL();
			expect(hsl).toBeInstanceOf(HSL);
			expect(hsl.asArray().map(value => Math.round(value)))
				.toStrictEqual([0, 100, 50, 1]);

			expect(RGB.parse('#000000').asHSL().round().asArray()).toStrictEqual([0, 0, 0, 1]);
			expect(RGB.parse('#FFFFFF').asHSL().round().asArray()).toStrictEqual([0, 0, 100, 1]);
			expect(RGB.parse('#FF0000').asHSL().round().asArray()).toStrictEqual([0, 100, 50, 1]);
			expect(RGB.parse('#FF8000').asHSL().round().asArray()).toStrictEqual([30, 100, 50, 1]);
			expect(RGB.parse('#FFFF00').asHSL().round().asArray()).toStrictEqual([60, 100, 50, 1]);
			expect(RGB.parse('#80FF00').asHSL().round().asArray()).toStrictEqual([90, 100, 50, 1]);
			expect(RGB.parse('#00FF00').asHSL().round().asArray()).toStrictEqual([120, 100, 50, 1]);
			expect(RGB.parse('#00FF80').asHSL().round().asArray()).toStrictEqual([150, 100, 50, 1]);
			expect(RGB.parse('#00FFFF').asHSL().round().asArray()).toStrictEqual([180, 100, 50, 1]);
			expect(RGB.parse('#0080FF').asHSL().round().asArray()).toStrictEqual([210, 100, 50, 1]);
			expect(RGB.parse('#0000FF').asHSL().round().asArray()).toStrictEqual([240, 100, 50, 1]);
			expect(RGB.parse('#8000FF').asHSL().round().asArray()).toStrictEqual([270, 100, 50, 1]);
			expect(RGB.parse('#FF00FF').asHSL().round().asArray()).toStrictEqual([300, 100, 50, 1]);
			expect(RGB.parse('#FF0080').asHSL().round().asArray()).toStrictEqual([330, 100, 50, 1]);
		});

		it('asHSV converts RGB to HSV correctly', () => {
			const hsv = new RGB(255, 0, 0).asHSV();
			expect(hsv).toBeInstanceOf(HSV);
			expect(hsv.asArray().map(value => Math.round(value)))
				.toStrictEqual([0, 100, 100, 1]);

			expect(RGB.parse('#000000').asHSV().round().asArray()).toStrictEqual([0, 0, 0, 1]);
			expect(RGB.parse('#FFFFFF').asHSV().round().asArray()).toStrictEqual([0, 0, 100, 1]);
			expect(RGB.parse('#FF0000').asHSV().round().asArray()).toStrictEqual([0, 100, 100, 1]);
			expect(RGB.parse('#FF8000').asHSV().round().asArray()).toStrictEqual([30, 100, 100, 1]);
			expect(RGB.parse('#FFFF00').asHSV().round().asArray()).toStrictEqual([60, 100, 100, 1]);
			expect(RGB.parse('#80FF00').asHSV().round().asArray()).toStrictEqual([90, 100, 100, 1]);
			expect(RGB.parse('#00FF00').asHSV().round().asArray()).toStrictEqual([120, 100, 100, 1]);
			expect(RGB.parse('#00FF80').asHSV().round().asArray()).toStrictEqual([150, 100, 100, 1]);
			expect(RGB.parse('#00FFFF').asHSV().round().asArray()).toStrictEqual([180, 100, 100, 1]);
			expect(RGB.parse('#0080FF').asHSV().round().asArray()).toStrictEqual([210, 100, 100, 1]);
			expect(RGB.parse('#0000FF').asHSV().round().asArray()).toStrictEqual([240, 100, 100, 1]);
			expect(RGB.parse('#8000FF').asHSV().round().asArray()).toStrictEqual([270, 100, 100, 1]);
			expect(RGB.parse('#FF00FF').asHSV().round().asArray()).toStrictEqual([300, 100, 100, 1]);
			expect(RGB.parse('#FF0080').asHSV().round().asArray()).toStrictEqual([330, 100, 100, 1]);
		});

		it('asRGB and toRGB return the same instance or clone', () => {
			const color = new RGB(255, 128, 64, 0.5);
			expect(color.asRGB()).toStrictEqual(color);
			expect(color.toRGB()).toStrictEqual(color);
		});

		it('handles black correctly', () => {
			const color = new RGB(0, 0, 0);
			expect(color.asHSL().asArray().map(value => Math.round(value))).toStrictEqual([0, 0, 0, 1]);
			expect(color.asHSV().asArray().map(value => Math.round(value))).toStrictEqual([0, 0, 0, 1]);
		});

		it('handles white correctly', () => {
			const color = new RGB(255, 255, 255);
			expect(color.asHSL().asArray().map(value => Math.round(value))).toStrictEqual([0, 0, 100, 1]);
			expect(color.asHSV().asArray().map(value => Math.round(value))).toStrictEqual([0, 0, 100, 1]);
		});
	});

	describe('parse', () => {
		it('parses hexadecimal color strings correctly', () => {
			expect(RGB.parse('#ff8040').asArray()).toStrictEqual([255, 128, 64, 1]);
			expect(RGB.parse('#ff804066').asArray()).toStrictEqual([255, 128, 64, 0.4]);
		});

		it('parses shorthand hexadecimal strings correctly', () => {
			expect(RGB.parse('#fa4').asArray()).toStrictEqual([255, 170, 68, 1]);
			expect(RGB.parse('#fa43').asArray()).toStrictEqual([255, 170, 68, 0.2]);
		});

		it('parses RGB strings correctly', () => {
			expect(RGB.parse('rgb(255, 128, 64)').asArray()).toStrictEqual([255, 128, 64, 1]);
		});

		it('parses RGBA strings correctly', () => {
			expect(RGB.parse('rgba(255, 128, 64, 0.5)').asArray()).toStrictEqual([255, 128, 64, 0.5]);
		});

		it('throws an error for invalid strings', () => {
			expect(() => RGB.parse('invalid')).toThrow('Invalid RGB color string: "invalid"');
		});
	});

	describe('filter methods', () => {
		function pc(cb: (c: RGB) => RGB): [number, number, number, number] {
			return cb(new RGB(50, 150, 200, 0.8)).round().asArray();
		}

		it('adjusts gamma correctly', () => {
			expect(pc(c => c.gamma(2.2))).toStrictEqual([7, 79, 149, 0.8]);
			expect(pc(c => c.gamma(0.001))).toStrictEqual([255, 255, 255, 0.8]);
			expect(pc(c => c.gamma(1000))).toStrictEqual([0, 0, 0, 0.8]);
		});

		it('inverts RGB values correctly', () => {
			expect(pc(c => c.invert())).toStrictEqual([205, 105, 55, 0.8]);
		});

		it('adjusts contrast correctly', () => {
			expect(pc(c => c.contrast(1.5))).toStrictEqual([11, 161, 236, 0.8]);
			expect(pc(c => c.contrast(1e6))).toStrictEqual([0, 255, 255, 0.8]);
			expect(pc(c => c.contrast(0))).toStrictEqual([128, 128, 128, 0.8]);
		});

		it('increases brightness correctly', () => {
			expect(pc(c => c.brightness(0.5))).toStrictEqual([153, 203, 228, 0.8]);
			expect(pc(c => c.brightness(-0.5))).toStrictEqual([25, 75, 100, 0.8]);
			expect(pc(c => c.brightness(2))).toStrictEqual([255, 255, 255, 0.8]);
			expect(pc(c => c.brightness(-2))).toStrictEqual([0, 0, 0, 0.8]);
		});

		it('tints color correctly', () => {
			const tintColor = new RGB(255, 0, 0);
			expect(pc(c => c.tint(0.5, tintColor))).toStrictEqual([125, 100, 125, 0.8]);
			expect(pc(c => c.tint(1, tintColor))).toStrictEqual([200, 50, 50, 0.8]);
			expect(pc(c => c.tint(0, tintColor))).toStrictEqual([50, 150, 200, 0.8]);
		});

		it('blends color correctly', () => {
			const blendColor = new RGB(255, 0, 0);
			expect(pc(c => c.blend(0.2, blendColor))).toStrictEqual([91, 120, 160, 0.8]);
			expect(pc(c => c.blend(0.5, blendColor))).toStrictEqual([153, 75, 100, 0.8]);
			expect(pc(c => c.blend(0.8, blendColor))).toStrictEqual([214, 30, 40, 0.8]);
			expect(pc(c => c.blend(1, blendColor))).toStrictEqual([255, 0, 0, 0.8]);
			expect(pc(c => c.blend(0, blendColor))).toStrictEqual([50, 150, 200, 0.8]);
		});

		it('lightens the color correctly', () => {
			expect(pc(c => c.lighten(0.5))).toStrictEqual([153, 203, 228, 0.8]);
			expect(pc(c => c.lighten(2))).toStrictEqual([255, 255, 255, 0.8]);
		});

		it('darkens the color correctly', () => {
			expect(pc(c => c.darken(0.5))).toStrictEqual([25, 75, 100, 0.8]);
			expect(pc(c => c.darken(1))).toStrictEqual([0, 0, 0, 0.8]);
			expect(pc(c => c.darken(2))).toStrictEqual([0, 0, 0, 0.8]);
		});

		it('fades color correctly', () => {
			expect(pc(c => c.fade(0.5))).toStrictEqual([50, 150, 200, 0.4]);
			expect(pc(c => c.fade(1))).toStrictEqual([50, 150, 200, 0]);

			const fullyOpaque = new RGB(50, 150, 200, 1);
			expect(fullyOpaque.fade(0).asArray()).toStrictEqual([50, 150, 200, 1]);
		});
	});
});

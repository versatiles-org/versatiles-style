import { RGB } from './rgb.js';
import { HSL } from './hsl.js';
import { HSV } from './hsv.js';

describe('RGB Class', () => {

	test('constructor initializes values correctly with clamping', () => {
		const color = new RGB(300, -50, 500, 2);
		expect(color.asArray()).toStrictEqual([255, 0, 255, 1]);

		const colorNegative = new RGB(-10, -20, -30, -1);
		expect(colorNegative.asArray()).toStrictEqual([0, 0, 0, 0]);
	});

	test('asArray returns the correct array representation', () => {
		const color = new RGB(128, 64, 255, 0.5);
		expect(color.asArray()).toStrictEqual([128, 64, 255, 0.5]);
	});

	test('clone creates a new instance with identical values', () => {
		const color = new RGB(128, 255, 64, 0.8);
		const clone = color.clone();
		expect(clone).toBeInstanceOf(RGB);
		expect(clone).toEqual(color);
		expect(clone).not.toBe(color);
	});

	test('asString returns correct RGB/RGBA string', () => {
		const color1 = new RGB(255, 128, 64);
		expect(color1.asString()).toBe('rgb(255,128,64)');

		const color2 = new RGB(255, 128, 64, 0.5);
		expect(color2.asString()).toBe('rgba(255,128,64,0.5)');
	});

	test('asHex returns correct hexadecimal representation', () => {
		const color1 = new RGB(255, 128, 64);
		expect(color1.asHex()).toBe('#FF8040');

		const color2 = new RGB(255, 128, 64, 0.5);
		expect(color2.asHex()).toBe('#FF804080');
	});

	test('asHSL converts RGB to HSL correctly', () => {
		const color = new RGB(255, 0, 0);
		const hsl = color.asHSL();
		expect(hsl).toBeInstanceOf(HSL);
		expect(hsl.asArray().map(value => Math.round(value)))
			.toStrictEqual([0, 100, 50, 1]);
	});

	test('asHSV converts RGB to HSV correctly', () => {
		const color = new RGB(255, 0, 0);
		const hsv = color.asHSV();
		expect(hsv).toBeInstanceOf(HSV);
		expect(hsv.asArray().map(value => Math.round(value)))
			.toStrictEqual([0, 100, 100, 1]);
	});

	test('asRGB and toRGB return the same instance or clone', () => {
		const color = new RGB(255, 128, 64, 0.5);
		expect(color.asRGB()).toStrictEqual(color);
		expect(color.toRGB()).toStrictEqual(color);
	});

	describe('parse method', () => {
		test('parses hexadecimal color strings correctly', () => {
			expect(RGB.parse('#ff8040').asArray()).toStrictEqual([255, 128, 64, 1]);
			expect(RGB.parse('#ff804066').asArray()).toStrictEqual([255, 128, 64, 0.4]);
		});

		test('parses shorthand hexadecimal strings correctly', () => {
			expect(RGB.parse('#fa4').asArray()).toStrictEqual([255, 170, 68, 1]);
			expect(RGB.parse('#fa43').asArray()).toStrictEqual([255, 170, 68, 0.2]);
		});

		test('parses RGB strings correctly', () => {
			expect(RGB.parse('rgb(255, 128, 64)').asArray()).toStrictEqual([255, 128, 64, 1]);
		});

		test('parses RGBA strings correctly', () => {
			expect(RGB.parse('rgba(255, 128, 64, 0.5)').asArray()).toStrictEqual([255, 128, 64, 0.5]);
		});

		test('throws an error for invalid strings', () => {
			expect(() => RGB.parse('invalid')).toThrow('Invalid RGB color string: "invalid"');
		});
	});

	describe('edge cases for conversions', () => {
		test('handles black correctly', () => {
			const color = new RGB(0, 0, 0);
			expect(color.asHSL().asArray().map(value => Math.round(value))).toStrictEqual([0, 0, 0, 1]);
			expect(color.asHSV().asArray().map(value => Math.round(value))).toStrictEqual([0, 0, 0, 1]);
		});

		test('handles white correctly', () => {
			const color = new RGB(255, 255, 255);
			expect(color.asHSL().asArray().map(value => Math.round(value))).toStrictEqual([0, 0, 100, 1]);
			expect(color.asHSV().asArray().map(value => Math.round(value))).toStrictEqual([0, 0, 100, 1]);
		});
	});
});
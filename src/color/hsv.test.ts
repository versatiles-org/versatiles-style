import { HSV } from './hsv.ts';
import { HSL } from './hsl.ts';
import { RGB } from './rgb.ts';

describe('HSV Class', () => {

	test('constructor initializes values correctly with clamping', () => {
		const color = new HSV(400, 120, 120, 2);
		expect(color.asArray()).toStrictEqual([40, 100, 100, 1]);

		const colorNegative = new HSV(-60, -10, -10, -1);
		expect(colorNegative.asArray()).toStrictEqual([300, 0, 0, 0]);
	});

	test('asArray returns correct array representation', () => {
		const color = new HSV(120, 50, 50, 0.5);
		expect(color.asArray()).toStrictEqual([120, 50, 50, 0.5]);
	});

	test('clone returns a new instance with identical values', () => {
		const color = new HSV(180, 70, 70, 0.7);
		const clone = color.clone();
		expect(clone).toBeInstanceOf(HSV);
		expect(clone).toEqual(color);
		expect(clone).not.toBe(color);
	});

	test('asHSL converts HSV to HSL correctly', () => {
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

	test('asRGB converts HSV to RGB correctly', () => {
		const color = new HSV(120, 100, 100);
		const rgb = color.asRGB();
		expect(rgb).toBeInstanceOf(RGB);
		expect(rgb.asArray().map(value => Math.round(value)))
			.toStrictEqual([0, 255, 0, 1]);
	});

	test('asHSV and toHSV return the same instance or clone', () => {
		const color = new HSV(240, 100, 50, 1);
		expect(color.asHSV()).toStrictEqual(color);
		expect(color.toHSV()).toStrictEqual(color);
	});

	test('asRGB conversion', () => {
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

	describe('parse errors and validations', () => {
		test('constructor clamps out-of-bound values', () => {
			const color = new HSV(400, 150, 150, 2);
			expect(color.asArray()).toStrictEqual([40, 100, 100, 1]);
		});

		test('negative values are handled correctly', () => {
			const color = new HSV(-360, -50, -50, -1);
			expect(color.asArray()).toStrictEqual([0, 0, 0, 0]);
		});
	});
});
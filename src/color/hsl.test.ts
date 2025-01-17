import { HSL } from './hsl.js';
import { HSV } from './hsv.js';
import { RGB } from './rgb.js';

describe('HSL Class', () => {

	test('constructor should initialize small HSL values correctly', () => {
		const color = new HSL(10, 20, 30, 0.4);
		expect(color.asArray()).toStrictEqual([10, 20, 30, 0.4]);
	});

	test('constructor should initialize big HSL values correctly', () => {
		const color = new HSL(400, 120, 120, 2);
		expect(color.asArray()).toStrictEqual([40, 100, 100, 1]);
	});

	test('constructor should initialize small HSL values correctly', () => {
		const color = new HSL(-60, -10, -10, -1);
		expect(color.asArray()).toStrictEqual([300, 0, 0, 0]);
	});

	test('clone should return a new HSL instance with identical values', () => {
		const color = new HSL(120, 50, 50, 0.5);
		const clone = color.clone();
		expect(clone).toBeInstanceOf(HSL);
		expect(clone).toEqual(color);
		expect(clone).not.toBe(color);
	});

	test('asString should return correct HSL and HSLA strings', () => {
		const color1 = new HSL(120, 50, 50);
		expect(color1.asString()).toBe('hsl(120,50%,50%)');

		const color2 = new HSL(120, 50, 50, 0.5);
		expect(color2.asString()).toBe('hsla(120,50%,50%,0.5)');
	});

	test('asHSL and toHSL should return the same instance', () => {
		const color = new HSL(120, 50, 50);
		expect(color.asHSL()).toStrictEqual(color);
		expect(color.toHSL()).toStrictEqual(color);
	});

	test('asHSV should correctly convert HSL to HSV', () => {
		function check(input: [number, number, number], output: [number, number, number]) {
			const hsl = new HSL(...input);
			const hsv = hsl.asHSV();
			expect(hsv).toBeInstanceOf(HSV);
			expect(hsv.asArray().map(Math.round))
				.toStrictEqual([...output, 1]);
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

	test('asRGB should correctly convert HSL to RGB', () => {
		function check(input: [number, number, number], output: [number, number, number]) {
			const hsl = new HSL(...input)
			const rgb = hsl.asRGB();
			expect(rgb).toBeInstanceOf(RGB);
			expect(rgb.asArray().map(Math.round))
				.toStrictEqual([...output, 1]);
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

	describe('should parse valid HSL and HSLA strings', () => {
		function check(str: string, result: number[]) {
			test(`parse "${str}"`, () => {
				const color = HSL.parse(str);
				expect(color).toBeInstanceOf(HSL);
				expect(color.asArray()).toStrictEqual(result);
			})
		}

		check('hsl(240,100%,50%)', [240, 100, 50, 1]);
		check('hsla(240,100%,50%,0.75)', [240, 100, 50, 0.75]);
		check('hsl(400,50%,50%)', [40, 50, 50, 1]);
	});

	test('parse should throw an error for invalid strings', () => {
		expect(() => HSL.parse('invalid')).toThrow('Invalid HSL color string');
	});
});
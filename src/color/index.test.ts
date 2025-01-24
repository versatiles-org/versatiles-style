import { Color } from './index.js';
import { HSL } from './hsl.js';
import { HSV } from './hsv.js';
import { RGB } from './rgb.js';

describe('Color Conversions', () => {

	const scenarios: [number, number, number, number][] = [
		[-100, 14, 15, 0],
		[0, 0, 0, 0.1],
		[100, 0, 50, 0.2],
		[200, 0, 100, 0.3],
		[300, 50, 0, 0.4],
		[400, 50, 50, 0.5],
		[500, 50, 100, 0.6],
		[600, 100, 0, 0.7],
		[700, 100, 50, 0.8],
		[800, 100, 100, 0.9],
		[900, 12, 13, 1.0],
	]
	test('test HSV -> HSL -> RGB', () => {
		for (const v of scenarios) {
			const hsv = new HSV(...v);
			expect(hsv.a).toEqual(v[3]);
			const hsl = hsv.asHSL();
			const a1 = hsv.asRGB().asArray();
			const a2 = hsl.asRGB().asArray();
			for (let i = 0; i < 4; i++) expect(a1[i]).toBeCloseTo(a2[i]);
		}
	});

	test('test HSL -> HSV -> RGB', () => {
		for (const v of scenarios) {
			const hsl = new HSL(...v);
			expect(hsl.a).toEqual(v[3]);
			const hsv = hsl.asHSV();
			const a1 = hsv.asRGB().asArray();
			const a2 = hsl.asRGB().asArray();
			for (let i = 0; i < 4; i++) expect(a1[i]).toBeCloseTo(a2[i]);
		}
	});
})

describe('Color.parse', () => {
	test('parses hexadecimal color strings correctly', () => {
		const color = Color.parse('#ff8040');
		expect(color).toBeInstanceOf(RGB);
		expect(color.asArray()).toStrictEqual([255, 128, 64, 1]);

		const colorWithAlpha = Color.parse('#ff80407f');
		expect(colorWithAlpha).toBeInstanceOf(RGB);
		expect(colorWithAlpha.asHex()).toStrictEqual('#FF80407F');
	});

	test('parses RGB strings correctly', () => {
		const color = Color.parse('rgb(255, 128, 64)');
		expect(color).toBeInstanceOf(RGB);
		expect(color.asArray()).toStrictEqual([255, 128, 64, 1]);

		const colorWithAlpha = Color.parse('rgba(255, 128, 64, 0.5)');
		expect(colorWithAlpha).toBeInstanceOf(RGB);
		expect(colorWithAlpha.asArray()).toStrictEqual([255, 128, 64, 0.5]);
	});

	test('parses HSL strings correctly', () => {
		const color = Color.parse('hsl(120, 50%, 50%)');
		expect(color).toBeInstanceOf(HSL);
		expect(color.asArray()).toStrictEqual([120, 50, 50, 1]);

		const colorWithAlpha = Color.parse('hsla(120, 50%, 50%, 0.5)');
		expect(colorWithAlpha).toBeInstanceOf(HSL);
		expect(colorWithAlpha.asArray()).toStrictEqual([120, 50, 50, 0.5]);
	});

	test('throws an error for unsupported formats', () => {
		expect(() => Color.parse('invalid color string')).toThrow('Unknown color format: invalid color string');
	});
});

describe('Color.random', () => {
	test('generates random HSV colors', () => {
		const random = Color.random();
		expect(random).toBeInstanceOf(HSV);
		const array = random.asArray();
		expect(array[0]).toBeGreaterThanOrEqual(0);
		expect(array[0]).toBeLessThanOrEqual(360);
		expect(array[1]).toBeGreaterThanOrEqual(0);
		expect(array[1]).toBeLessThanOrEqual(100);
		expect(array[2]).toBeGreaterThanOrEqual(0);
		expect(array[2]).toBeLessThanOrEqual(100);
	});

	test('supports options for generating random colors', () => {
		const random = Color.random({ hue: 'red', luminosity: 'bright' });
		expect(random).toBeInstanceOf(HSV);
		// Additional checks based on the options provided can be added here
	});
});

describe('Color Class Properties', () => {
	test('Color.HSL is accessible', () => {
		expect(Color.HSL).toBe(HSL);
	});

	test('Color.HSV is accessible', () => {
		expect(Color.HSV).toBe(HSV);
	});

	test('Color.RGB is accessible', () => {
		expect(Color.RGB).toBe(RGB);
	});
});

describe('Exported Module', () => {
	test('named export is Color', async () => {
		const module = await import('./index.js');
		expect(module.Color).toBe(Color);
	});
});

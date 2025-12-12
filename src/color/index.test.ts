import { describe, expect, it } from 'vitest';
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
	];
	it('test HSV -> HSL -> RGB', () => {
		for (const v of scenarios) {
			const hsv = new HSV(...v);
			expect(hsv.a).toEqual(v[3]);
			const hsl = hsv.asHSL();
			const a1 = hsv.asRGB().asArray();
			const a2 = hsl.asRGB().asArray();
			for (let i = 0; i < 4; i++) expect(a1[i]).toBeCloseTo(a2[i]);
		}
	});

	it('test HSL -> HSV -> RGB', () => {
		for (const v of scenarios) {
			const hsl = new HSL(...v);
			expect(hsl.a).toEqual(v[3]);
			const hsv = hsl.asHSV();
			const a1 = hsv.asRGB().asArray();
			const a2 = hsl.asRGB().asArray();
			for (let i = 0; i < 4; i++) expect(a1[i]).toBeCloseTo(a2[i]);
		}
	});
});

describe('Color.parse', () => {
	it('parses hexadecimal color strings correctly', () => {
		const color = Color.parse('#ff8040');
		expect(color).toBeInstanceOf(RGB);
		expect(color.asArray()).toStrictEqual([255, 128, 64, 1]);

		const colorWithAlpha = Color.parse('#ff80407f');
		expect(colorWithAlpha).toBeInstanceOf(RGB);
		expect(colorWithAlpha.asHex()).toStrictEqual('#FF80407F');
	});

	it('parses RGB strings correctly', () => {
		const color = Color.parse('rgb(255, 128, 64)');
		expect(color).toBeInstanceOf(RGB);
		expect(color.asArray()).toStrictEqual([255, 128, 64, 1]);

		const colorWithAlpha = Color.parse('rgba(255, 128, 64, 0.5)');
		expect(colorWithAlpha).toBeInstanceOf(RGB);
		expect(colorWithAlpha.asArray()).toStrictEqual([255, 128, 64, 0.5]);
	});

	it('parses HSL strings correctly', () => {
		const color = Color.parse('hsl(120, 50%, 50%)');
		expect(color).toBeInstanceOf(HSL);
		expect(color.asArray()).toStrictEqual([120, 50, 50, 1]);

		const colorWithAlpha = Color.parse('hsla(120, 50%, 50%, 0.5)');
		expect(colorWithAlpha).toBeInstanceOf(HSL);
		expect(colorWithAlpha.asArray()).toStrictEqual([120, 50, 50, 0.5]);
	});

	it('throws an error for unsupported formats', () => {
		expect(() => Color.parse('invalid color string')).toThrow('Unknown color format: invalid color string');
	});
});

describe('Color Class Properties', () => {
	it('Color.HSL is accessible', () => {
		expect(Color.HSL).toBe(HSL);
	});

	it('Color.HSV is accessible', () => {
		expect(Color.HSV).toBe(HSV);
	});

	it('Color.RGB is accessible', () => {
		expect(Color.RGB).toBe(RGB);
	});
});

describe('Exported Module', () => {
	it('named export is Color', async () => {
		const module = await import('./index.js');
		expect(module.Color).toBe(Color);
	});
});

describe('Color Transformation Methods', () => {
	it('gamma() applies gamma correction', () => {
		const color = Color.parse('#808080');
		const adjusted = color.gamma(2.2);
		expect(adjusted).toBeInstanceOf(RGB);
		expect(adjusted.asHex()).not.toBe('#808080');
	});

	it('contrast() adjusts contrast', () => {
		const color = Color.parse('#FF8040');
		const adjusted = color.contrast(1.5);
		expect(adjusted).toBeInstanceOf(RGB);
		expect(adjusted.asHex()).not.toBe('#FF8040');
	});

	it('tint() blends with a tint color', () => {
		const color = Color.parse('#FF0000');
		const tintColor = Color.parse('#0000FF');
		const tinted = color.tint(0.5, tintColor);
		expect(tinted).toBeInstanceOf(RGB);
		expect(tinted.asHex()).not.toBe('#FF0000');
	});

	it('blend() blends with another color', () => {
		const color1 = Color.parse('#FF0000');
		const color2 = Color.parse('#0000FF');
		const blended = color1.blend(0.5, color2);
		expect(blended).toBeInstanceOf(RGB);
		expect(blended.asHex()).not.toBe('#FF0000');
	});

	it('setHue() changes the hue', () => {
		const color = Color.parse('#FF0000');
		const newHue = color.setHue(180);
		expect(newHue).toBeInstanceOf(HSV);
		expect(newHue.h).toBe(180);
	});
});

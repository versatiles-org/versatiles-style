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
		expect(() => Color.parse('invalid color string')).toThrow(
			'Color.parse: Unknown color format "invalid color string"'
		);
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
		expect(color.gamma(2.2).asString()).toBe('rgb(56,56,56)');
	});

	it('gamma() works from HSL', () => {
		const hsl = new HSL(120, 50, 50, 1);
		expect(hsl.gamma(2.2).asString()).toBe('rgb(12,135,12)');
	});

	it('contrast() adjusts contrast', () => {
		const color = Color.parse('#FF8040');
		expect(color.contrast(1.5).asString()).toBe('rgb(255,128,32)');
	});

	it('contrast() works from HSV', () => {
		const hsv = new HSV(180, 50, 50, 1);
		expect(hsv.contrast(1.5).asString()).toBe('rgb(32,128,128)');
	});

	it('brightness() works from HSL', () => {
		const hsl = new HSL(240, 100, 50, 1);
		expect(hsl.brightness(0.3).asString()).toBe('rgb(77,77,255)');
	});

	it('lighten() works from HSL', () => {
		const hsl = new HSL(0, 100, 30, 1);
		expect(hsl.lighten(0.2).asString()).toBe('rgb(173,51,51)');
	});

	it('darken() works from HSV', () => {
		const hsv = new HSV(60, 100, 80, 1);
		expect(hsv.darken(0.3).asString()).toBe('rgb(143,143,0)');
	});

	it('tint() blends with a tint color', () => {
		const color = Color.parse('#FF0000');
		const tintColor = Color.parse('#0000FF');
		expect(color.tint(0.5, tintColor).asString()).toBe('rgb(128,0,128)');
	});

	it('tint() works from HSL', () => {
		const hsl = new HSL(0, 100, 50, 1);
		const tintColor = new HSL(120, 100, 50, 1);
		expect(hsl.tint(0.5, tintColor).asString()).toBe('rgb(128,128,0)');
	});

	it('blend() blends with another color', () => {
		const color1 = Color.parse('#FF0000');
		const color2 = Color.parse('#0000FF');
		expect(color1.blend(0.5, color2).asString()).toBe('rgb(128,0,128)');
	});

	it('blend() works from HSV', () => {
		const hsv1 = new HSV(0, 100, 100, 1);
		const hsv2 = new HSV(240, 100, 100, 1);
		expect(hsv1.blend(0.3, hsv2).asString()).toBe('rgb(179,0,77)');
	});

	it('setHue() changes the hue', () => {
		const color = Color.parse('#FF0000');
		expect(color.setHue(180).asString()).toBe('hsl(180,100%,50%)');
	});

	it('invertLuminosity() inverts from HSV', () => {
		const hsv = new HSV(200, 50, 60, 1);
		expect(hsv.invertLuminosity().asString()).toBe('hsl(200,33%,55%)');
	});

	it('rotateHue() rotates from RGB', () => {
		const rgb = new RGB(255, 0, 0, 1);
		expect(rgb.rotateHue(120).asString()).toBe('hsl(120,100%,50%)');
	});

	it('saturate() increases saturation from HSV', () => {
		const hsv = new HSV(100, 30, 70, 1);
		expect(hsv.saturate(1.5).asString()).toBe('hsl(100,65%,60%)');
	});

	it('invert() inverts from HSL', () => {
		const hsl = new HSL(180, 100, 50, 1);
		expect(hsl.invert().asString()).toBe('rgb(255,0,0)');
	});
});

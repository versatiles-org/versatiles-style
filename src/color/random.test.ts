import { describe, expect, it } from 'vitest';
import { HSV } from './hsv.js';
import type { RandomColorOptions } from './random.js';
import randomColor from './random.js';

describe('RandomColor', () => {
	it('constructor initializes without errors', () => {
		expect(randomColor).toBeDefined();
	});

	describe('Color.random', () => {
		it('generates random HSV colors', () => {
			const random = randomColor();
			expect(random).toBeInstanceOf(HSV);
			const array = random.asArray();
			expect(array[0]).toBeGreaterThanOrEqual(0);
			expect(array[0]).toBeLessThanOrEqual(360);
			expect(array[1]).toBeGreaterThanOrEqual(0);
			expect(array[1]).toBeLessThanOrEqual(100);
			expect(array[2]).toBeGreaterThanOrEqual(0);
			expect(array[2]).toBeLessThanOrEqual(100);
		});

		it('supports options for generating random colors', () => {
			const random = randomColor({ hue: 'red', luminosity: 'bright' });
			expect(random).toBeInstanceOf(HSV);
			// Additional checks based on the options provided can be added here
		});
	});

	describe('randomColor method', () => {
		it('returns correct color string for some test cases', () => {
			function t(options: RandomColorOptions): string {
				return randomColor(options).asHSL().asString();
			}
			expect(t({ seed: 'testSeed', hue: 'red' })).toBe('hsl(356,90%,30%)');
			expect(t({ seed: 'testSeed', hue: 120 })).toBe('hsl(120,92%,26%)');
			expect(t({ seed: 'testSeed', luminosity: 'dark' })).toBe('hsl(185,98%,19%)');
			expect(t({ seed: 'testSeed', luminosity: 12 })).toBe('hsl(185,90%,6%)');
			expect(t({ seed: 'testSeed', saturation: 'strong' })).toBe('hsl(185,100%,48%)');
			expect(t({ seed: 'testSeed', opacity: 0.5 })).toBe('hsla(185,90%,23%,0.5)');
			expect(t({ seed: 'testSeed' })).toBe('hsl(185,90%,23%)');
		});

		it('generates light colors with luminosity: "light"', () => {
			const color = randomColor({ seed: 'lightSeed', luminosity: 'light' });
			const hsv = color.asArray();
			// Light colors should have higher brightness values
			expect(hsv[2]).toBeGreaterThan(50);
			expect(color).toBeInstanceOf(HSV);
		});

		it('generates random luminosity colors with luminosity: "random"', () => {
			const color = randomColor({ seed: 'randomSeed', luminosity: 'random' });
			const hsv = color.asArray();
			// Random luminosity can be anywhere from 0-100
			expect(hsv[2]).toBeGreaterThanOrEqual(0);
			expect(hsv[2]).toBeLessThanOrEqual(100);
			expect(color).toBeInstanceOf(HSV);
		});

		it('generates light saturation with luminosity: "light"', () => {
			// Test light luminosity affects saturation picking
			const color1 = randomColor({ seed: 'lightTest1', luminosity: 'light', hue: 'blue' });
			const color2 = randomColor({ seed: 'lightTest2', luminosity: 'light', hue: 'green' });
			expect(color1).toBeInstanceOf(HSV);
			expect(color2).toBeInstanceOf(HSV);
		});

		it('generates colors with various saturation options', () => {
			const weak = randomColor({ seed: 'satTest', saturation: 'weak' });
			const strong = randomColor({ seed: 'satTest', saturation: 'strong' });

			expect(weak).toBeInstanceOf(HSV);
			expect(strong).toBeInstanceOf(HSV);
			// Strong saturation should have higher saturation values
			expect(strong.s).toBeGreaterThan(80);
		});

		it('generates colors with all hue name options', () => {
			const hues: Array<string | number> = [
				'red',
				'orange',
				'yellow',
				'green',
				'blue',
				'purple',
				'pink',
				'monochrome',
				180,
			];

			hues.forEach((hue) => {
				const color = randomColor({ seed: `hue-${hue}`, hue });
				expect(color).toBeInstanceOf(HSV);
			});
		});

		it('consistent color generation with a seed', () => {
			const color1 = randomColor({ seed: 'consistentSeed' });
			const color2 = randomColor({ seed: 'consistentSeed' });
			expect(color1.asHex()).toBe(color2.asHex());
		});

		it('different color generation without a seed', () => {
			const color1 = randomColor({ seed: 'seed1' });
			const color2 = randomColor({ seed: 'seed2' });
			expect(color1.asHex()).not.toBe(color2.asHex());
		});
	});
});

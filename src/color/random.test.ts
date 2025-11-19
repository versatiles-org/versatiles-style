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

import { describe, expect, it } from 'vitest';
import { Color } from './color.js';
import type { RandomColorOptions } from './random.js';
import randomColor from './random.js';

describe('RandomColor', () => {
	it('constructor initializes without errors', () => {
		expect(randomColor).toBeDefined();
	});

	describe('Color.random', () => {
		it('generates random HSV colors', () => {
			const random = randomColor();
			expect(random).toBeInstanceOf(Color);
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
			expect(random).toBeInstanceOf(Color);
			// Additional checks based on the options provided can be added here
		});
	});

	describe('randomColor method', () => {
		it('returns correct color string for some test cases', () => {
			// pinned as colours rather than formatted strings: this is about the seeded generator, not
			// about how a colour is spelled
			function t(options: RandomColorOptions): string {
				return randomColor(options).asHex();
			}
			expect(t({ seed: 'testSeed', hue: 'red' })).toBe('#940711');
			expect(t({ seed: 'testSeed', hue: 120 })).toBe('#058005');
			expect(t({ seed: 'testSeed', luminosity: 'dark' })).toBe('#01575E');
			expect(t({ seed: 'testSeed', luminosity: 12 })).toBe('#021C1F');
			expect(t({ seed: 'testSeed', saturation: 'strong' })).toBe('#00E0F5');
			expect(t({ seed: 'testSeed', opacity: 0.5 })).toBe('#06677080');
			expect(t({ seed: 'testSeed' })).toBe('#066770');
		});

		it('generates light colors with luminosity: "light"', () => {
			const color = randomColor({ seed: 'lightSeed', luminosity: 'light' });
			const hsv = color.asArray();
			// Light colors should have higher brightness values
			expect(hsv[2]).toBeGreaterThan(50);
			expect(color).toBeInstanceOf(Color);
		});

		it('generates random luminosity colors with luminosity: "random"', () => {
			const color = randomColor({ seed: 'randomSeed', luminosity: 'random' });
			const hsv = color.asArray();
			// Random luminosity can be anywhere from 0-100
			expect(hsv[2]).toBeGreaterThanOrEqual(0);
			expect(hsv[2]).toBeLessThanOrEqual(100);
			expect(color).toBeInstanceOf(Color);
		});

		it('generates light saturation with luminosity: "light"', () => {
			// Test light luminosity affects saturation picking
			const color1 = randomColor({ seed: 'lightTest1', luminosity: 'light', hue: 'blue' });
			const color2 = randomColor({ seed: 'lightTest2', luminosity: 'light', hue: 'green' });
			expect(color1).toBeInstanceOf(Color);
			expect(color2).toBeInstanceOf(Color);
		});

		it('generates colors with various saturation options', () => {
			const weak = randomColor({ seed: 'satTest', saturation: 'weak' });
			const strong = randomColor({ seed: 'satTest', saturation: 'strong' });

			expect(weak).toBeInstanceOf(Color);
			expect(strong).toBeInstanceOf(Color);
			// Strong saturation should have higher saturation values
			expect(strong.hsv.s).toBeGreaterThan(80);
			expect(weak.hsv.s).toBeLessThan(strong.hsv.s);
		});

		it('honours a numeric saturation', () => {
			// v5 understood only 'strong': a number and 'weak' both fell through to the default range
			for (const saturation of [20, 60, 90]) {
				expect(randomColor({ seed: 'testSeed', saturation }).hsv.s).toBeCloseTo(saturation, 6);
			}
		});

		it('gives a different colour each time when no seed is given', () => {
			// v5 seeded with 0 when no seed was passed, so every unseeded call returned the same colour
			const colors = new Set(Array.from({ length: 10 }, () => randomColor().asHex()));
			expect(colors.size).toBeGreaterThan(1);
		});

		it('gives the same colour every time for the same seed', () => {
			expect(randomColor({ seed: 'repeat' }).asHex()).toBe(randomColor({ seed: 'repeat' }).asHex());
			expect(randomColor({ seed: 42 }).asHex()).toBe(randomColor({ seed: 42 }).asHex());
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
				expect(color).toBeInstanceOf(Color);
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

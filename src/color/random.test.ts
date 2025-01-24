import type { RandomColorOptions } from './random';
import randomColor from './random';

describe('RandomColor', () => {
	test('constructor initializes without errors', () => {
		expect(randomColor).toBeDefined();
	});

	describe('randomColor method', () => {
		test('returns correct color string for some test cases', () => {
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

		test('consistent color generation with a seed', () => {
			const color1 = randomColor({ seed: 'consistentSeed' });
			const color2 = randomColor({ seed: 'consistentSeed' });
			expect(color1.asHex()).toBe(color2.asHex());
		});

		test('different color generation without a seed', () => {
			const color1 = randomColor({ seed: 'seed1' });
			const color2 = randomColor({ seed: 'seed2' });
			expect(color1.asHex()).not.toBe(color2.asHex());
		});
	});
});

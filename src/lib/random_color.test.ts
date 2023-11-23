import type { RandomColorOptions } from './random_color.js';
import { RandomColor } from './random_color.js';

describe('RandomColor', () => {
	let randomColor: RandomColor;

	beforeEach(() => {
		randomColor = new RandomColor();
	});

	test('constructor initializes without errors', () => {
		expect(randomColor).toBeDefined();
	});

	describe('randomColor method', () => {
		test('returns a valid color string', () => {
			const color = randomColor.randomColor();
			expect(isValidHSLA(color)).toBeTruthy();
		});

		test('returns correct color string for some test cases', () => {
			expect(randomColor.randomColor({ hue: 'red' })).toBe('hsl(343,65%,51%)');
			expect(randomColor.randomColor({ hue: 120 })).toBe('hsl(120,77%,32%)');
			expect(randomColor.randomColor({ luminosity: 'dark' })).toBe('hsl(135,96%,31%)');
			expect(randomColor.randomColor({ saturation: 'strong' })).toBe('hsl(193,100%,24%)');
			expect(randomColor.randomColor({ opacity: 0.5 })).toBe('hsla(242,55%,42%,0.5)');
			expect(randomColor.randomColor({ seed: 'testSeed' })).toBe('hsl(185,90%,23%)');
		});

		test('consistent color generation with a seed', () => {
			const options: RandomColorOptions = { seed: 'consistentSeed' };
			const color1 = randomColor.randomColor(options);
			const color2 = randomColor.randomColor(options);
			expect(color1).toBe(color2);
		});

		test('different color generation without a seed', () => {
			const color1 = randomColor.randomColor();
			const color2 = randomColor.randomColor();
			expect(color1).not.toBe(color2);
		});
	});
});

function isValidHSLA(textColor: string): boolean {
	let match, h, s, l, a;
	if (textColor.startsWith('hsla')) {
		match = /^hsla\((\d+),(\d+)%,(\d+)%,([.0-9]+)\)$/.exec(textColor);
		if (match == null) return false;
		[, h, s, l, a] = match;
	} else {
		match = /^hsl\((\d+),(\d+)%,(\d+)%\)$/.exec(textColor);
		if (match == null) return false;
		[, h, s, l] = match;
		a = '1';
	}

	if (!check(h, 0, 360)) return false;
	if (!check(s, 0, 100)) return false;
	if (!check(l, 0, 100)) return false;
	if (!check(a, 0, 1)) return false;

	return true;

	function check(textNumber: string, min: number, max: number): boolean {
		const value = parseFloat(textNumber);
		if (value < min) return false;
		if (value > max) return false;
		return true;
	}
}

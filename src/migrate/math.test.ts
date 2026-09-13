import { describe, expect, it } from 'vitest';
import { clamp01, colorDistance, luminance, seededRandom, solveLinear, toHex, toLab } from './math.js';

describe('solveLinear', () => {
	it('solves a system that needs pivoting', () => {
		const x = solveLinear(
			[
				[0, 2, 1],
				[1, 1, 0],
				[2, 0, 3],
			],
			[7, 3, 11]
		);
		x.forEach((v, i) => expect(v).toBeCloseTo([1, 2, 3][i], 9));
	});

	it('yields 0 for the unknowns of a singular system instead of NaN', () => {
		const x = solveLinear(
			[
				[1, 0],
				[0, 0],
			],
			[2, 0]
		);
		expect(x).toEqual([2, 0]);
	});
});

describe('seededRandom', () => {
	it('is deterministic and in [0, 1)', () => {
		const a = seededRandom(42);
		const b = seededRandom(42);
		const values = Array.from({ length: 100 }, () => a());
		expect(values).toEqual(Array.from({ length: 100 }, () => b()));
		expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
		expect(seededRandom(43)()).not.toBe(values[0]);
	});
});

describe('colours', () => {
	it('converts to CIELAB', () => {
		toLab([1, 1, 1, 1]).forEach((v, i) => expect(v).toBeCloseTo([100, 0, 0][i], 1));
		toLab([0, 0, 0, 1]).forEach((v, i) => expect(v).toBeCloseTo([0, 0, 0][i], 1));
	});

	it('measures distance, alpha included', () => {
		expect(colorDistance([0.5, 0.5, 0.5, 1], [0.5, 0.5, 0.5, 1])).toBe(0);
		expect(colorDistance([0, 0, 0, 1], [1, 1, 1, 1])).toBeCloseTo(100, 0);
		expect(colorDistance([1, 1, 1, 1], [1, 1, 1, 0.5])).toBeCloseTo(50, 5);
	});

	it('computes luminance', () => {
		expect(luminance([1, 1, 1, 1])).toBeCloseTo(1);
		expect(luminance([0, 0, 0, 1])).toBe(0);
	});

	it('formats hex, with alpha only when not opaque, clamping out-of-range values', () => {
		expect(toHex([1, 0.5, 0, 1])).toBe('#FF8000');
		expect(toHex([1, 1, 1, 0.8])).toBe('#FFFFFFCC');
		expect(toHex([2, -1, 0.999, 1])).toBe('#FF00FF');
		expect(clamp01(-0.1)).toBe(0);
		expect(clamp01(1.1)).toBe(1);
	});
});

import { describe, expect, it } from 'vitest';
import { clamp, formatFloat, mod } from './utils.js';

describe('clamp function', () => {
	it('returns the number itself if within the range', () => {
		expect(clamp(5, 0, 10)).toBe(5);
		expect(clamp(0, -10, 10)).toBe(0);
		expect(clamp(-5, -10, 0)).toBe(-5);
	});

	it('returns the minimum value if number is below range', () => {
		expect(clamp(-5, 0, 10)).toBe(0);
		expect(clamp(-15, -10, 10)).toBe(-10);
	});

	it('returns the maximum value if number is above range', () => {
		expect(clamp(15, 0, 10)).toBe(10);
		expect(clamp(20, -10, 10)).toBe(10);
	});

	it('handles edge cases with boundaries', () => {
		expect(clamp(0, 0, 10)).toBe(0);
		expect(clamp(10, 0, 10)).toBe(10);
	});
});

describe('mod function', () => {
	it('returns the correct modulus for positive numbers', () => {
		expect(mod(10, 3)).toBe(1);
		expect(mod(15, 4)).toBe(3);
	});

	it('handles negative numbers correctly', () => {
		expect(mod(-10, 3)).toBe(2);
		expect(mod(-15, 4)).toBe(1);
	});

	it('returns 0 for numbers that are exact multiples of max', () => {
		expect(mod(9, 3)).toBe(0);
		expect(mod(20, 5)).toBe(0);
	});

	it('returns 0 for zero input with positive max', () => {
		expect(mod(0, 5)).toBe(0);
	});

	it('handles edge cases with 1 as max', () => {
		expect(mod(10, 1)).toBe(0);
		expect(mod(-10, 1)).toBe(0);
	});
});
describe('formatFloat function', () => {
	it('formats numbers with specified precision correctly', () => {
		expect(formatFloat(123.4567, 2)).toBe('123.46');
		expect(formatFloat(123.4, 2)).toBe('123.4');
		expect(formatFloat(123.0, 2)).toBe('123');
	});

	it('handles trailing zeros correctly', () => {
		expect(formatFloat(0.000123, 6)).toBe('0.000123');
		expect(formatFloat(0.0001, 6)).toBe('0.0001');
		expect(formatFloat(10.0, 1)).toBe('10');
	});

	it('handles edge cases with small numbers and high precision', () => {
		expect(formatFloat(0.0000001234, 10)).toBe('0.0000001234');
		expect(formatFloat(0.0000001234, 5)).toBe('0');
	});

	it('handles large numbers correctly', () => {
		expect(formatFloat(123456789.123456, 3)).toBe('123456789.123');
		expect(formatFloat(123456789.0, 5)).toBe('123456789');
	});

	it('handles zero and negative numbers correctly', () => {
		expect(formatFloat(0, 2)).toBe('0');
		expect(formatFloat(-123.456, 1)).toBe('-123.5');
		expect(formatFloat(-0.000123, 6)).toBe('-0.000123');
	});

	it('handles no unnecessary decimal points', () => {
		expect(formatFloat(10.0, 3)).toBe('10');
		expect(formatFloat(10.01, 3)).toBe('10.01');
	});
});

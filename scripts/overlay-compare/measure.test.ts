import { describe, expect, it } from 'vitest';
import { brightness, diff, isolate, maxValue, overlap } from './measure.js';
import type { StyleSpecification } from '../../src/types/index.js';

const frame = (...reds: number[]) => Uint8Array.from(reds.flatMap((r) => [r, r, r, 255]));

describe('isolate', () => {
	const style = {
		version: 8,
		sources: {},
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': '#123456' } },
			{ id: 'a', type: 'line', source: 's', paint: { 'line-color': '#ff0000', 'line-opacity': 0.5 } },
			{ id: 'b', type: 'line', source: 's', paint: { 'line-color': '#00ff00' } },
			{ id: 'c', type: 'symbol', source: 's' },
		],
	} as StyleSpecification;

	it('keeps only the listed lines, white over black, with their opacity', () => {
		const out = isolate(style, ['a', 'c']);
		expect(out.layers).toEqual([
			{ id: 'background', type: 'background', paint: { 'background-color': '#000000' } },
			{ id: 'a', type: 'line', source: 's', paint: { 'line-color': '#ffffff', 'line-opacity': 0.5 } },
		]);
	});

	it('leaves the input untouched', () => {
		isolate(style, ['a']);
		expect((style.layers[1] as { paint: Record<string, unknown> }).paint['line-color']).toBe('#ff0000');
	});
});

describe('brightness and maxValue', () => {
	it('sum and peak the red channel', () => {
		expect(brightness(frame(0, 10, 200))).toBe(210);
		expect(maxValue(frame(0, 10, 200))).toBe(200);
	});
});

describe('overlap', () => {
	it('counts covered pixels above the single-pass ceiling, ignoring fringes and slack', () => {
		// 4 is a fringe; 100 and 103 are one pass (ceiling 100, slack 3); 104 and 160 are drawn twice
		expect(overlap(frame(0, 4, 100, 103, 104, 160), 100)).toEqual({ covered: 4, over: 2, max: 160 });
	});
});

describe('diff', () => {
	it('counts pixels moved by more than 8 and marks them', () => {
		const d = diff(frame(0, 0, 0, 0), frame(0, 8, 9, 200));
		expect(d.share).toBe(0.5);
		expect(d.max).toBe(200);
		expect([...d.heat.slice(8, 12)]).toEqual([255, 0, 255, 255]);
		expect([...d.heat.slice(4, 8)]).toEqual([170, 170, 170, 255]);
	});

	it('refuses frames of different sizes', () => {
		expect(() => diff(frame(0), frame(0, 0))).toThrow();
	});
});

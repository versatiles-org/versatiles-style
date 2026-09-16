import { describe, expect, it } from 'vitest';
import { SPACES, SPACE_NAMES, channelIndex, channelNames, isSpace, normalize } from './space.js';
import type { Space } from './space.js';

describe('SPACES', () => {
	it('lists the six spaces', () => {
		expect([...SPACE_NAMES]).toStrictEqual(['srgb', 'hsl', 'hwb', 'hsv', 'oklab', 'oklch']);
	});

	it.each(SPACE_NAMES)('%s has three channels with distinct names', (space) => {
		const names = channelNames(space);
		expect(names).toHaveLength(3);
		expect(new Set(names).size).toBe(3);
	});

	it.each(SPACE_NAMES)('%s gives every channel a range that contains its minimum', (space) => {
		for (const channel of SPACES[space].channels) {
			expect(channel.min, channel.name).toBeLessThan(channel.max);
		}
	});

	it('never allows a percentage on a hue channel', () => {
		// CSS Color 4 §4.3: <hue> is a number or an angle, never a percentage.
		for (const space of SPACE_NAMES) {
			for (const channel of SPACES[space].channels) {
				if (channel.hue) expect(channel.percent, `${space}.${channel.name}`).toBeUndefined();
			}
		}
	});

	it('gives every non-hue channel a percentage reference', () => {
		for (const space of SPACE_NAMES) {
			for (const channel of SPACES[space].channels) {
				if (!channel.hue) expect(channel.percent, `${space}.${channel.name}`).toBeGreaterThan(0);
			}
		}
	});
});

describe('isSpace()', () => {
	it.each(SPACE_NAMES)('accepts %s', (space) => expect(isSpace(space)).toBe(true));

	it.each(['rgb', 'lab', 'oklchh', 'SRGB', '', 'toString', 'constructor'])('rejects %j', (value) => {
		expect(isSpace(value)).toBe(false);
	});
});

describe('channelIndex()', () => {
	it('finds channels by their CSS letter', () => {
		expect(channelIndex('oklch', 'l')).toBe(0);
		expect(channelIndex('oklch', 'c')).toBe(1);
		expect(channelIndex('oklch', 'h')).toBe(2);
		expect(channelIndex('srgb', 'b')).toBe(2);
		expect(channelIndex('hwb', 'b')).toBe(2);
	});

	it('returns undefined for a channel the space does not have', () => {
		expect(channelIndex('srgb', 'h')).toBeUndefined();
		expect(channelIndex('oklab', 'c')).toBeUndefined();
	});
});

describe('normalize()', () => {
	it('clamps sRGB channels into 0–255', () => {
		expect(normalize('srgb', [-10, 300, 128])).toStrictEqual([0, 255, 128]);
	});

	it('clamps percentage channels into 0–100', () => {
		expect(normalize('hsl', [0, -5, 150])).toStrictEqual([0, 0, 100]);
		expect(normalize('hwb', [0, 120, -1])).toStrictEqual([0, 100, 0]);
	});

	it('wraps hues instead of clamping them', () => {
		expect(normalize('hsl', [370, 50, 50])[0]).toBe(10);
		expect(normalize('hsl', [-90, 50, 50])[0]).toBe(270);
		expect(normalize('hsl', [720, 50, 50])[0]).toBe(0);
		expect(normalize('oklch', [0.5, 0.1, -30])[2]).toBe(330);
	});

	it('leaves OKLab opponent axes unbounded but clamps its lightness', () => {
		// An out-of-gamut colour is a legitimate intermediate result; clamping a/b would bend its hue.
		expect(normalize('oklab', [0.5, -3, 4])).toStrictEqual([0.5, -3, 4]);
		expect(normalize('oklab', [2, 0.1, 0.1])[0]).toBe(1);
		expect(normalize('oklab', [-1, 0.1, 0.1])[0]).toBe(0);
	});

	it('clamps OKLCh chroma at the bottom only', () => {
		expect(normalize('oklch', [0.5, -0.2, 30])[1]).toBe(0);
		expect(normalize('oklch', [0.5, 5, 30])[1]).toBe(5);
	});

	it('maps NaN to zero in every channel, including the unbounded ones', () => {
		expect(normalize('srgb', [NaN, NaN, NaN])).toStrictEqual([0, 0, 0]);
		expect(normalize('hsl', [NaN, NaN, NaN])).toStrictEqual([0, 0, 0]);
		expect(normalize('oklab', [NaN, NaN, NaN])).toStrictEqual([0, 0, 0]);
		expect(normalize('oklch', [NaN, NaN, NaN])).toStrictEqual([0, 0, 0]);
	});

	it('is idempotent', () => {
		const cases: [Space, [number, number, number]][] = [
			['srgb', [-10, 300, 128]],
			['hsl', [370, -5, 150]],
			['oklch', [2, -0.2, -30]],
		];
		for (const [space, coords] of cases) {
			const once = normalize(space, coords);
			expect(normalize(space, once)).toStrictEqual(once);
		}
	});

	it('leaves an in-range colour untouched', () => {
		expect(normalize('srgb', [10, 20, 30])).toStrictEqual([10, 20, 30]);
		expect(normalize('oklch', [0.5, 0.1, 200])).toStrictEqual([0.5, 0.1, 200]);
	});
});

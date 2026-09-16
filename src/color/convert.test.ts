import { describe, expect, it } from 'vitest';
import { POWERLESS_CHROMA, convert, isPowerlessHue, linearToSrgb, srgbToLinear } from './convert.js';
import { normalize } from './space.js';
import type { Coords, Space } from './space.js';

/** mulberry32 — a seeded generator, so a failing sample can be reproduced from its seed alone. */
function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function randomSrgb(random: () => number): Coords {
	return [random() * 255, random() * 255, random() * 255];
}

const maxError = (a: Coords, b: Coords) => Math.max(...a.map((value, i) => Math.abs(value - b[i])));

describe('sRGB transfer function', () => {
	it('round-trips', () => {
		const random = seeded(1);
		for (let i = 0; i < 1000; i++) {
			const value = random();
			expect(linearToSrgb(srgbToLinear(value))).toBeCloseTo(value, 12);
		}
	});

	it('pins its ends and the linear/power join', () => {
		expect(srgbToLinear(0)).toBe(0);
		expect(srgbToLinear(1)).toBeCloseTo(1, 15);
		expect(linearToSrgb(0)).toBe(0);
		expect(linearToSrgb(1)).toBeCloseTo(1, 15);
		// The two branches must meet at the join, or dark colours get a visible step. They meet to within
		// ~6e-8 rather than exactly, because sRGB's own constants disagree at that scale:
		// 12.92 × 0.0031308 is 0.040449936, not the 0.04045 the spec names as the threshold.
		expect(srgbToLinear(0.04045)).toBeCloseTo(0.0031308, 7);
		expect(linearToSrgb(0.0031308)).toBeCloseTo(0.04045, 6);
	});
});

describe('convert()', () => {
	it('returns the same coordinates when the spaces match', () => {
		const coords: Coords = [1, 2, 3];
		expect(convert(coords, 'oklab', 'oklab')).toBe(coords);
	});

	const roundTripError = (space: Space, seed: number, samples = 10000): number => {
		const random = seeded(seed);
		let worst = 0;
		for (let i = 0; i < samples; i++) {
			const rgb = randomSrgb(random);
			worst = Math.max(worst, maxError(convert(convert(rgb, 'srgb', space), space, 'srgb'), rgb));
		}
		return worst;
	};

	it.each(['srgb', 'hsl', 'hwb', 'hsv'] as Space[])('round-trips sRGB through %s exactly', (space) => {
		// 1e-9 of a 0–255 channel: nine orders of magnitude below what 8-bit output can express
		expect(roundTripError(space, 42)).toBeLessThan(1e-9);
	});

	it.each(['oklab', 'oklch'] as Space[])('round-trips sRGB through %s to well under an 8-bit step', (space) => {
		// Not exact, and not fixable here: Ottosson's published OKLab matrices are each rounded to ten
		// digits, so the inverse is not the exact inverse of the forward. The drift is ~4e-4 of a channel,
		// about 1/2000 of one 8-bit step — and it is the same matrix pair `scripts/lib/theme-generator.ts`
		// already uses, so adopting this module leaves every generated theme byte-identical.
		expect(roundTripError(space, 42)).toBeLessThan(1e-3);
	});

	it.each(['hsl', 'hwb', 'hsv'] as Space[])('round-trips %s coordinates through sRGB', (space) => {
		const random = seeded(7);
		let worst = 0;
		for (let i = 0; i < 10000; i++) {
			// every coordinate of these three spaces is inside the sRGB gamut, so nothing is lost
			const coords = normalize(space, [random() * 360, random() * 100, random() * 100]);
			if (isPowerlessHue(space, coords)) continue; // a hue that carries nothing cannot survive, by design
			worst = Math.max(worst, maxError(convert(convert(coords, space, 'srgb'), 'srgb', space), coords));
		}
		expect(worst).toBeLessThan(1e-9);
	});

	it('keeps OKLab ↔ OKLCh out of sRGB, so out-of-gamut colours survive', () => {
		// chroma 0.3 at this lightness is far outside sRGB; a detour through sRGB would clip it
		const oklab: Coords = [0.7, 0.3, -0.1];
		const round = convert(convert(oklab, 'oklab', 'oklch'), 'oklch', 'oklab');
		expect(maxError(round, oklab)).toBeLessThan(1e-12);

		const oklch: Coords = [0.55, 0.37, 142];
		const back = convert(convert(oklch, 'oklch', 'oklab'), 'oklab', 'oklch');
		expect(maxError(back, oklch)).toBeLessThan(1e-12);
	});

	it('does not clamp: an out-of-gamut colour converts to sRGB outside 0–255', () => {
		// a green more saturated than sRGB can show — the red channel has to go negative to express it
		expect(Math.min(...convert([0.55, 0.37, 142], 'oklch', 'srgb'))).toBeLessThan(0);
		// and a lightness above white overshoots the top
		expect(Math.max(...convert([1.2, 0.05, 90], 'oklch', 'srgb'))).toBeGreaterThan(255);
	});
});

describe('anchors', () => {
	const cases: [string, Coords, Partial<Record<Space, Coords>>][] = [
		[
			'red',
			[255, 0, 0],
			{
				hsl: [0, 100, 50],
				hsv: [0, 100, 100],
				hwb: [0, 0, 0],
				oklab: [0.6279554, 0.2248631, 0.1258463],
				oklch: [0.6279554, 0.2576833, 29.2338851],
			},
		],
		['lime', [0, 255, 0], { hsl: [120, 100, 50], hsv: [120, 100, 100], hwb: [120, 0, 0] }],
		['blue', [0, 0, 255], { hsl: [240, 100, 50], hsv: [240, 100, 100], hwb: [240, 0, 0] }],
		['white', [255, 255, 255], { hsl: [0, 0, 100], hsv: [0, 0, 100], hwb: [0, 100, 0], oklab: [1, 0, 0] }],
		['black', [0, 0, 0], { hsl: [0, 0, 0], hsv: [0, 0, 0], hwb: [0, 0, 100], oklab: [0, 0, 0] }],
		[
			'mid grey',
			[128, 128, 128],
			{ hsl: [0, 0, 50.1960784], hsv: [0, 0, 50.1960784], hwb: [0, 50.1960784, 49.8039216] },
		],
		['cyan', [0, 255, 255], { hsl: [180, 100, 50], hwb: [180, 0, 0] }],
		['a dark olive', [64, 64, 0], { hsl: [60, 100, 12.5490196], hsv: [60, 100, 25.0980392] }],
	];

	for (const [name, rgb, expected] of cases) {
		for (const [space, coords] of Object.entries(expected) as [Space, Coords][]) {
			it(`${name} in ${space}`, () => {
				const actual = convert(rgb, 'srgb', space);
				for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(coords[i], 6);
			});

			it(`${name} from ${space}`, () => {
				// 3 digits, not more: the expectations above are written to 7 decimals, and converting a
				// rounded OKLab triple back lands ~1e-4 from the exact channel
				const actual = convert(coords, space, 'srgb');
				for (let i = 0; i < 3; i++) expect(actual[i]).toBeCloseTo(rgb[i], 3);
			});
		}
	}

	it('gives white an OKLab lightness of exactly 1 and no chroma', () => {
		const [l, a, b] = convert([255, 255, 255], 'srgb', 'oklab');
		expect(l).toBeCloseTo(1, 6);
		expect(Math.hypot(a, b)).toBeLessThan(1e-7);
	});
});

describe('isPowerlessHue()', () => {
	it('is false for the spaces without a hue', () => {
		expect(isPowerlessHue('srgb', [255, 0, 0])).toBe(false);
		expect(isPowerlessHue('oklab', [0.5, 0.2, 0.1])).toBe(false);
	});

	it('reports grey, white and black as powerless in every polar space', () => {
		for (const rgb of [
			[128, 128, 128],
			[255, 255, 255],
			[0, 0, 0],
		] as Coords[]) {
			for (const space of ['hsl', 'hsv', 'hwb', 'oklch'] as Space[]) {
				expect(isPowerlessHue(space, convert(rgb, 'srgb', space)), `${space} ${rgb.join()}`).toBe(true);
			}
		}
	});

	it('reports a saturated colour as having a real hue', () => {
		for (const space of ['hsl', 'hsv', 'hwb', 'oklch'] as Space[]) {
			expect(isPowerlessHue(space, convert([255, 0, 0], 'srgb', space)), space).toBe(false);
		}
	});

	it('collapses a powerless OKLCh hue to 0 rather than reading rounding noise', () => {
		// the bug this guards: v5 read grey's hue as a real 0°, so tinting toward white went red
		const [, chroma, hue] = convert([128, 128, 128], 'srgb', 'oklch');
		expect(chroma).toBeLessThanOrEqual(POWERLESS_CHROMA);
		expect(hue).toBe(0);
	});
});

import { describe, expect, it } from 'vitest';
import { calcSDFFromAlpha } from './sdf.js';

// The signed-distance-field math (Felzenszwalb–Huttenlocher) had no tests. It underpins icon
// rendering, so silent numerical regressions would degrade every sprite. These assert the sign
// convention (negative inside, positive outside) and exact distances on hand-checkable patterns.

// Build an RGBA buffer from a list of alpha bytes (only the alpha channel matters to the SDF).
function rgbaFromAlpha(alphas: number[]): Buffer {
	const buf = Buffer.alloc(alphas.length * 4);
	alphas.forEach((a, i) => (buf[i * 4 + 3] = a));
	return buf;
}

describe('calcSDFFromAlpha', () => {
	it('is negative everywhere inside a fully-opaque image', () => {
		const sdf = calcSDFFromAlpha(rgbaFromAlpha([255, 255, 255, 255]), 4, 1);
		expect([...sdf].every((v) => v < 0)).toBe(true);
	});

	it('is positive everywhere outside a fully-transparent image', () => {
		const sdf = calcSDFFromAlpha(rgbaFromAlpha([0, 0, 0, 0]), 4, 1);
		expect([...sdf].every((v) => v > 0)).toBe(true);
	});

	it('yields exact signed pixel distances across a 1-D edge', () => {
		// pixels: [opaque, opaque, transparent, transparent, transparent]
		// distance to the inside/outside boundary: −2 −1 | +1 +2 +3
		const sdf = calcSDFFromAlpha(rgbaFromAlpha([255, 255, 0, 0, 0]), 5, 1);
		expect([...sdf]).toStrictEqual([-2, -1, 1, 2, 3]);
	});

	it('is symmetric for a mirrored edge', () => {
		const sdf = calcSDFFromAlpha(rgbaFromAlpha([0, 0, 0, 255, 255]), 5, 1);
		expect([...sdf]).toStrictEqual([3, 2, 1, -1, -2]);
	});

	it('produces the right count and finite values for a 2-D grid', () => {
		// 2×2 with one opaque corner.
		const sdf = calcSDFFromAlpha(rgbaFromAlpha([255, 0, 0, 0]), 2, 2);
		expect(sdf).toHaveLength(4);
		expect([...sdf].every((v) => Number.isFinite(v))).toBe(true);
		expect(sdf[0]).toBeLessThan(0); // the opaque pixel is inside
		expect(sdf[3]).toBeGreaterThan(0); // the far corner is outside
	});
});

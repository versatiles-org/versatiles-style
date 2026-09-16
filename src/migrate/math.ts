import type { RGBA } from './evaluate.js';

/**
 * The small amount of numerics `deriveOptions` needs: a linear solver, a seeded random source and a
 * perceptual colour distance. Dense and naive on purpose — the largest system is a few hundred unknowns.
 */

/** Solve `M x = rhs` in place by Gaussian elimination with partial pivoting. Singular pivots yield 0. */
export function solveLinear(M: number[][], rhs: number[]): number[] {
	const n = rhs.length;
	for (let col = 0; col < n; col++) {
		let pivot = col;
		for (let row = col + 1; row < n; row++) if (Math.abs(M[row][col]) > Math.abs(M[pivot][col])) pivot = row;
		[M[col], M[pivot]] = [M[pivot], M[col]];
		[rhs[col], rhs[pivot]] = [rhs[pivot], rhs[col]];
		const p = M[col][col];
		if (Math.abs(p) < 1e-12) continue;
		for (let row = col + 1; row < n; row++) {
			const factor = M[row][col] / p;
			if (factor === 0) continue;
			for (let k = col; k < n; k++) M[row][k] -= factor * M[col][k];
			rhs[row] -= factor * rhs[col];
		}
	}
	const x = new Array<number>(n).fill(0);
	for (let row = n - 1; row >= 0; row--) {
		const p = M[row][row];
		if (Math.abs(p) < 1e-12) continue;
		let sum = rhs[row];
		for (let k = row + 1; k < n; k++) sum -= M[row][k] * x[k];
		x[row] = sum / p;
	}
	return x;
}

export function zeros(rows: number, cols: number): number[][] {
	return Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
}

/** Mulberry32: a tiny seeded generator, so calibration — and with it every guess — is deterministic. */
export function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function srgbToLinear(c: number): number {
	return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** CIELAB (D65) of an sRGB colour, alpha ignored. */
export function toLab([r, g, b]: RGBA): [number, number, number] {
	const lr = srgbToLinear(r);
	const lg = srgbToLinear(g);
	const lb = srgbToLinear(b);
	const x = (0.4124 * lr + 0.3576 * lg + 0.1805 * lb) / 0.95047;
	const y = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
	const z = (0.0193 * lr + 0.1192 * lg + 0.9505 * lb) / 1.08883;
	const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 / 116) * t + 16 / 116);
	return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** Relative luminance, 0–1. */
export function luminance([r, g, b]: RGBA): number {
	return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/**
 * How different two colours look: ΔE76 in CIELAB, plus alpha, scaled so a full alpha step weighs like
 * the distance from black to white. About 2 is the threshold of a visible difference.
 *
 * This is the one piece of colour maths that did not move to `src/color` when the colour library was
 * rewritten, and it stays deliberately. The obvious replacement is `Color.deltaEOK`, but the two
 * metrics are not a rescale of each other: across the palette colours, 81% of the pairs that sit near
 * the threshold are classified differently, all in the same direction — ΔE-OK at 0.02 calls "the same"
 * a great many pairs that ΔE76 at 2 calls different. Since `OVERRIDE_DISTANCE` in `derive.ts` decides
 * from this number whether an option needs a colour override at all, swapping metrics would quietly
 * change what `deriveOptions()` returns. If that is ever wanted, retune the thresholds against real
 * styles rather than by dividing by 100.
 */
export function colorDistance(a: RGBA, b: RGBA): number {
	const [l1, a1, b1] = toLab(a);
	const [l2, a2, b2] = toLab(b);
	return Math.hypot(l1 - l2, a1 - a2, b1 - b2) + 100 * Math.abs(a[3] - b[3]);
}

/** `#RRGGBB`, or `#RRGGBBAA` when not opaque. */
export function toHex([r, g, b, a]: RGBA): string {
	const byte = (v: number) =>
		Math.round(clamp01(v) * 255)
			.toString(16)
			.padStart(2, '0');
	const hex = '#' + byte(r) + byte(g) + byte(b);
	return (Math.round(clamp01(a) * 255) === 255 ? hex : hex + byte(a)).toUpperCase();
}

/**
 * Colour operations that are about more than one colour, or about the edge of what a screen can show:
 * perceptual distance, mixing, WCAG contrast, and gamut mapping.
 */

import { convert, srgbToLinear } from './convert.js';
import { SPACES, normalize } from './space.js';
import type { Coords, Space } from './space.js';

/**
 * Perceptual distance in OKLab (CSS Color 4 §20): plain Euclidean distance, which is what OKLab was
 * built to make meaningful.
 */
export function deltaEOK(a: Coords, b: Coords, spaceA: Space = 'oklab', spaceB: Space = 'oklab'): number {
	const [l1, a1, b1] = convert(a, spaceA, 'oklab');
	const [l2, a2, b2] = convert(b, spaceB, 'oklab');
	return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Just-noticeable difference, in OKLab units (CSS Color 4 §14.2.2).
 *
 * 0.02 rather than CIELAB's 2 because OKLab's lightness runs 0–1 where CIELAB's runs 0–100.
 */
const JND = 0.02;

/** When the chroma search interval is narrower than this, stop (CSS Color 4 §14.2.2). */
const EPSILON = 0.0001;

/** How far outside 0–255 a channel may sit and still count as showable — a rounding allowance, not a gamut. */
const GAMUT_TOLERANCE = 255e-6;

/** Whether these sRGB coordinates are inside the gamut, i.e. a screen can actually show this colour. */
export function inGamut(srgb: Coords): boolean {
	return srgb.every((value) => value >= -GAMUT_TOLERANCE && value <= 255 + GAMUT_TOLERANCE);
}

/** Every channel forced into 0–255, hue and lightness be damned. */
function clip(srgb: Coords): Coords {
	return [
		Math.min(255, Math.max(0, srgb[0])),
		Math.min(255, Math.max(0, srgb[1])),
		Math.min(255, Math.max(0, srgb[2])),
	];
}

/**
 * The closest sRGB colour a screen can show, by CSS Color 4 §14.2.1 (binary search with local MINDE).
 *
 * Chroma is reduced in OKLCh — holding lightness and hue — until the colour fits, rather than clipping
 * each channel independently, which would swing the hue: clipping `oklch(0.7 0.4 145)` turns a vivid
 * green towards yellow, while reducing its chroma keeps it green.
 *
 * The "local MINDE" part is the refinement that matters near a concave part of the gamut: at each step
 * the clipped candidate is compared against the unclipped one, and if they are perceptually within a JND
 * the clipped colour is taken immediately. Without it, the search keeps desaturating past the point where
 * anyone could see a difference.
 *
 * An in-gamut colour is returned unchanged.
 */
export function toGamut(coords: Coords, space: Space): Coords {
	const direct = convert(coords, space, 'srgb');
	if (inGamut(direct)) return direct;

	const [lightness, chroma, hue] = convert(coords, space, 'oklch');
	// nothing above white or below black to search for
	if (lightness >= 1) return [255, 255, 255];
	if (lightness <= 0) return [0, 0, 0];

	let low = 0;
	let high = chroma;
	while (high - low > EPSILON) {
		const mid = (low + high) / 2;
		const candidate: Coords = [lightness, mid, hue];
		const srgb = convert(candidate, 'oklch', 'srgb');
		if (inGamut(srgb)) {
			low = mid;
			continue;
		}
		const clipped = clip(srgb);
		// close enough that reducing chroma further would cost more than the clipping does
		if (deltaEOK(clipped, candidate, 'srgb', 'oklch') < JND) return clipped;
		high = mid;
	}
	return clip(convert([lightness, low, hue], 'oklch', 'srgb'));
}

// ── mixing ────────────────────────────────────────────────────────────────────

/**
 * How to get from one hue to another (CSS Color 4 §13.5).
 *
 * Two hues sit on a circle, so there are always two ways round; which one is wanted is a design
 * decision, not a mathematical one. `shorter` takes the short arc — red to blue through magenta —
 * while `longer` takes the other, through yellow and green.
 */
export type HueMethod = 'shorter' | 'longer' | 'increasing' | 'decreasing';

export interface MixOptions {
	/** Where to interpolate. Default `oklab`, as CSS uses — it is the space that mixes without grey middles. */
	space?: Space;
	/** How to travel between the two hues, in a polar space. Default `shorter`. */
	hue?: HueMethod;
}

/** A colour as the operations here pass it around. */
export interface ColorValue {
	readonly space: Space;
	readonly coords: Coords;
	readonly alpha: number;
}

/** The pair of hues to interpolate between, adjusted per CSS Color 4 §13.5. */
function fixHues(from: number, to: number, method: HueMethod): [number, number] {
	const difference = to - from;
	switch (method) {
		case 'shorter':
			if (difference > 180) return [from + 360, to];
			if (difference < -180) return [from, to + 360];
			return [from, to];
		case 'longer':
			if (difference > 0 && difference < 180) return [from + 360, to];
			if (difference > -180 && difference <= 0) return [from, to + 360];
			return [from, to];
		case 'increasing':
			return to < from ? [from, to + 360] : [from, to];
		case 'decreasing':
			return from < to ? [from + 360, to] : [from, to];
	}
}

/**
 * `from` and `to` mixed, `t` of the way across (CSS Color 4 §13).
 *
 * Alpha is premultiplied before interpolating and divided out afterwards, so fading through a
 * translucent colour does not drag the result toward black — except on a hue channel, which is an angle
 * and has nothing to premultiply.
 */
export function mix(from: ColorValue, to: ColorValue, t = 0.5, options: MixOptions = {}): ColorValue {
	const space = options.space ?? 'oklab';
	const a = convert(from.coords, from.space, space);
	const b = convert(to.coords, to.space, space);
	const { channels } = SPACES[space];

	const alpha = from.alpha + (to.alpha - from.alpha) * t;
	const coords = [0, 1, 2].map((index) => {
		if (channels[index].hue) {
			const [start, end] = fixHues(a[index], b[index], options.hue ?? 'shorter');
			return start + (end - start) * t;
		}
		const start = a[index] * from.alpha;
		const end = b[index] * to.alpha;
		const mixed = start + (end - start) * t;
		return alpha === 0 ? 0 : mixed / alpha;
	}) as unknown as Coords;

	return { space, coords: normalize(space, coords), alpha };
}

// ── contrast ──────────────────────────────────────────────────────────────────

/** WCAG 2.1 relative luminance, 0 for black and 1 for white. */
export function luminance(coords: Coords, space: Space): number {
	const [r, g, b] = convert(coords, space, 'srgb');
	return 0.2126 * srgbToLinear(r / 255) + 0.7152 * srgbToLinear(g / 255) + 0.0722 * srgbToLinear(b / 255);
}

/**
 * WCAG 2.1 contrast ratio, from 1 (identical) to 21 (black against white).
 *
 * Alpha is ignored: a ratio is only meaningful between two things actually drawn, so composite a
 * translucent colour onto its background first.
 */
export function contrastRatio(a: ColorValue, b: ColorValue): number {
	const first = luminance(a.coords, a.space);
	const second = luminance(b.coords, b.space);
	const lighter = Math.max(first, second);
	const darker = Math.min(first, second);
	return (lighter + 0.05) / (darker + 0.05);
}

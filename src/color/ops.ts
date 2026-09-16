/**
 * Colour operations that are about more than one colour, or about the edge of what a screen can show.
 *
 * This file currently holds the part serialisation depends on — gamut mapping — plus the distance
 * measure it is defined in terms of. Mixing, contrast and the rest land here too.
 */

import { convert } from './convert.js';
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

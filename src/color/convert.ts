/**
 * Conversion between the six colour spaces.
 *
 * Hub and spoke, not every pair: each space converts to and from sRGB, and `convert` routes through it.
 * The one shortcut is OKLab ↔ OKLCh, which is the same colour in rectangular and polar form — sending it
 * through sRGB would clip anything outside the sRGB gamut, and out-of-gamut OKLCh is precisely what the
 * theme generator works in.
 *
 * Nothing here clamps. A conversion returns what the maths gives, including sRGB channels outside 0–255
 * for a colour no monitor can show; deciding what to do about that is `normalize`'s job at construction,
 * or gamut mapping's at output. Keeping the raw value is what lets a colour make a round trip through a
 * wider space and come back unharmed.
 *
 * sRGB channels are 0–255 (as CSS `rgb()` writes them), hue channels are degrees, the percentage channels
 * are 0–100, and OKLab/OKLCh lightness is 0–1.
 */

import type { Coords, Space } from './space.js';

// ── sRGB transfer function ────────────────────────────────────────────────────

/** sRGB → linear-light, on 0–1. */
export function srgbToLinear(value: number): number {
	return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Linear-light → sRGB, on 0–1. */
export function linearToSrgb(value: number): number {
	return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

// ── OKLab ─────────────────────────────────────────────────────────────────────

function srgbToOklab([r, g, b]: Coords): Coords {
	const lr = srgbToLinear(r / 255);
	const lg = srgbToLinear(g / 255);
	const lb = srgbToLinear(b / 255);
	const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
	const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
	const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

function oklabToSrgb([L, a, b]: Coords): Coords {
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255,
		linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255,
		linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255,
	];
}

/**
 * Chroma at or below which an OKLCh hue carries no information (CSS Color 4 §4.4.1).
 *
 * Below it `atan2` is reading rounding noise, so the hue is reported as 0 and `isPowerlessHue` says so.
 * Callers that rotate or adopt a hue must ask first: treating grey's hue as a real 0° is what made
 * tinting toward white or black push every colour red in v6.
 */
export const POWERLESS_CHROMA = 0.000004;

/** Saturation (0–100) at or below which an HSL or HSV hue carries no information. */
export const POWERLESS_SATURATION = 0.001;

/** Whiteness + blackness (0–100) at or above which an HWB hue carries no information. */
export const POWERLESS_WHITENESS = 99.999;

function oklabToOklch([L, a, b]: Coords): Coords {
	const c = Math.hypot(a, b);
	if (c <= POWERLESS_CHROMA) return [L, c, 0];
	const h = (Math.atan2(b, a) * 180) / Math.PI;
	return [L, c, h < 0 ? h + 360 : h];
}

function oklchToOklab([L, c, h]: Coords): Coords {
	const radians = (h * Math.PI) / 180;
	return [L, c * Math.cos(radians), c * Math.sin(radians)];
}

// ── HSL / HSV / HWB ───────────────────────────────────────────────────────────

/** Hue in degrees from sRGB components on 0–1; 0 when the colour is achromatic. */
function hueOf(r: number, g: number, b: number, max: number, delta: number): number {
	if (delta === 0) return 0;
	let h: number;
	if (max === r) h = ((g - b) / delta) % 6;
	else if (max === g) h = (b - r) / delta + 2;
	else h = (r - g) / delta + 4;
	h *= 60;
	return h < 0 ? h + 360 : h;
}

/** The fully saturated sRGB (0–1) of a hue — the corner of the colour solid HSL, HSV and HWB all sit on. */
function pureHue(h: number): [number, number, number] {
	const sector = ((((h % 360) + 360) % 360) / 60) % 6;
	const x = 1 - Math.abs((sector % 2) - 1);
	if (sector < 1) return [1, x, 0];
	if (sector < 2) return [x, 1, 0];
	if (sector < 3) return [0, 1, x];
	if (sector < 4) return [0, x, 1];
	if (sector < 5) return [x, 0, 1];
	return [1, 0, x];
}

/**
 * HSL is written with v6's exact arithmetic, not the equivalent chroma formulation used for HSV and HWB
 * below.
 *
 * `delta/(max+min)` and `delta/(1-|2l-1|)` are the same number in algebra and different numbers in
 * floating point, and the difference lands on a rounding boundary often enough to move 35 of the 388
 * palette colours by one 8-bit step. Nobody could see that, but it would show up as change in every
 * style diff and hide the changes that matter. Keeping v6's spelling keeps those diffs empty.
 */
function srgbToHsl([r, g, b]: Coords): Coords {
	const [R, G, B] = [r / 255, g / 255, b / 255];
	const min = Math.min(R, G, B);
	const max = Math.max(R, G, B);
	const delta = max - min;
	const l = (min + max) / 2;
	const s = max === min ? 0 : l <= 0.5 ? delta / (max + min) : delta / (2 - max - min);
	return [hueOf(R, G, B, max, delta), s * 100, l * 100];
}

function hslToSrgb([h, s, l]: Coords): Coords {
	const H = h / 360;
	const S = s / 100;
	const L = l / 100;
	if (S === 0) return [L * 255, L * 255, L * 255];

	const q = L < 0.5 ? L * (1 + S) : L + S - L * S;
	const p = 2 * L - q;
	const channel = (t: number): number => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	return [255 * channel(H + 1 / 3), 255 * channel(H), 255 * channel(H - 1 / 3)];
}

function srgbToHsv([r, g, b]: Coords): Coords {
	const [R, G, B] = [r / 255, g / 255, b / 255];
	const max = Math.max(R, G, B);
	const min = Math.min(R, G, B);
	const delta = max - min;
	const s = max === 0 ? 0 : delta / max;
	return [hueOf(R, G, B, max, delta), s * 100, max * 100];
}

function hsvToSrgb([h, s, v]: Coords): Coords {
	const S = s / 100;
	const V = v / 100;
	const c = V * S;
	const m = V - c;
	const [r, g, b] = pureHue(h);
	return [(r * c + m) * 255, (g * c + m) * 255, (b * c + m) * 255];
}

function srgbToHwb([r, g, b]: Coords): Coords {
	const [R, G, B] = [r / 255, g / 255, b / 255];
	const max = Math.max(R, G, B);
	const min = Math.min(R, G, B);
	return [hueOf(R, G, B, max, max - min), min * 100, (1 - max) * 100];
}

function hwbToSrgb([h, w, b]: Coords): Coords {
	const W = w / 100;
	const B = b / 100;
	// White and black that together fill the channel leave no room for the hue: the result is their ratio.
	if (W + B >= 1) {
		const grey = (W / (W + B)) * 255;
		return [grey, grey, grey];
	}
	const span = 1 - W - B;
	const [r, g, bl] = pureHue(h);
	return [(r * span + W) * 255, (g * span + W) * 255, (bl * span + W) * 255];
}

// ── the graph ─────────────────────────────────────────────────────────────────

function toSrgb(space: Space, coords: Coords): Coords {
	switch (space) {
		case 'srgb':
			return coords;
		case 'hsl':
			return hslToSrgb(coords);
		case 'hwb':
			return hwbToSrgb(coords);
		case 'hsv':
			return hsvToSrgb(coords);
		case 'oklab':
			return oklabToSrgb(coords);
		case 'oklch':
			return oklabToSrgb(oklchToOklab(coords));
	}
}

function fromSrgb(space: Space, coords: Coords): Coords {
	switch (space) {
		case 'srgb':
			return coords;
		case 'hsl':
			return srgbToHsl(coords);
		case 'hwb':
			return srgbToHwb(coords);
		case 'hsv':
			return srgbToHsv(coords);
		case 'oklab':
			return srgbToOklab(coords);
		case 'oklch':
			return oklabToOklch(srgbToOklab(coords));
	}
}

/** `coords`, read in `from`, expressed in `to`. Returns the input array itself when the spaces match. */
export function convert(coords: Coords, from: Space, to: Space): Coords {
	if (from === to) return coords;
	// the polar/rectangular pair is one space in two notations: never launder it through sRGB
	if (from === 'oklab' && to === 'oklch') return oklabToOklch(coords);
	if (from === 'oklch' && to === 'oklab') return oklchToOklab(coords);
	return fromSrgb(to, toSrgb(from, coords));
}

/**
 * Whether this colour's hue channel is reading noise rather than a hue — grey, white and black in every
 * polar space, plus anything whose chroma has collapsed.
 *
 * Always `false` for the two spaces with no hue channel.
 */
export function isPowerlessHue(space: Space, coords: Coords): boolean {
	switch (space) {
		case 'hsl':
		case 'hsv':
			return coords[1] <= POWERLESS_SATURATION;
		case 'hwb':
			return coords[1] + coords[2] >= POWERLESS_WHITENESS;
		case 'oklch':
			return coords[1] <= POWERLESS_CHROMA;
		default:
			return false;
	}
}

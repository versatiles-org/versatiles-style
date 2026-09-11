/**
 * Derives the nine non-reference themes from `colorful` (light).
 *
 * `colorful` is maintained by hand and is the reference. Every other theme — the light `natural`,
 * `muted`, `gray` and `toner`, and all five dark themes — is generated from it, so they keep its
 * working relationships: each colour takes colorful's hue, a chroma relative to colorful's, and the
 * lightness at which its contrast against the land matches colorful's, scaled per theme.
 *
 * Contrast is WCAG relative luminance, taken "signed": above 1 when a colour (composited over its
 * background) is lighter than the background, below 1 when darker. Lightness is solved in OKLCH, so a
 * near-white tint does not turn into a vivid colour when it is darkened.
 *
 * Dark themes use the same scale against a dark land: water darker than the land, everything else
 * lighter, and streets lighter than their casings.
 *
 * Hues come from colorful and settings from `THEMES`, never from the tables in src/themes, so running
 * the generator twice gives the same result. `npm run generate-themes` writes those tables, and a unit
 * test fails when they and the generator disagree.
 */

import { osm } from '../../src/index.js';
import type { Palette, ResolvedColors } from '../../src/options/index.js';

export type RGBA = [number, number, number, number];
type Group = 'fill' | 'line' | 'label';
type Scale = Record<Group, number>;

/** The five palettes; each is a light theme of that name and has a `-dark` theme. */
export type LightTheme = 'colorful' | 'natural' | 'muted' | 'gray' | 'toner';

export interface ThemeSettings {
	/** Land (and background) of the light theme. The reference keeps its own. */
	land?: string;
	/** Exponent on colorful's contrast against the land, per group: above 1 stronger, below 1 softer. */
	contrast: Scale;
	/** Chroma as a multiple of colorful's, per group. */
	chroma: Scale;
	/** Relative luminance of the dark theme's land — distinct per theme, so no two share a background. */
	darkLand: number;
}

export const THEMES: Record<LightTheme, ThemeSettings> = {
	colorful: { contrast: { fill: 1, line: 1, label: 1 }, chroma: { fill: 1, line: 1, label: 1 }, darkLand: 0.02 },
	// stronger nature fills on a warm land
	natural: {
		land: '#F2EDDE',
		contrast: { fill: 1.3, line: 1, label: 1 },
		chroma: { fill: 1.4, line: 1, label: 1 },
		darkLand: 0.022,
	},
	// softer and less saturated throughout
	muted: {
		land: '#F4F0EE',
		contrast: { fill: 0.7, line: 0.8, label: 0.9 },
		chroma: { fill: 0.5, line: 0.6, label: 0.6 },
		darkLand: 0.019,
	},
	// a trace of colour, enough to keep water and the road classes apart
	gray: {
		land: '#F0F0F0',
		contrast: { fill: 0.8, line: 0.9, label: 1 },
		chroma: { fill: 0.15, line: 0.35, label: 0.2 },
		darkLand: 0.018,
	},
	// quiet fills, heavy lines, black labels
	toner: {
		land: '#FFFFFF',
		contrast: { fill: 0.8, line: 2, label: 1.4 },
		chroma: { fill: 0.6, line: 1.2, label: 0 },
		darkLand: 0.006,
	},
};

/** Hand adjustments applied on top of the generated colours, keyed by theme name. */
export const OVERRIDES: Partial<Record<Palette, Partial<ResolvedColors>>> = {};

/** Chroma of a dark theme relative to its light theme. */
const DARK_CHROMA = 0.8;
/** Below this land luminance there is no room for darker water, so dark water turns a lighter blue. */
const DARK_WATER_ROOM = 0.015;
/** Road fills and the casings drawn beneath them. */
const CASINGS: Record<string, string> = {
	roadStreet: 'roadStreetBg',
	roadMotorway: 'roadMotorwayBg',
	roadTrunk: 'roadTrunkBg',
};

// ── colour math ───────────────────────────────────────────────────────────────

export function parse(color: string): RGBA {
	const hex = color.replace('#', '');
	const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
	return [channel(0), channel(2), channel(4), hex.length >= 8 ? channel(6) : 1];
}

function toHex(color: RGBA): string {
	const byte = (v: number) =>
		Math.round(Math.min(1, Math.max(0, v)) * 255)
			.toString(16)
			.padStart(2, '0')
			.toUpperCase();
	return `#${byte(color[0])}${byte(color[1])}${byte(color[2])}${color[3] < 0.999 ? byte(color[3]) : ''}`;
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toGamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** WCAG relative luminance. */
const luminance = (c: RGBA) => 0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2]);

/** `top` composited over an opaque `bottom`. */
export function over(top: RGBA, bottom: RGBA): RGBA {
	const mix = (i: number) => top[3] * top[i] + (1 - top[3]) * bottom[i];
	return [mix(0), mix(1), mix(2), 1];
}

/** Signed WCAG contrast of `fg` over `bg`: above 1 when it is lighter than `bg`, below 1 when darker. */
export function contrast(fg: RGBA, bg: RGBA): number {
	return (luminance(over(fg, bg)) + 0.05) / (luminance(bg) + 0.05);
}

const magnitude = (t: number) => Math.max(t, 1 / t);

function toOklab(c: RGBA): [number, number, number] {
	const [r, g, b] = [toLinear(c[0]), toLinear(c[1]), toLinear(c[2])];
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
	];
}

function toOklch(c: RGBA): { C: number; h: number } {
	const [, a, b] = toOklab(c);
	return { C: Math.hypot(a, b), h: Math.atan2(b, a) };
}

/** Linear sRGB of an OKLCH colour, possibly outside the gamut. */
function oklchToLinear(L: number, C: number, h: number): [number, number, number] {
	const a = C * Math.cos(h);
	const b = C * Math.sin(h);
	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
	return [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	];
}

/** OKLCH → sRGB, reducing chroma until the colour fits the gamut. */
function fromOklch(L: number, C: number, h: number, alpha: number): RGBA {
	const inGamut = (C2: number) => oklchToLinear(L, C2, h).every((v) => v >= -1e-4 && v <= 1 + 1e-4);
	let chroma = C;
	if (!inGamut(chroma)) {
		let lo = 0;
		let hi = C;
		for (let i = 0; i < 30; i++) {
			const mid = (lo + hi) / 2;
			if (inGamut(mid)) lo = mid;
			else hi = mid;
		}
		chroma = lo;
	}
	const [r, g, b] = oklchToLinear(L, chroma, h).map((v) => toGamma(Math.min(1, Math.max(0, v))));
	return [r, g, b, alpha];
}

/** Bisects OKLCH lightness until `measure` of the colour reaches `target` (it grows with lightness). */
function solveLightness(h: number, C: number, alpha: number, target: number, measure: (c: RGBA) => number): RGBA {
	let lo = 0;
	let hi = 1;
	for (let i = 0; i < 40; i++) {
		const mid = (lo + hi) / 2;
		if (measure(fromOklch(mid, C, h, alpha)) < target) lo = mid;
		else hi = mid;
	}
	return fromOklch((lo + hi) / 2, C, h, alpha);
}

/** Distance between two colours in OKLab, plus their alpha difference — for reporting changes. */
export function oklabDistance(a: string, b: string): number {
	const [p, q] = [parse(a), parse(b)];
	const [x, y] = [toOklab(p), toOklab(q)];
	return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) + Math.abs(p[3] - q[3]);
}

// ── derivation ────────────────────────────────────────────────────────────────

function groupOf(key: string): Group {
	if (key.startsWith('label')) return 'label';
	if (/^(road|transit|boundary)/.test(key)) return 'line';
	return 'fill';
}

function build(theme: LightTheme, dark: boolean): Record<string, string> {
	const ref = osm.colors('colorful') as Record<string, string>;
	const settings = THEMES[theme];
	const refLand = parse(ref.land);
	const tint = (key: string, group: Group) => {
		const { C, h } = toOklch(parse(ref[key]));
		return { h, C: C * settings.chroma[group] * (dark ? DARK_CHROMA : 1) };
	};

	let land = parse(settings.land ?? ref.land);
	if (dark) {
		const own = toOklch(land);
		const { h, C } = tint('land', 'fill');
		land = solveLightness(own.C > 0.02 ? own.h : h, C * 0.5, 1, settings.darkLand, luminance);
	}
	const out: Record<string, string> = { background: toHex(land), land: toHex(land) };

	// water before `labelWater`, casings before the roads drawn on them
	const first = ['water', ...Object.values(CASINGS)];
	const keys = [...first, ...osm.colorKeys.filter((k) => !first.includes(k) && k !== 'land' && k !== 'background')];

	for (const key of keys) {
		const group = groupOf(key);
		const alpha = parse(ref[key])[3];
		if (key === 'labelHalo') {
			out[key] = toHex(dark ? [0, 0, 0, alpha] : [1, 1, 1, alpha]);
			continue;
		}
		const { h, C } = tint(key, group);
		const exponent = settings.contrast[group];
		let bg = land;
		let target = contrast(parse(ref[key]), refLand);
		if (key === 'labelWater') {
			bg = over(parse(out.water), land);
			target = contrast(parse(ref[key]), parse(ref.water));
		}

		if (!dark) {
			target **= exponent;
		} else if (key === 'labelShield') {
			target = 1 / 1.5; // a dark plate under light shield text
		} else if (key in CASINGS) {
			// lighter than its casing, by colorful's fill/casing contrast
			bg = over(parse(out[CASINGS[key]]), land);
			target = magnitude(contrast(parse(ref[key]), over(parse(ref[CASINGS[key]]), refLand))) ** exponent;
		} else if (Object.values(CASINGS).includes(key)) {
			target = magnitude(target) ** (0.5 * exponent); // casings stay subtle
		} else if (key === 'water') {
			const step = magnitude(target) ** (0.5 * exponent);
			target = settings.darkLand >= DARK_WATER_ROOM ? 1 / step : step;
		} else {
			target = magnitude(target) ** exponent;
		}

		const measure = (c: RGBA) => contrast(c, bg);
		let color = solveLightness(h, C, alpha, target, measure);
		// a fill that cannot go the intended way — lighter than a white land — goes the other way
		if (group === 'fill' && magnitude(measure(color)) < Math.sqrt(magnitude(target))) {
			color = solveLightness(h, C, alpha, 1 / target, measure);
		}
		out[key] = toHex(color);
	}
	return Object.fromEntries(osm.colorKeys.map((k) => [k, out[k]]));
}

/** The generated colour tables of the nine derived themes, keyed by theme name. */
export function generateThemes(): Partial<Record<Palette, ResolvedColors>> {
	const tables: Partial<Record<Palette, ResolvedColors>> = {};
	for (const theme of Object.keys(THEMES) as LightTheme[]) {
		const variants: [Palette, boolean][] = [[`${theme}-dark` as Palette, true]];
		if (theme !== 'colorful') variants.unshift([theme, false]);
		for (const [name, dark] of variants) {
			tables[name] = { ...build(theme, dark), ...OVERRIDES[name] } as ResolvedColors;
		}
	}
	return tables;
}

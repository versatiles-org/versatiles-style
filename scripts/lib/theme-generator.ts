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
 * lighter, streets lighter than their casings, and glaciers clearly lighter so they read as snow.
 *
 * Hues come from colorful and settings from `THEMES`, never from the tables in src/themes, so running
 * the generator twice gives the same result. `npm run generate-themes` writes those tables, and a unit
 * test fails when they and the generator disagree.
 *
 * This file is the derivation. What the themes should look like is `scripts/config/themes.ts`, and
 * what each of its settings means is documented on the types in `./theme-types.ts`. Three places to
 * tune a derived theme there, in order of how much they move:
 *
 *   `THEMES`    a whole theme, by group — its land, and its contrast and chroma against colorful's.
 *   `FIXES`     a named handful of colours that should deviate, per mode.
 *   `OVERRIDES` one literal colour in one theme, bypassing the derivation entirely. A last resort.
 *
 * None of them can move `colorful` light, which is hand-written in `src/themes/colorful.ts`. Change a
 * colour there and every derived theme follows, since their targets are measured from it.
 *
 * What stays here, and is deliberately not configuration: `DARK_CHROMA`, `DARK_WATER_ROOM`,
 * `DARK_GLACIER`, `CASINGS` and `groupOf`. Each defines what a derived theme *is* in this package,
 * and moving any of them moves all nine at once — which is the blast radius `THEMES` and `FIXES`
 * exist to avoid.
 */

import { Color } from '../../src/color/index.js';
import { osm } from '../../src/index.js';
import type { Palette, ResolvedColors } from '../../src/options/index.js';
import { FIXES, OVERRIDES, THEMES } from '../config/themes.js';
import type { Adjustment, Fix, Group, LightTheme } from './theme-types.js';

/**
 * Keys no fix can reach, because they are not derived through a contrast target.
 *
 * `land` and `background` are settled before the loop — they are what everything else is measured
 * against — and `labelHalo` is flat white or black at colorful's alpha, with no solve to bend.
 */
const UNFIXABLE: ReadonlySet<string> = new Set(['land', 'background', 'labelHalo']);

const NEUTRAL: Required<Adjustment> = Object.freeze({ lightness: 1, chroma: 1, blend: 0 });

const isNeutral = (a: Required<Adjustment>) => a.lightness === 1 && a.chroma === 1 && a.blend === 0;

/** How far the achieved contrast may sit from what a fix asked for before it is worth reporting. */
const FIX_TOLERANCE = Math.log(1.02);

/** Something a fix asked for that the derivation could not deliver. */
export interface Diagnostic {
	theme: Palette;
	key: string;
	message: string;
}

/**
 * `FIXES` indexed by the `theme|dark|key` it applies to, with every shorthand filled in.
 *
 * Validates as it goes, and throws rather than warning: a fix is a few hand-written lines, and one
 * that silently does nothing is worse than no fix at all — it reads, in review, as a change that was
 * made. Two fixes on one colour, a key that cannot be reached, a fix that applies nowhere: all loud.
 */
export function resolveFixes(fixes: readonly Fix[] = FIXES): Map<string, Required<Adjustment>> {
	const index = new Map<string, Required<Adjustment>>();
	const owner = new Map<string, string>();
	const keys = osm.colorKeys as readonly string[];
	const allThemes = Object.keys(THEMES) as LightTheme[];

	for (const fix of fixes) {
		const name = [fix.themes?.[0] ?? allThemes[0], fix.keys?.[0] ?? ''].join('|');
		if (fix.keys.length === 0) throw new Error(`fix "${name}": no keys`);
		if (!fix.light && !fix.dark) throw new Error(`fix "${name}": neither a light nor a dark adjustment`);
		for (const [mode, adjustment] of [
			['light', fix.light],
			['dark', fix.dark],
		] as const) {
			if (!adjustment) continue;
			for (const [property, value] of Object.entries(adjustment)) {
				if (!Number.isFinite(value)) throw new Error(`fix "${name}": ${mode}.${property} is not a number`);
				// `blend` is a fraction of the way to the land, the other two are multiples of what the
				// derivation would otherwise use — so 0 is meaningless for those and meaningful for this one
				if (property === 'blend') {
					if (value < 0 || value > 1) {
						throw new Error(`fix "${name}": ${mode}.blend must be a fraction from 0 to 1, got ${value}`);
					}
				} else if (value <= 0) {
					throw new Error(`fix "${name}": ${mode}.${property} must be a positive multiple, got ${value}`);
				}
			}
			if (isNeutral({ ...NEUTRAL, ...adjustment })) {
				throw new Error(`fix "${name}": ${mode} changes nothing — drop it, or it reads as a change that was made`);
			}
		}
		for (const key of fix.keys) {
			if (!keys.includes(key)) throw new Error(`fix "${name}": ${key} is not a colour key`);
			if (UNFIXABLE.has(key)) {
				throw new Error(`fix "${name}": ${key} is not derived through a contrast target, so a fix cannot reach it`);
			}
		}
		for (const theme of fix.themes ?? allThemes) {
			if (!(theme in THEMES)) throw new Error(`fix "${name}": ${theme} is not a theme`);
		}

		let applications = 0;
		for (const theme of fix.themes ?? allThemes) {
			for (const dark of [false, true]) {
				// colorful light is hand-written, not generated, so there is nothing here to adjust
				if (theme === 'colorful' && !dark) continue;
				const adjustment = dark ? fix.dark : fix.light;
				if (!adjustment) continue;
				for (const key of fix.keys) {
					const at = `${theme}|${dark}|${key}`;
					const prior = owner.get(at);
					if (prior !== undefined) {
						throw new Error(
							`two fixes both adjust ${key} in ${dark ? `${theme}-dark` : theme}: "${prior}" and "${name}" — ` +
								`merge them into one, since a list of multipliers does not show which of two wins`
						);
					}
					owner.set(at, name);
					index.set(at, { ...NEUTRAL, ...adjustment });
					applications++;
				}
			}
		}
		if (applications === 0) {
			throw new Error(
				`fix "${name}" applies to no generated theme. Note that colorful light is the hand-written ` +
					`reference and is never generated — to move its own colours, edit src/themes/colorful.ts`
			);
		}
	}
	return index;
}

/** Chroma of a dark theme relative to its light theme. */
const DARK_CHROMA = 0.8;
/** Below this land luminance there is no room for darker water, so dark water turns a lighter blue. */
const DARK_WATER_ROOM = 0.015;
/** Contrast of dark-theme glaciers against the land: snow, clearly lighter than the ground around it. */
const DARK_GLACIER = 1.6;
/** Road fills and the casings drawn beneath them. */
const CASINGS: Record<string, string> = {
	roadStreet: 'roadStreetBg',
	roadMotorway: 'roadMotorwayBg',
	roadTrunk: 'roadTrunkBg',
};

// ── colour math ───────────────────────────────────────────────────────────────
//
// The conversions, the transfer function and the OKLab matrices all live in `src/color` now; this
// generator used to carry its own copy of each. What remains here is the part that is generator policy
// rather than colour science: a *signed* contrast, and a gamut reduction that refuses to move a hue.

export function parse(color: string): Color {
	return Color.parse(color);
}

/** `top` composited over an opaque `bottom`. */
export function over(top: Color, bottom: Color): Color {
	return bottom.over(top);
}

/**
 * Signed WCAG contrast of `fg` over `bg`: above 1 when it is lighter than `bg`, below 1 when darker.
 *
 * `Color.contrastRatio` gives the unsigned ratio that WCAG defines. The sign is what this generator is
 * built on — every rule here reads "lighter than the land" or "darker than the land" — so it is kept.
 */
export function contrast(fg: Color, bg: Color): number {
	return (over(fg, bg).luminance() + 0.05) / (bg.luminance() + 0.05);
}

const magnitude = (t: number) => Math.max(t, 1 / t);

/**
 * An OKLCh colour as sRGB, reducing chroma until it fits the gamut.
 *
 * Deliberately not `Color.toGamut()`. That is CSS Color 4's mapping, which stops reducing once clipping
 * would cost less than a JND and then clips — trading a little hue for a little chroma. Here the hue is
 * the one thing that must not move: it is colorful's, and holding it is what makes a derived theme a
 * recognisable relative of the reference rather than a different palette.
 */
function fromOklch(lightness: number, chroma: number, hue: number, alpha: number): Color {
	const at = (c: number) => Color.oklch(lightness, c, hue, alpha);
	if (at(chroma).inGamut()) return at(chroma).to('srgb');

	let low = 0;
	let high = chroma;
	for (let i = 0; i < 30; i++) {
		const mid = (low + high) / 2;
		if (at(mid).inGamut()) low = mid;
		else high = mid;
	}
	return at(low).to('srgb');
}

/** Bisects OKLCh lightness until `measure` of the colour reaches `target` (it grows with lightness). */
function solveLightness(
	hue: number,
	chroma: number,
	alpha: number,
	target: number,
	measure: (c: Color) => number
): Color {
	let low = 0;
	let high = 1;
	for (let i = 0; i < 40; i++) {
		const mid = (low + high) / 2;
		if (measure(fromOklch(mid, chroma, hue, alpha)) < target) low = mid;
		else high = mid;
	}
	return fromOklch((low + high) / 2, chroma, hue, alpha);
}

/** Distance between two colours in OKLab, plus their alpha difference — for reporting changes. */
export function oklabDistance(a: string, b: string): number {
	const [first, second] = [Color.parse(a), Color.parse(b)];
	return first.deltaEOK(second) + Math.abs(first.alpha - second.alpha);
}

// ── derivation ────────────────────────────────────────────────────────────────

function groupOf(key: string): Group {
	if (key.startsWith('label')) return 'label';
	if (/^(road|transit|boundary)/.test(key)) return 'line';
	return 'fill';
}

/**
 * `colorful`, with each colour's chroma distance to the land folded into its lightness — see
 * `decolorize`. Returns the reference untouched at 0, so every other theme derives from colorful
 * itself.
 */
function decolorized(ref: Record<string, string>, amount: number): Record<string, string> {
	if (!amount) return ref;
	const land = parse(ref.land);
	const { l: landL, a: landA, b: landB } = land.oklab;
	const lightnessOver = (color: Color) => over(color, land).oklab.l;
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(ref)) {
		const color = parse(value);
		// measured as the colour is seen, composited over the land, so alpha counts for what it hides
		const { l, a, b } = over(color, land).oklab;
		const chroma = Math.hypot(a - landA, b - landB);
		// away from the land, the way the colour already leans; a colour at the land's lightness darkens
		const target = l + Math.sign(l - landL || -1) * amount * chroma;
		// solved rather than assigned, so a translucent colour still composites onto `target`
		out[key] = solveLightness(0, 0, color.alpha, target, lightnessOver).asHex();
	}
	return out;
}

/**
 * `ref`, with every colour a fix blends mixed that far toward the land.
 *
 * On the reference rather than on the result, so the whole derivation sees the blended colour: its hue
 * and chroma feed `tint`, and the contrast target is measured from it, which is what makes a blend
 * cost separation as well as saturation. The keys solved against another generated colour —
 * `labelWater` over the water, a road over its casing — then re-solve against the blended one for
 * free, exactly as with the other two adjustments.
 *
 * Mixed in OKLab, so a colour washes into the land without passing through a grey middle, and put back
 * through `fromOklch` so a mix that leaves sRGB loses chroma rather than hue.
 */
function blendReference(ref: Record<string, string>, blendOf: (key: string) => number): Record<string, string> {
	const land = parse(ref.land);
	const out: Record<string, string> = { ...ref };
	for (const key of Object.keys(ref)) {
		const amount = blendOf(key);
		if (!amount) continue;
		const color = parse(ref[key]);
		const { l, c, h } = Color.mix(color, land, amount).oklch;
		// the reference's own alpha, not the mixed one: `Color.mix` interpolates alpha toward the land's,
		// which would turn a wash into an opaque colour
		out[key] = fromOklch(l, c, h, color.alpha).asHex();
	}
	return out;
}

function build(
	theme: LightTheme,
	dark: boolean,
	fixes: Map<string, Required<Adjustment>>,
	diagnostics: Diagnostic[]
): Record<string, string> {
	const settings = THEMES[theme];
	// keyed by this theme and mode, so what follows is colorful as *this* theme should derive it — the
	// shared reference is never touched, or one theme's fix would move all of them
	const fixOf = (key: string) => fixes.get(`${theme}|${dark}|${key}`) ?? NEUTRAL;
	const ref = blendReference(
		decolorized(osm.colors('colorful') as Record<string, string>, settings.decolorize ?? 0),
		(key) => fixOf(key).blend
	);
	const refLand = parse(ref.land);
	const tint = (key: string, group: Group) => {
		const { c, h } = parse(ref[key]).oklch;
		const v = settings.chroma?.[group] ?? 1;
		return { h, C: c * v * (dark ? DARK_CHROMA : 1) * fixOf(key).chroma };
	};

	let land = parse(settings.land ?? ref.land);
	if (dark) {
		const own = land.oklch;
		const { h, C } = tint('land', 'fill');
		land = solveLightness(own.c > 0.02 ? own.h : h, C * 0.5, 1, settings.darkLand, (c) => c.luminance());
	}
	const out: Record<string, string> = { background: land.asHex(), land: land.asHex() };

	// water before `labelWater`, casings before the roads drawn on them
	const first = ['water', ...Object.values(CASINGS)];
	const keys = [...first, ...osm.colorKeys.filter((k) => !first.includes(k) && k !== 'land' && k !== 'background')];

	for (const key of keys) {
		const group = groupOf(key);
		const alpha = parse(ref[key]).alpha;
		if (key === 'labelHalo') {
			out[key] = (dark ? Color.srgb(0, 0, 0, alpha) : Color.srgb(255, 255, 255, alpha)).asHex();
			continue;
		}
		const { h, C } = tint(key, group);
		const exponent = settings.contrast?.[group] ?? 1;
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
		} else if (key === 'glacier') {
			target = DARK_GLACIER ** exponent;
		} else if (key === 'water') {
			const step = magnitude(target) ** (0.5 * exponent);
			target = settings.darkLand >= DARK_WATER_ROOM ? 1 / step : step;
		} else {
			target = magnitude(target) ** exponent;
		}

		// applied last, so the fix bends the finished target whichever branch produced it
		const fix = fixOf(key);
		target *= fix.lightness;

		const measure = (c: Color) => contrast(c, bg);
		let color = solveLightness(h, C, alpha, target, measure);
		// a fill that cannot go the intended way — lighter than a white land — goes the other way
		const inverted = group === 'fill' && magnitude(measure(color)) < Math.sqrt(magnitude(target));
		if (inverted) color = solveLightness(h, C, alpha, 1 / target, measure);

		// Only where a fix asked for something: the solver returns the closest lightness it reached, so a
		// target outside what this hue can carry — or one the inversion above sends back the other way —
		// is otherwise a silent no-op, and a fix that quietly does nothing still reads as a change.
		if (fix !== NEUTRAL) {
			const achieved = measure(color);
			const name = (dark ? `${theme}-dark` : theme) as Palette;
			if (inverted) {
				diagnostics.push({
					theme: name,
					key,
					message:
						`fix asked for contrast ${target.toFixed(3)} against its background, which this colour cannot ` +
						`reach in that direction; it was flipped to ${achieved.toFixed(3)}`,
				});
			} else if (Math.abs(Math.log(achieved / target)) > FIX_TOLERANCE) {
				diagnostics.push({
					theme: name,
					key,
					message:
						`fix asked for contrast ${target.toFixed(3)}, derivation reached ${achieved.toFixed(3)} — ` +
						`out of range at this hue and chroma`,
				});
			}
		}
		out[key] = color.asHex();
	}
	return Object.fromEntries(osm.colorKeys.map((k) => [k, out[k]]));
}

/**
 * The nine derived themes, and anything their fixes asked for that the derivation could not deliver.
 *
 * `fixes` is a parameter so the tests can drive the mechanism without `FIXES` itself having to carry
 * a deviation for them to assert on.
 */
export function generate(fixes: readonly Fix[] = FIXES): {
	tables: Partial<Record<Palette, ResolvedColors>>;
	diagnostics: Diagnostic[];
} {
	const resolved = resolveFixes(fixes);
	const diagnostics: Diagnostic[] = [];
	const tables: Partial<Record<Palette, ResolvedColors>> = {};
	for (const theme of Object.keys(THEMES) as LightTheme[]) {
		const variants: [Palette, boolean][] = [[`${theme}-dark` as Palette, true]];
		if (theme !== 'colorful') variants.unshift([theme, false]);
		for (const [name, dark] of variants) {
			tables[name] = { ...build(theme, dark, resolved, diagnostics), ...OVERRIDES[name] } as ResolvedColors;
		}
	}
	return { tables, diagnostics };
}

/** The generated colour tables of the nine derived themes, keyed by theme name. */
export function generateThemes(): Partial<Record<Palette, ResolvedColors>> {
	return generate().tables;
}

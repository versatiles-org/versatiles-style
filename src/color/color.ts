/**
 * A colour: a space, three coordinates in it, and an alpha.
 *
 * Immutable — every method returns a new instance, and every field is `readonly`.
 *
 * One class rather than v5's three. There, `RGB`, `HSL` and `HSV` each carried their own storage, and
 * the thirteen transforms lived on `RGB` with the other two inheriting and converting, which had two
 * consequences worth naming because they are the reason this exists:
 *
 *   - **A fourth space was unaffordable.** Every space meant another class and another set of
 *     conversions. Here a space is a row in `SPACES` and two functions in `convert.ts`.
 *   - **The class a transform returned decided the output format.** `invertLuminosity()` produced an
 *     `HSL`, whose `asString()` wrote `hsl(…)`, so four `marking-*` layers in every generated style were
 *     `hsl()` while the other 370-odd colours were `rgb()` — not a decision anyone made. Here every
 *     transform returns a `Color`, and how a colour is written is decided only when it is written.
 *
 * The transforms keep v5's maths exactly, so adopting this moves no generated colour. Perceptual
 * behaviour is opt-in, per call, through `mix(other, t, { space: 'oklab' })`.
 */

import { convert, isPowerlessHue } from './convert.js';
import { contrastRatio, deltaEOK, inGamut, luminance, mix, toGamut } from './ops.js';
import type { ColorValue, MixOptions } from './ops.js';
import { parseColor } from './parser.js';
import { formatCSS, formatHex, formatStyleColor } from './serialize.js';
import { SPACES, channelIndex, channelNames, normalize } from './space.js';
import type { Coords, Space } from './space.js';

/** Channel values of a colour in one space, named as that space names them, plus its alpha. */
export type Channels = Record<string, number>;

export class Color implements ColorValue {
	readonly space: Space;
	readonly coords: Coords;
	readonly alpha: number;

	private constructor(space: Space, coords: Coords, alpha: number) {
		this.space = space;
		this.coords = normalize(space, coords);
		this.alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : Number.isNaN(alpha) ? 1 : alpha;
		Object.freeze(this);
	}

	// ── construction ──────────────────────────────────────────────────────────

	/** A colour from coordinates already in `space`. */
	static from(space: Space, coords: Coords, alpha = 1): Color {
		return new Color(space, coords, alpha);
	}

	/**
	 * Reads a colour string — hex, `rgb()`, `hsl()`, `hwb()`, `hsv()`, `oklab()`, `oklch()` or
	 * `transparent`. A `Color` is returned unchanged, so this is safe to call on an unknown value.
	 *
	 * @throws {ColorParseError} on anything it cannot read, naming what was wrong.
	 */
	static parse(input: string | Color): Color {
		if (input instanceof Color) return input;
		const { space, coords, alpha } = parseColor(input);
		return new Color(space, coords, alpha);
	}

	/** sRGB, channels 0–255. */
	static srgb(r: number, g: number, b: number, alpha = 1): Color {
		return new Color('srgb', [r, g, b], alpha);
	}

	/** Hue 0–360, saturation and lightness 0–100. */
	static hsl(h: number, s: number, l: number, alpha = 1): Color {
		return new Color('hsl', [h, s, l], alpha);
	}

	/** Hue 0–360, whiteness and blackness 0–100. */
	static hwb(h: number, w: number, b: number, alpha = 1): Color {
		return new Color('hwb', [h, w, b], alpha);
	}

	/** Hue 0–360, saturation and value 0–100. Not a CSS space; kept for `randomColor`. */
	static hsv(h: number, s: number, v: number, alpha = 1): Color {
		return new Color('hsv', [h, s, v], alpha);
	}

	/** Lightness 0–1, opponent axes roughly ±0.4. */
	static oklab(l: number, a: number, b: number, alpha = 1): Color {
		return new Color('oklab', [l, a, b], alpha);
	}

	/** Lightness 0–1, chroma from 0, hue 0–360. */
	static oklch(l: number, c: number, h: number, alpha = 1): Color {
		return new Color('oklch', [l, c, h], alpha);
	}

	/** Two colours mixed, `t` of the way across. Interpolates in OKLab unless told otherwise. */
	static mix(from: Color, to: Color, t = 0.5, options?: MixOptions): Color {
		const result = mix(from, to, t, options);
		return new Color(result.space, result.coords, result.alpha);
	}

	// ── conversion and access ─────────────────────────────────────────────────

	/** The same colour, held in `space`. Nothing is clamped on the way, so wide colours survive. */
	to(space: Space): Color {
		return space === this.space ? this : new Color(space, convert(this.coords, this.space, space), this.alpha);
	}

	private channels(space: Space): Channels {
		const coords = convert(this.coords, this.space, space);
		const names = channelNames(space);
		return { [names[0]]: coords[0], [names[1]]: coords[1], [names[2]]: coords[2], alpha: this.alpha };
	}

	/** `{ r, g, b, alpha }`, channels 0–255. */
	get srgb(): Channels {
		return this.channels('srgb');
	}

	/** `{ h, s, l, alpha }`. */
	get hsl(): Channels {
		return this.channels('hsl');
	}

	/** `{ h, w, b, alpha }`. */
	get hwb(): Channels {
		return this.channels('hwb');
	}

	/** `{ h, s, v, alpha }`. */
	get hsv(): Channels {
		return this.channels('hsv');
	}

	/** `{ l, a, b, alpha }`. */
	get oklab(): Channels {
		return this.channels('oklab');
	}

	/** `{ l, c, h, alpha }`. */
	get oklch(): Channels {
		return this.channels('oklch');
	}

	/** This colour's coordinates and alpha, in its own space. */
	asArray(): [number, number, number, number] {
		return [this.coords[0], this.coords[1], this.coords[2], this.alpha];
	}

	/**
	 * A copy with some channels replaced, named as this colour's space names them, plus `alpha`.
	 *
	 * `color.to('oklch').with({ l: 0.8 })` — lighten without touching hue or chroma.
	 *
	 * @throws {Error} naming the channels this space does have, if given one it does not.
	 */
	with(changes: Partial<Channels>): Color {
		const coords: [number, number, number] = [...this.coords];
		let { alpha } = this;
		for (const [name, value] of Object.entries(changes)) {
			if (value === undefined) continue;
			if (name === 'alpha') {
				alpha = value;
				continue;
			}
			const index = channelIndex(this.space, name);
			if (index === undefined) {
				throw new Error(
					`${this.space} has no channel "${name}" — its channels are ${channelNames(this.space).join(', ')}`
				);
			}
			coords[index] = value;
		}
		return new Color(this.space, coords, alpha);
	}

	/** A copy with its coordinates rounded — integers for sRGB, `digits` decimals elsewhere. */
	round(digits = 3): Color {
		const factor = 10 ** digits;
		const scale = (value: number, index: number) =>
			SPACES[this.space].channels[index].max === 255 ? Math.round(value) : Math.round(value * factor) / factor;
		return new Color(
			this.space,
			[scale(this.coords[0], 0), scale(this.coords[1], 1), scale(this.coords[2], 2)],
			Math.round(this.alpha * 1000) / 1000
		);
	}

	/**
	 * Returns this colour.
	 *
	 * A `Color` is frozen and every method returns a new instance, so there is nothing a copy could
	 * protect against. It stays because v5 had it, and because `deepClone` recognises anything with a
	 * `clone()` method.
	 */
	clone(): Color {
		return this;
	}

	/** Whether a screen can show this colour without help. */
	inGamut(): boolean {
		return inGamut(convert(this.coords, this.space, 'srgb'));
	}

	/** The nearest colour a screen can show, holding lightness and hue (CSS Color 4 §14.2.1). */
	toGamut(): Color {
		return new Color('srgb', toGamut(this.coords, this.space), this.alpha);
	}

	// ── output ────────────────────────────────────────────────────────────────

	/** `#RRGGBB`, or `#RRGGBBAA` when not opaque. Uppercase. */
	asHex(): string {
		return formatHex(this.space, this.coords, this.alpha);
	}

	/**
	 * `rgb(r,g,b)` or `rgba(r,g,b,a)` — the only syntax a MapLibre style may contain.
	 *
	 * Whatever space this colour is held in, it is converted and, if need be, gamut-mapped on the way
	 * out, because MapLibre's native parser reads neither `oklch()` nor CSS's space-separated `rgb()`
	 * and renders what it cannot read as nothing at all.
	 */
	asString(): string {
		return formatStyleColor(this.space, this.coords, this.alpha);
	}

	/** CSS syntax, in this colour's own space or another: `oklch(0.7 0.15 45)`. Not for style output. */
	toCSS(space: Space = this.space, precision?: number): string {
		return formatCSS(space, convert(this.coords, this.space, space), this.alpha, precision);
	}

	toString(): string {
		return this.asString();
	}

	toJSON(): string {
		return this.asString();
	}

	// ── measurement ───────────────────────────────────────────────────────────

	/** WCAG 2.1 relative luminance, 0 for black and 1 for white. */
	luminance(): number {
		return luminance(this.coords, this.space);
	}

	/** WCAG 2.1 contrast ratio against another colour, 1 to 21. Alpha is ignored. */
	contrastRatio(other: Color): number {
		return contrastRatio(this, other);
	}

	/** Perceptual distance in OKLab. Below 0.02 — one JND — is a difference nobody can see. */
	deltaEOK(other: Color): number {
		return deltaEOK(this.coords, other.coords, this.space, other.space);
	}

	/** Whether this colour's hue channel carries information, or is grey reading rounding noise. */
	hasPowerlessHue(): boolean {
		return isPowerlessHue(this.space, this.coords);
	}

	// ── the cartographic vocabulary ───────────────────────────────────────────
	//
	// v5's transforms, with v5's maths, so no generated colour moves. Each returns a `Color` rather than
	// whichever class v5 happened to compute in.

	/** Mixes toward `other`, `t` of the way, in OKLab unless told otherwise. */
	mix(other: Color, t = 0.5, options?: MixOptions): Color {
		return Color.mix(this, other, t, options);
	}

	/** Reduces alpha proportionally: `a → a · (1 − value)`. */
	fade(value: number): Color {
		return new Color(this.space, this.coords, this.alpha * (1 - value));
	}

	/** The same colour, fully opaque. */
	opaque(): Color {
		return new Color(this.space, this.coords, 1);
	}

	/** `top` composited over this colour, source-over. */
	over(top: Color): Color {
		const base = this.srgb;
		const front = top.srgb;
		const outAlpha = top.alpha + this.alpha * (1 - top.alpha);
		if (outAlpha === 0) return Color.srgb(0, 0, 0, 0);
		const weight = this.alpha * (1 - top.alpha);
		const channel = (a: number, b: number) => (b * top.alpha + a * weight) / outAlpha;
		return Color.srgb(channel(base.r, front.r), channel(base.g, front.g), channel(base.b, front.b), outAlpha);
	}

	/**
	 * Recoloured with `top`'s hue and saturation, keeping this colour's lightness — the HSL "Color"
	 * blend mode — then blended back by `top`'s alpha, which reads as the strength.
	 */
	colorize(top: Color): Color {
		const tint = top.hsl;
		// The recoloured colour takes this one's alpha, so that blending toward it changes the colour and
		// nothing else. Give it the default alpha of 1 instead and `blend` — which now interpolates alpha
		// rather than ignoring it, as v5 did — would quietly make a translucent base more opaque.
		const recoloured = Color.hsl(tint.h, tint.s, this.hsl.l, this.alpha);
		return this.blend(top.alpha, recoloured);
	}

	/**
	 * Linear interpolation toward `other` in sRGB.
	 *
	 * Unlike v5, alpha is interpolated too: `blend(1, x)` now returns `x`, alpha included, rather than
	 * `x`'s channels wearing this colour's alpha.
	 */
	blend(value: number, other: Color): Color {
		const t = clamp01(value ?? 0);
		const base = this.srgb;
		const target = other.srgb;
		const channel = (a: number, b: number) => a * (1 - t) + b * t;
		return Color.srgb(
			channel(base.r, target.r),
			channel(base.g, target.g),
			channel(base.b, target.b),
			channel(this.alpha, other.alpha)
		);
	}

	/**
	 * Shifts this colour's hue toward `other`'s, keeping its own lightness and saturation.
	 *
	 * A colour with no hue to give — white, black or any grey — leaves this one alone. v5 read such a
	 * colour's hue as a real 0°, so tinting toward white turned everything red.
	 */
	tint(value: number, other: Color): Color {
		if (other.to('hsv').hasPowerlessHue()) return this;
		const t = clamp01(value);
		const target = this.setHue(other.hsv.h);
		const base = this.srgb;
		const tinted = target.srgb;
		const channel = (a: number, b: number) => a * (1 - t) + b * t;
		return Color.srgb(channel(base.r, tinted.r), channel(base.g, tinted.g), channel(base.b, tinted.b), this.alpha);
	}

	/** Per-channel gamma: `c → 255 · (c/255)^value`. Below 1 brightens midtones, above 1 darkens them. */
	gamma(value: number): Color {
		const exponent = clamp(value, 1e-3, 1e3);
		const { r, g, b } = this.srgb;
		const channel = (c: number) => (c / 255) ** exponent * 255;
		return Color.srgb(channel(r), channel(g), channel(b), this.alpha);
	}

	/** Flips every channel: `c → 255 − c`. Flips the hue too — for dark mode use `invertLuminosity`. */
	invert(): Color {
		const { r, g, b } = this.srgb;
		return Color.srgb(255 - r, 255 - g, 255 - b, this.alpha);
	}

	/** Scales each channel around mid-grey. 0 collapses to `#808080`; above 1 increases contrast. */
	contrast(value: number): Color {
		const factor = clamp(value, 0, 1e6);
		const { r, g, b } = this.srgb;
		const channel = (c: number) => (c - 127.5) * factor + 127.5;
		return Color.srgb(channel(r), channel(g), channel(b), this.alpha);
	}

	/** Shifts toward black (negative) or white (positive), by up to one whole channel range. */
	brightness(value: number): Color {
		const shift = clamp(value, -1, 1);
		const keep = 1 - Math.abs(shift);
		const add = shift < 0 ? 0 : 255 * shift;
		const { r, g, b } = this.srgb;
		return Color.srgb(r * keep + add, g * keep + add, b * keep + add, this.alpha);
	}

	/** Toward white. Theme-absolute: use `blend(ratio, bg)` for something that follows the palette. */
	lighten(ratio: number): Color {
		const t = clamp01(ratio);
		const { r, g, b } = this.srgb;
		const channel = (c: number) => 255 - (255 - c) * (1 - t);
		return Color.srgb(channel(r), channel(g), channel(b), this.alpha);
	}

	/** Toward black. Theme-absolute: use `blend(ratio, fg)` for something that follows the palette. */
	darken(ratio: number): Color {
		const t = clamp01(ratio);
		const { r, g, b } = this.srgb;
		return Color.srgb(r * (1 - t), g * (1 - t), b * (1 - t), this.alpha);
	}

	/** Flips lightness while keeping hue and saturation — the dark-mode inversion. */
	invertLuminosity(): Color {
		const { h, s, l } = this.hsl;
		return Color.hsl(h, s, 100 - l, this.alpha);
	}

	/** Rotates the hue by `offset` degrees. */
	rotateHue(offset: number): Color {
		const { h, s, l } = this.hsl;
		return Color.hsl(h + offset, s, l, this.alpha);
	}

	/** Scales HSL saturation by `1 + ratio`. */
	saturate(ratio: number): Color {
		const { h, s, l } = this.hsl;
		return Color.hsl(h, s * (1 + ratio), l, this.alpha);
	}

	/** Replaces the hue, keeping HSV saturation and value. */
	setHue(value: number): Color {
		const { s, v } = this.hsv;
		return Color.hsv(value, s, v, this.alpha);
	}
}

function clamp(value: number, min: number, max: number): number {
	return Number.isNaN(value) ? min : value < min ? min : value > max ? max : value;
}

function clamp01(value: number): number {
	return clamp(value, 0, 1);
}

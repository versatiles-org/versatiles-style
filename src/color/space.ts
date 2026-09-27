/**
 * The six colour spaces the library understands, and the channel metadata every other colour module
 * reads off them.
 *
 * One table, six spaces, three channels each. Parsing (what `100%` means in this channel), serialising
 * (which channels are angles) and output (what to clamp) all consult this table instead of repeating the
 * rules per space — which is what makes a sixth space cost a table row rather than a class.
 *
 * Ranges follow CSS Color 4 where it has an opinion (§4.2 alpha, §7 HSL, §9.4 OKLab/OKLCh): the sRGB and
 * percentage channels are bounded, hues wrap, and OKLab's `a`/`b` stay open at both ends while OKLCh's
 * chroma is only closed at the bottom.
 *
 * The ranges describe what can be shown, not what a `Color` may hold. Construction only wraps hues and
 * removes `NaN` (`normalize`); the ranges are applied where a colour enters or leaves — parsing and output
 * (`clampToRange`). In between, an out-of-range value is a legitimate intermediate result: a contrast
 * that pushes a light grey past white and a brightness that brings it back must end at a light grey, not
 * at a grey that was clipped on the way. MapLibre's raster shader works the same way.
 *
 * `hsv` is not a CSS space. It stays because `randomColor` is built on it and it was public API in v6;
 * it parses and serialises as `hsv()`, which is ours, not CSS.
 */

/** A colour space this library can hold a colour in. */
export type Space = 'srgb' | 'hsl' | 'hwb' | 'hsv' | 'oklab' | 'oklch';

/** The three numbers of a colour, in the order its space names them. Alpha is carried separately. */
export type Coords = readonly [number, number, number];

export interface ChannelSpec {
	/** Channel letter, spelled as CSS spells it: `r`, `s`, `l`, `c`, `h`, … */
	readonly name: string;
	readonly min: number;
	/** `Infinity` where the space leaves the channel open. */
	readonly max: number;
	/**
	 * The value `100%` denotes in this channel. `undefined` where a percentage is not valid input —
	 * CSS hues take a number or an angle, never a percentage.
	 */
	readonly percent?: number;
	/** An angle in degrees: wrapped into [0,360) rather than clamped. */
	readonly hue?: true;
}

export interface SpaceSpec {
	readonly channels: readonly [ChannelSpec, ChannelSpec, ChannelSpec];
}

const rgb = (name: string): ChannelSpec => ({ name, min: 0, max: 255, percent: 255 });
const hue: ChannelSpec = { name: 'h', min: 0, max: 360, hue: true };
const percent = (name: string): ChannelSpec => ({ name, min: 0, max: 100, percent: 100 });
/** OKLab/OKLCh lightness: 0–1, where CSS writes `100%` for 1. */
const okLightness: ChannelSpec = { name: 'l', min: 0, max: 1, percent: 1 };
/** An OKLab opponent axis: signed and unbounded; CSS reads `±100%` as ±0.4. */
const okAxis = (name: string): ChannelSpec => ({ name, min: -Infinity, max: Infinity, percent: 0.4 });

export const SPACES: Readonly<Record<Space, SpaceSpec>> = {
	srgb: { channels: [rgb('r'), rgb('g'), rgb('b')] },
	hsl: { channels: [hue, percent('s'), percent('l')] },
	hwb: { channels: [hue, percent('w'), percent('b')] },
	hsv: { channels: [hue, percent('s'), percent('v')] },
	oklab: { channels: [okLightness, okAxis('a'), okAxis('b')] },
	oklch: { channels: [okLightness, { name: 'c', min: 0, max: Infinity, percent: 0.4 }, hue] },
};

/** Every space name, in a stable order — for error messages and for tests that sweep all spaces. */
export const SPACE_NAMES = Object.keys(SPACES) as readonly Space[];

export function isSpace(value: string): value is Space {
	return Object.prototype.hasOwnProperty.call(SPACES, value);
}

/** The channel letters of a space, e.g. `['l', 'c', 'h']` — used by `with()` and by error messages. */
export function channelNames(space: Space): [string, string, string] {
	const [a, b, c] = SPACES[space].channels;
	return [a.name, b.name, c.name];
}

/** Index of a channel by its letter, or `undefined` if the space has no such channel. */
export function channelIndex(space: Space, name: string): number | undefined {
	const index = SPACES[space].channels.findIndex((channel) => channel.name === name);
	return index < 0 ? undefined : index;
}

function normalizeChannel(value: number, channel: ChannelSpec): number {
	// NaN becomes 0 before anything else: every channel's range contains 0, and mapping to the floor
	// instead would send an unbounded channel (OKLab's a/b) to -Infinity.
	if (Number.isNaN(value)) return 0;
	if (channel.hue) {
		// Only touch a hue that is actually outside the circle. The obvious `((v % 360) + 360) % 360`
		// disturbs the last bit of a value already in range — 48.387096774193544 comes back as
		// 48.38709677419354 — and that is enough to move a channel from 104.5 to 104.49999999999999,
		// which rounds to a different byte.
		const wrapped = value % 360;
		if (wrapped < 0) return wrapped + 360;
		return wrapped === 0 ? 0 : wrapped; // collapse -0
	}
	return value;
}

function clampChannel(value: number, channel: ChannelSpec): number {
	value = normalizeChannel(value, channel);
	return value < channel.min ? channel.min : value > channel.max ? channel.max : value;
}

/**
 * What every `Color` holds: hues wrapped into [0,360) and `NaN` mapped to 0 — every channel's range
 * contains it, where a floor would not (see `normalizeChannel`) — so a bad number can never travel
 * further as a silent `NaN`. Nothing is clamped; see `clampToRange` for that.
 *
 * Idempotent, and a no-op for any colour already inside its ranges.
 */
export function normalize(space: Space, coords: Coords): Coords {
	const { channels } = SPACES[space];
	return [
		normalizeChannel(coords[0], channels[0]),
		normalizeChannel(coords[1], channels[1]),
		normalizeChannel(coords[2], channels[2]),
	];
}

/**
 * `normalize`, plus every channel clamped into its space's range — for a colour entering the library
 * (parsing) or leaving it (output). Idempotent, and a no-op for any colour already inside its ranges.
 */
export function clampToRange(space: Space, coords: Coords): Coords {
	const { channels } = SPACES[space];
	return [
		clampChannel(coords[0], channels[0]),
		clampChannel(coords[1], channels[1]),
		clampChannel(coords[2], channels[2]),
	];
}

/**
 * The six colour spaces the library understands, and the channel metadata every other colour module
 * reads off them.
 *
 * One table, six spaces, three channels each. Parsing (what `100%` means in this channel), serialising
 * (which channels are angles) and construction (what to clamp) all consult this table instead of
 * repeating the rules per space — which is what makes a sixth space cost a table row rather than a class.
 *
 * Ranges follow CSS Color 4 where it has an opinion (§4.2 alpha, §7 HSL, §9.4 OKLab/OKLCh): the sRGB and
 * percentage channels clamp, hues wrap instead of clamping, and OKLab's `a`/`b` stay open at both ends
 * while OKLCh's chroma is only closed at the bottom. That asymmetry is deliberate — an out-of-gamut
 * colour is a legitimate intermediate result, and clamping its opponent axes would bend its hue. Bringing
 * such a colour back into sRGB is gamut mapping's job, not the constructor's.
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
	if (channel.hue) return ((value % 360) + 360) % 360;
	return value < channel.min ? channel.min : value > channel.max ? channel.max : value;
}

/**
 * Brings coordinates into their space's ranges: clamping what clamps, wrapping hues, and mapping `NaN`
 * to the channel's floor (0° for a hue) so a bad number can never travel further as a silent `NaN`.
 *
 * Idempotent, and a no-op for any colour already inside its ranges — which is why a conversion may be
 * followed by it without moving an in-gamut colour.
 */
export function normalize(space: Space, coords: Coords): Coords {
	const { channels } = SPACES[space];
	return [
		normalizeChannel(coords[0], channels[0]),
		normalizeChannel(coords[1], channels[1]),
		normalizeChannel(coords[2], channels[2]),
	];
}

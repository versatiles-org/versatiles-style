import { Color } from '../../color/index.js';
import { reportIssue } from './issues.js';

/**
 * Check that `value` is a colour this library can parse, reporting it at `path` if not.
 *
 * Colour options were the one part of the surface no resolver looked at. `resolveColors` and its
 * siblings copy the string through and the first `Color.parse` happens deep in layer building, so
 * `osm({ colors: { water: 'bananas' } })` threw a `ColorParseError` naming only the string, while
 * `osm.validateOptions` of the same object answered `{ ok: true, issues: [] }` — the whole colour
 * surface (45 `colors.*` keys, `sun.color`, `sky.*Color`, `hillshade.*Color`, `recolor.tint/blend`)
 * was invisible to the one call whose job is to report what is wrong.
 *
 * Parsing here fixes both halves at once: the problem is now reported as data with the option path a
 * UI can mark, and the thrown form names the option rather than just the value.
 *
 * Non-strings are left alone deliberately — `Color.parse` also accepts a `Color` instance, and a value
 * of the wrong type entirely is the key/type checks' business, not this one's.
 */
export function checkColor(value: unknown, path: string): boolean {
	if (typeof value !== 'string') return true;
	try {
		Color.parse(value);
		return true;
	} catch (error) {
		reportIssue({ path, message: error instanceof Error ? error.message : `not a valid colour: ${value}` });
		return false;
	}
}

/**
 * `checkColor` for each present key of an options object — the shape most colour options come in.
 *
 * Used where an unparseable colour has no meaningful substitute and the resolved value is discarded
 * anyway (`validateOptions` returns the issues, not the options); `resolveColors` checks key by key
 * instead, because there it can fall back to the palette.
 */
export function checkColors(value: unknown, keys: readonly string[], path: string): void {
	if (value == null || typeof value !== 'object') return;
	const record = value as Record<string, unknown>;
	for (const key of keys) {
		if (record[key] != null) checkColor(record[key], `${path}.${key}`);
	}
}

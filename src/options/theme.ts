import { PALETTES } from '../themes/index.js';

/**
 * A theme name. Each of the five palettes is a light theme and has a dark theme of its own, named
 * with a `-dark` suffix.
 */
export type Palette =
	| 'colorful'
	| 'colorful-dark'
	| 'natural'
	| 'natural-dark'
	| 'muted'
	| 'muted-dark'
	| 'gray'
	| 'gray-dark'
	| 'toner'
	| 'toner-dark';

export type ThemeOptions = Palette;

export type ResolvedTheme = Palette;

/**
 * v5 style names and the v6 theme that reproduces each most closely, chosen by comparing per-colour
 * RGB distance against the published v5 styles (see "Migration from v5" in API_DESIGN.md). `shadow`
 * is the one loose match — v6 has no close equivalent — the other three measure near-exact.
 */
export const V5_STYLE_THEMES = {
	eclipse: 'colorful-dark',
	graybeard: 'gray',
	neutrino: 'muted',
	shadow: 'gray-dark',
} as const satisfies Record<string, Palette>;

// Returns true when the system preference is dark mode.
// In Node.js (no window.matchMedia), always returns false.
export function isDarkMode(): boolean {
	try {
		return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
	} catch {
		return false;
	}
}

/**
 * Reject a palette name the library does not have.
 *
 * Without this, any string passed the `Palette` cast and failed three calls later inside the theme
 * table. The realistic trigger is a v5 style name (`eclipse`, `graybeard`, …) carried over from an
 * old link or config, so those are answered with their v6 theme.
 */
function checkPalette(palette: string, path: string): Palette {
	if ((PALETTES as readonly string[]).includes(palette)) return palette as Palette;
	const v5: string | undefined = Object.prototype.hasOwnProperty.call(V5_STYLE_THEMES, palette)
		? V5_STYLE_THEMES[palette as keyof typeof V5_STYLE_THEMES]
		: undefined;
	throw new Error(
		`${path}: unknown palette "${palette}". Valid palettes: ${PALETTES.join(', ')}.` +
			(v5 === undefined ? '' : ` "${palette}" is a v5 style name — in v6 use "${v5}".`)
	);
}

/**
 * The error for a theme object. Until dark variants became themes of their own, `theme` also took
 * `{ palette, darkMode }`; name the theme such an object asked for, so the fix is a copy and paste.
 */
function themeObjectError(theme: object, defaultPalette: Palette, path: string): Error {
	const { palette, darkMode } = theme as { palette?: unknown; darkMode?: unknown };
	const light = typeof palette === 'string' ? palette : defaultPalette;
	const dark = `${light}-dark`;
	let replacement = `"${light}"`;
	if (darkMode === true) replacement = `"${dark}"`;
	else if (darkMode === 'auto') replacement = `isDarkMode() ? "${dark}" : "${light}"`;
	return new Error(
		`${path}: expected a theme name, not an object — use ${replacement}. ` +
			'Dark variants are themes of their own ("colorful-dark", …); "darkMode" was removed.'
	);
}

/**
 * `defaultPalette` lets a caller pick the fallback without overriding an explicit choice — the
 * satellite overlay defaults to `gray` while `osm()` keeps `colorful`.
 */
export function resolveTheme(
	theme?: ThemeOptions,
	defaultPalette: Palette = 'colorful',
	path = 'theme'
): ResolvedTheme {
	if (theme == null) return defaultPalette;
	if (typeof theme === 'object') throw themeObjectError(theme, defaultPalette, path);
	return checkPalette(String(theme), path);
}

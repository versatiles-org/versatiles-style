import { checkKeys } from './keys.js';
import { PALETTES } from '../themes/index.js';
export type Palette = 'colorful' | 'natural' | 'muted' | 'gray' | 'toner';

export type ThemeOptions =
	| Palette
	| {
			darkMode?: boolean | 'auto';
			palette?: Palette;
	  };

export type ResolvedTheme = {
	palette: Palette;
	darkMode: boolean;
};

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
 * table as "Cannot read properties of undefined (reading 'light')" — the realistic trigger being a
 * v5 style name (`eclipse`, `graybeard`, …) carried over from an old link or config.
 */
function checkPalette(palette: string): Palette {
	if ((PALETTES as readonly string[]).includes(palette)) return palette as Palette;
	throw new Error(
		`theme: unknown palette "${palette}". Valid palettes: ${PALETTES.join(', ')}. ` +
			'v5 style names such as "eclipse" or "graybeard" are not palettes — see "Migration from v5" in API_DESIGN.md.'
	);
}

/**
 * `defaultPalette` lets a caller pick the fallback without overriding an explicit choice — the
 * satellite overlay defaults to `gray` while `osm()` keeps `colorful`. It applies per-field, so
 * `{ darkMode: true }` still gets the caller's palette rather than falling back to `colorful`.
 */
export function resolveTheme(
	theme?: ThemeOptions,
	defaultPalette: Palette = 'colorful',
	path = 'theme'
): ResolvedTheme {
	if (theme == null) return { palette: defaultPalette, darkMode: false };
	if (typeof theme === 'string') return { palette: checkPalette(theme), darkMode: false };
	checkKeys(theme, { darkMode: true, palette: true }, path);
	return {
		palette: theme.palette === undefined ? defaultPalette : checkPalette(theme.palette),
		darkMode: theme.darkMode === 'auto' ? isDarkMode() : (theme.darkMode ?? false),
	};
}

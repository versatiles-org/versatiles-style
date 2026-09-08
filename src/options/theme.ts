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
 * `defaultPalette` lets a caller pick the fallback without overriding an explicit choice — the
 * satellite overlay defaults to `gray` while `osm()` keeps `colorful`. It applies per-field, so
 * `{ darkMode: true }` still gets the caller's palette rather than falling back to `colorful`.
 */
export function resolveTheme(theme?: ThemeOptions, defaultPalette: Palette = 'colorful'): ResolvedTheme {
	if (theme == null) return { palette: defaultPalette, darkMode: false };
	if (typeof theme === 'string') return { palette: theme as Palette, darkMode: false };
	return {
		palette: theme.palette ?? defaultPalette,
		darkMode: theme.darkMode === 'auto' ? isDarkMode() : (theme.darkMode ?? false),
	};
}

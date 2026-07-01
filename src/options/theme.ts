import type { OsmContentOptions } from './osm-content.js';

export type Palette = 'colorful' | 'natural' | 'muted' | 'gray' | 'toner';

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

export function resolveTheme(theme?: OsmContentOptions['theme']): ResolvedTheme {
	if (theme == null) return { palette: 'colorful', darkMode: false };
	if (typeof theme === 'string') return { palette: theme as Palette, darkMode: false };
	return {
		palette: theme.palette ?? 'colorful',
		darkMode: theme.darkMode === 'auto' ? isDarkMode() : (theme.darkMode ?? false),
	};
}

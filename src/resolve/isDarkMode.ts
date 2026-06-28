// Returns true when the system preference is dark mode.
// In Node.js (no window.matchMedia), always returns false.
export function isDarkMode(): boolean {
	try {
		return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
	} catch {
		return false;
	}
}

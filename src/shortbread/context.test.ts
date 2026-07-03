import { describe, expect, it } from 'vitest';
import { buildContext } from './context.js';
import { resolveOsm } from '../options/index.js';
import { PALETTES } from '../themes/index.js';
import type { Color } from '../color/index.js';

function channels(color: Color): [number, number, number] {
	const [r, g, b] = color.asRGB().asArray();
	return [r, g, b];
}
function isBlack(color: Color): boolean {
	const [r, g, b] = channels(color);
	return r === 0 && g === 0 && b === 0;
}
function isWhite(color: Color): boolean {
	const [r, g, b] = channels(color);
	return r === 255 && g === 255 && b === 255;
}

// The `bg` reference (and its inverse `fg`) must be a pure black/white extreme so that the
// blend-based darken/lighten in the layer builders works under both light and dark palettes.
describe('LayerContext background reference (bg / fg)', () => {
	describe.each(PALETTES)('palette "%s"', (palette) => {
		it('bg is pure white and fg pure black in light mode', () => {
			const ctx = buildContext(resolveOsm({ theme: { palette, darkMode: false } }));
			expect(isWhite(ctx.bg)).toBe(true);
			expect(isBlack(ctx.fg)).toBe(true);
		});

		it('bg is pure black and fg pure white in dark mode', () => {
			const ctx = buildContext(resolveOsm({ theme: { palette, darkMode: true } }));
			expect(isBlack(ctx.bg)).toBe(true);
			expect(isWhite(ctx.fg)).toBe(true);
		});
	});

	it('bg is always pure black or white across every palette and mode', () => {
		for (const palette of PALETTES) {
			for (const darkMode of [false, true]) {
				const { bg } = buildContext(resolveOsm({ theme: { palette, darkMode } }));
				expect(isBlack(bg) || isWhite(bg), `bg for ${palette}/${darkMode ? 'dark' : 'light'}`).toBe(true);
			}
		}
	});

	// Guards the invariant against arbitrary `colors.land` overrides: bg must stay a pure extreme
	// and track the mode (not the land's luminosity).
	it('stays pure black/white and mode-driven even with custom land colors', () => {
		const lands = ['#808080', '#7f7f7f', '#123456', '#000000', '#ffffff', 'rgb(10,200,30)'];
		for (const land of lands) {
			for (const darkMode of [false, true]) {
				const { bg } = buildContext(resolveOsm({ colors: { land }, theme: { darkMode } }));
				expect(isBlack(bg) || isWhite(bg), `bg with land=${land} dark=${darkMode}`).toBe(true);
				expect(darkMode ? isBlack(bg) : isWhite(bg), `bg tracks mode with land=${land} dark=${darkMode}`).toBe(true);
			}
		}
	});
});

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
		const dark = palette.endsWith('-dark');

		it(`bg is pure ${dark ? 'black' : 'white'} and fg pure ${dark ? 'white' : 'black'}`, () => {
			const ctx = buildContext(resolveOsm({ theme: palette }));
			expect(dark ? isBlack(ctx.bg) : isWhite(ctx.bg)).toBe(true);
			expect(dark ? isWhite(ctx.fg) : isBlack(ctx.fg)).toBe(true);
		});
	});

	// Guards the invariant against arbitrary `colors.land` overrides: bg must stay a pure extreme
	// and track the theme (not the land's luminosity).
	it('stays pure black/white and theme-driven even with custom land colors', () => {
		const lands = ['#808080', '#7f7f7f', '#123456', '#000000', '#ffffff', 'rgb(10,200,30)'];
		for (const land of lands) {
			for (const theme of ['colorful', 'colorful-dark'] as const) {
				const { bg } = buildContext(resolveOsm({ colors: { land }, theme }));
				const tracksTheme = theme === 'colorful-dark' ? isBlack(bg) : isWhite(bg);
				expect(tracksTheme, `bg with land=${land} theme=${theme}`).toBe(true);
			}
		}
	});
});

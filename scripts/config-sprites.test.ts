import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import config from './config-sprites.js';
import { loadIcons } from './lib/icons.js';

// The sprite config references ~180 icon names across several groups. loadIcons() reads each
// `<icons>/<group>/<name>.svg` and throws if one is missing — so building the icon list is itself
// the existence check. Guards against a name typo silently producing an incomplete sprite sheet.

const dirIcons = new URL('../icons', import.meta.url).pathname;

describe('sprite config', () => {
	it('declares positive integer ratios', () => {
		expect(config.ratios.length).toBeGreaterThan(0);
		for (const r of config.ratios) expect(Number.isInteger(r) && r > 0).toBe(true);
	});

	it.each(Object.keys(config.spritesheets))('every icon referenced by "%s" exists on disk', (sheet) => {
		const sets = config.spritesheets[sheet];
		// Icons live under icons/<sheet>/<group>/. loadIcons throws "icon not found: <path>" on the
		// first missing SVG.
		const icons = loadIcons(sets, join(dirIcons, sheet));
		const expected = Object.values(sets).reduce((n, set) => n + set.names.length, 0);
		expect(icons).toHaveLength(expected);
	});

	it('every group declares a positive size and a non-empty name list', () => {
		for (const sets of Object.values(config.spritesheets)) {
			for (const group of Object.values(sets)) {
				expect(group.size).toBeGreaterThan(0);
				expect(group.names.length).toBeGreaterThan(0);
			}
		}
	});

	// A group declares `size` (the rendered HEIGHT). Sprite.fromIcons derives the width from each
	// SOURCE's width/height attributes — `round(size × w0/h0)` — so a source at the wrong aspect
	// ratio doesn't fail the build, it just lands on the sheet a pixel or two off. These two tests
	// make that silent case loud.
	describe('rendered geometry follows from the source aspect ratio', () => {
		it.each(Object.keys(config.spritesheets))('all icons in a "%s" group render at one size', (sheet) => {
			for (const [group, set] of Object.entries(config.spritesheets[sheet])) {
				const sizes = new Set(set.names.map((name) => renderedSize(sheet, group, name)).map(({ w, h }) => `${w}×${h}`));
				expect([...sizes], `sources in ${sheet}/${group} disagree on aspect ratio`).toHaveLength(1);
			}
		});

		// The pin group's whole point is `icon-anchor: "bottom"` landing the tip on the coordinate,
		// which only works at the aspect it was drawn for: 24×30 sources at size 28 → 22×28.
		it('builds extras pins at 22×28 from 24×30 sources', () => {
			for (const name of config.spritesheets.extras.pin.names) {
				expect(renderedSize('extras', 'pin', name), name).toStrictEqual({ w: 22, h: 28 });
			}
		});
	});
});

/** Rendered size of one icon on the sheet at ratio 1 — the same arithmetic Sprite.fromIcons uses. */
function renderedSize(sheet: string, group: string, name: string): { w: number; h: number } {
	const svg = readFileSync(join(dirIcons, sheet, group, `${name}.svg`), 'utf8');
	const w0 = /<svg[^>]+width="([^"]+)"/.exec(svg);
	const h0 = /<svg[^>]+height="([^"]+)"/.exec(svg);
	if (!w0 || !h0) throw Error(`missing width/height attribute: ${sheet}/${group}/${name}.svg`);

	const { size } = config.spritesheets[sheet][group];
	return {
		w: Math.round((size * parseFloat(w0[1])) / parseFloat(h0[1])),
		h: Math.round(size),
	};
}

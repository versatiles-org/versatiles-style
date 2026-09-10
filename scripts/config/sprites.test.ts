import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import config from './sprites.js';
import type { IconSpec } from '../lib/icons.js';
import { iconSrc, loadIcons, svgSize } from '../lib/icons.js';

// The sprite config maps ~180 sprite names onto source files under `icons/<source>/`. loadIcons()
// reads each one and throws if it is missing — so building the icon list is itself the existence
// check. Guards against a typo'd source path silently producing an incomplete sprite sheet.

const dirIcons = new URL('../../icons', import.meta.url).pathname;

describe('sprite config', () => {
	it('declares positive integer ratios', () => {
		expect(config.ratios.length).toBeGreaterThan(0);
		for (const r of config.ratios) expect(Number.isInteger(r) && r > 0).toBe(true);
	});

	it.each(Object.keys(config.spritesheets))('every icon referenced by "%s" exists on disk', (sheet) => {
		const sets = config.spritesheets[sheet];
		// Sources are addressed by their path under icons/. loadIcons throws "icon not found:
		// <path>" on the first missing SVG.
		const icons = loadIcons(sets, dirIcons);
		const expected = Object.values(sets).reduce((n, set) => n + Object.keys(set.icons).length, 0);
		expect(icons).toHaveLength(expected);
	});

	it('every group declares a positive size and a non-empty name list', () => {
		for (const sets of Object.values(config.spritesheets)) {
			for (const group of Object.values(sets)) {
				expect(group.size).toBeGreaterThan(0);
				expect(Object.keys(group.icons).length).toBeGreaterThan(0);
			}
		}
	});

	// Picker metadata is published inside the sprite JSON for BOTH sheets — `extras` so users can
	// find an icon, `base` so a style editor can offer the ones the style itself draws. An icon
	// without a title is one nobody can identify in a list.
	it('gives every icon a title', () => {
		const untitled: string[] = [];
		for (const [sheet, groups] of Object.entries(config.spritesheets)) {
			for (const [group, set] of Object.entries(groups)) {
				for (const [name, spec] of Object.entries(set.icons)) {
					if (!spec.title) untitled.push(`${sheet}:${group}-${name}`);
				}
			}
		}
		expect(untitled.sort(), `icons with no title:\n${untitled.join('\n')}`).toStrictEqual([]);
	});

	// Aliases exist to be searched, so one repeating the name or the title is dead weight.
	it('never uses an alias that repeats the icon name or its title', () => {
		const echoes: string[] = [];
		for (const [sheet, groups] of Object.entries(config.spritesheets)) {
			for (const [group, set] of Object.entries(groups)) {
				for (const [name, spec] of Object.entries(set.icons)) {
					const own = new Set([name, name.replace(/_/g, ' '), spec.title.toLowerCase()]);
					for (const a of spec.aliases ?? []) {
						if (own.has(a.toLowerCase())) echoes.push(`${sheet}:${group}-${name} → "${a}"`);
					}
				}
			}
		}
		expect(echoes.sort(), `aliases repeating the name or title:\n${echoes.join('\n')}`).toStrictEqual([]);
	});

	// `center` is a fraction of the icon's own box, so it stays valid at every pixel ratio.
	it('keeps every center inside the icon box', () => {
		const bad: string[] = [];
		for (const [sheet, groups] of Object.entries(config.spritesheets)) {
			for (const [group, set] of Object.entries(groups)) {
				for (const [name, spec] of Object.entries(set.icons)) {
					if (!spec.center) continue;
					const [x, y] = spec.center;
					if (!(x >= 0 && x <= 1 && y >= 0 && y <= 1)) bad.push(`${sheet}:${group}-${name} → [${x}, ${y}]`);
				}
			}
		}
		expect(bad.sort(), `centers outside 0..1:\n${bad.join('\n')}`).toStrictEqual([]);
	});

	// A group declares `size` (the rendered HEIGHT). Sprite.fromIcons derives the width from each
	// SOURCE's width/height attributes — `round(size × w0/h0)` — so a source at the wrong aspect
	// ratio doesn't fail the build, it just lands on the sheet a pixel or two off. These two tests
	// make that silent case loud.
	describe('rendered geometry follows from the source aspect ratio', () => {
		it.each(Object.keys(config.spritesheets))('all icons in a "%s" group render at one size', (sheet) => {
			for (const [group, set] of Object.entries(config.spritesheets[sheet])) {
				const sizes = new Set(
					Object.values(set.icons)
						.map((spec) => renderedSize(sheet, group, spec))
						.map(({ w, h }) => `${w}×${h}`)
				);
				expect([...sizes], `sources in ${sheet}/${group} disagree on aspect ratio`).toHaveLength(1);
			}
		});

		// The pin group's whole point is `icon-anchor: "bottom"` landing the tip on the coordinate,
		// which only works at the aspect it was drawn for: 24×30 sources at size 28 → 22×28.
		it('builds extras pins at 22×28 from 24×30 sources', () => {
			for (const [name, spec] of Object.entries(config.spritesheets.extras.pin.icons)) {
				expect(renderedSize('extras', 'pin', spec), name).toStrictEqual({ w: 22, h: 28 });
			}
		});
	});
});

/** Rendered size of one icon on the sheet at ratio 1 — the same arithmetic Sprite.fromIcons uses. */
function renderedSize(sheet: string, group: string, spec: IconSpec): { w: number; h: number } {
	const src = iconSrc(spec);
	// same source of truth as the builder, so a viewBox-only upstream file measures identically
	const { w, h } = svgSize(readFileSync(join(dirIcons, `${src}.svg`), 'utf8'), src);
	const { size } = config.spritesheets[sheet][group];
	return { w: Math.round((size * w) / h), h: Math.round(size) };
}

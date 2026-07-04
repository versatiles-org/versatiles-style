import { describe, expect, it } from 'vitest';
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
});

import { describe, expect, it } from 'vitest';
import type { Palette } from '../../src/options/index.js';
import { PALETTES, getPaletteColors } from '../../src/themes/index.js';
import { generateThemes } from './theme-generator.js';

// src/themes holds the generator's output. A hand edit to a derived table, or a generator change that
// was never written out, would otherwise let the two drift apart unnoticed.
describe('theme generator', () => {
	const generated = generateThemes();

	it('derives every theme except the colorful reference', () => {
		expect(Object.keys(generated).sort()).toStrictEqual(PALETTES.filter((p) => p !== 'colorful').sort());
	});

	it.each(Object.keys(generated))('%s in src/themes matches the generator (run `npm run generate-themes`)', (theme) => {
		expect(getPaletteColors(theme as Palette)).toStrictEqual(generated[theme as Palette]);
	});

	it('is deterministic', () => {
		expect(generateThemes()).toStrictEqual(generated);
	});
});

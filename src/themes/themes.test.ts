import { describe, expect, it } from 'vitest';
import { PALETTES, getPaletteColors, isDarkPalette } from './index.js';
import { colorOptionsKeys } from '../options/index.js';
import type { Palette } from '../options/index.js';

const ALL_KEYS = colorOptionsKeys as ReadonlyArray<string>;
const LIGHT = PALETTES.filter((palette) => !isDarkPalette(palette));

// ── Palette registry ──────────────────────────────────────────────────────────

describe('PALETTES', () => {
	it('lists the five palettes, each followed by its dark theme', () => {
		expect([...PALETTES]).toEqual([
			'colorful',
			'colorful-dark',
			'natural',
			'natural-dark',
			'muted',
			'muted-dark',
			'gray',
			'gray-dark',
			'toner',
			'toner-dark',
		]);
	});

	it('marks exactly the -dark themes as dark', () => {
		expect(LIGHT).toEqual(['colorful', 'natural', 'muted', 'gray', 'toner']);
		expect(PALETTES.filter((palette) => isDarkPalette(palette))).toEqual(LIGHT.map((palette) => `${palette}-dark`));
	});
});

// ── Color key coverage ────────────────────────────────────────────────────────

describe('palette color key coverage', () => {
	for (const palette of PALETTES) {
		it(`${palette} defines all ${ALL_KEYS.length} color keys`, () => {
			const colors = getPaletteColors(palette) as Record<string, unknown>;
			const missing = ALL_KEYS.filter((k) => colors[k] === undefined || colors[k] === null || colors[k] === '');
			expect(missing).toEqual([]);
		});

		it(`${palette} colors are non-empty strings`, () => {
			const colors = getPaletteColors(palette) as Record<string, unknown>;
			for (const key of ALL_KEYS) {
				const val = colors[key];
				expect(typeof val, `${key} should be string`).toBe('string');
				expect((val as string).length, `${key} should be non-empty`).toBeGreaterThan(0);
			}
		});
	}
});

// ── getPaletteColors ─────────────────────────────────────────────────────────

describe('getPaletteColors()', () => {
	it('gives each dark theme a different background from its light theme', () => {
		for (const light of LIGHT) {
			const dark = `${light}-dark` as Palette;
			expect(getPaletteColors(light).background, light).not.toBe(getPaletteColors(dark).background);
		}
	});

	it('gives every theme a distinct background color', () => {
		const bgs = PALETTES.map((p) => getPaletteColors(p).background);
		expect(new Set(bgs).size).toBe(PALETTES.length);
	});
});

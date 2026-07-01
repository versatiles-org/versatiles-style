import { describe, expect, it } from 'vitest';
import { PALETTES, getPaletteColors, getPaletteDefinition } from './index.js';
import { colorOptionsKeys } from '../options/index.js';
import type { Palette } from '../options/index.js';

const ALL_KEYS = colorOptionsKeys as ReadonlyArray<string>;

// ── Palette registry ──────────────────────────────────────────────────────────

describe('PALETTES', () => {
	it('lists exactly the five expected palettes', () => {
		expect([...PALETTES]).toEqual(['colorful', 'natural', 'muted', 'gray', 'toner']);
	});
});

// ── getPaletteDefinition ──────────────────────────────────────────────────────

describe('getPaletteDefinition()', () => {
	for (const palette of PALETTES) {
		it(`${palette} has a light and dark variant`, () => {
			const def = getPaletteDefinition(palette as Palette);
			expect(def.light).toBeDefined();
			expect(def.dark).toBeDefined();
		});
	}
});

// ── Color key coverage ────────────────────────────────────────────────────────

describe('palette color key coverage', () => {
	for (const palette of PALETTES) {
		for (const mode of ['light', 'dark'] as const) {
			it(`${palette}/${mode} defines all ${ALL_KEYS.length} color keys`, () => {
				const colors = getPaletteColors(palette as Palette, mode === 'dark') as Record<string, unknown>;
				const missing = ALL_KEYS.filter((k) => colors[k] === undefined || colors[k] === null || colors[k] === '');
				expect(missing).toEqual([]);
			});

			it(`${palette}/${mode} colors are non-empty strings`, () => {
				const colors = getPaletteColors(palette as Palette, mode === 'dark') as Record<string, unknown>;
				for (const key of ALL_KEYS) {
					const val = colors[key];
					expect(typeof val, `${key} should be string`).toBe('string');
					expect((val as string).length, `${key} should be non-empty`).toBeGreaterThan(0);
				}
			});
		}
	}
});

// ── getPaletteColors ─────────────────────────────────────────────────────────

describe('getPaletteColors()', () => {
	it('returns light colors when darkMode = false', () => {
		const def = getPaletteDefinition('colorful');
		const light = getPaletteColors('colorful', false);
		expect(light.background).toBe(def.light.background);
	});

	it('returns dark colors when darkMode = true', () => {
		const def = getPaletteDefinition('colorful');
		const dark = getPaletteColors('colorful', true);
		expect(dark.background).toBe(def.dark.background);
	});

	it('light and dark backgrounds differ for each palette', () => {
		for (const palette of PALETTES) {
			const light = getPaletteColors(palette as Palette, false);
			const dark = getPaletteColors(palette as Palette, true);
			// background must differ between modes (design invariant)
			expect(light.background, `${palette}: light/dark backgrounds should differ`).not.toBe(dark.background);
		}
	});

	it('each palette has a distinct background color in light mode', () => {
		const bgs = PALETTES.map((p) => getPaletteColors(p as Palette, false).background);
		const unique = new Set(bgs);
		expect(unique.size).toBe(PALETTES.length);
	});
});

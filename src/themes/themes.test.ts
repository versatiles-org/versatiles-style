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

// ── The encoded tables ───────────────────────────────────────────────────────

describe('the encoded tables in tables.ts', () => {
	// Nine of the ten palettes are stored as one comma-separated string of hex digits, decoded against
	// `colorOptionsKeys` by position. Nothing about that is self-checking: a table one value short, or a
	// key added to the middle of the list without regenerating, would silently shift every colour after
	// it onto the wrong key — a wrong style, not an error. The shape of the decoded value is the guard.
	for (const palette of PALETTES) {
		it(`${palette} decodes to ${ALL_KEYS.length} plain hex colours`, () => {
			const colors = getPaletteColors(palette) as Record<string, string>;
			expect(Object.keys(colors)).toHaveLength(ALL_KEYS.length);
			const malformed = ALL_KEYS.filter((key) => !/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(colors[key]));
			expect(malformed).toEqual([]);
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

	// `colorful` used to return the `COLORFUL` constant itself while the other nine decoded a fresh
	// object each call. Since this is public API (`osm.colors`), a caller who edited the palette they
	// were handed — what a style editor does — repainted every later style in the process.
	it('returns a fresh object for every palette, so a caller cannot poison the table', () => {
		for (const palette of PALETTES) {
			expect(getPaletteColors(palette), palette).not.toBe(getPaletteColors(palette));
		}
	});

	it('is unaffected by a caller mutating what it returned', () => {
		const before = getPaletteColors('colorful').water;
		const mine = getPaletteColors('colorful');
		mine.water = '#FF0000';
		expect(getPaletteColors('colorful').water).toBe(before);
	});
});

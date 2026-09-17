import { describe, expect, it } from 'vitest';
import { Color } from '../../src/color/index.js';
import type { Palette } from '../../src/options/index.js';
import { PALETTES, getPaletteColors } from '../../src/themes/index.js';
import { contrast, FIXES, generate, generateThemes, over, parse, type Fix } from './theme-generator.js';

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

	it('reports nothing unapplied for the fixes in force', () => {
		expect(generate().diagnostics).toStrictEqual([]);
	});
});

// ── fixes ─────────────────────────────────────────────────────────────────────

/** Signed contrast of one generated colour against another, as the generator measures it. */
function signedContrast(colors: Record<string, string>, key: string, bg: string): number {
	const land = parse(colors.land);
	return contrast(parse(colors[key]), bg === 'land' ? land : over(parse(colors[bg]), land));
}

const chromaOf = (colors: Record<string, string>, key: string) => Color.parse(colors[key]).oklch.c;

describe('theme fixes', () => {
	const base = generate([]).tables;
	const colors = (tables: typeof base, theme: Palette) => tables[theme] as unknown as Record<string, string>;

	const wateryDark: Fix = {
		keys: ['water'],
		light: { lightness: 0.9 },
		dark: { lightness: 1.1 },
	};

	it('moves a colour the way the multiplier points, oppositely per mode', () => {
		const { tables } = generate([wateryDark]);
		// signed contrast: below 1 is darker than the background, above 1 lighter — so a multiplier below
		// 1 lowers it and one above raises it, whichever side of the land the colour started on
		expect(signedContrast(colors(tables, 'natural'), 'water', 'land')).toBeLessThan(
			signedContrast(colors(base, 'natural'), 'water', 'land')
		);
		expect(signedContrast(colors(tables, 'natural-dark'), 'water', 'land')).toBeGreaterThan(
			signedContrast(colors(base, 'natural-dark'), 'water', 'land')
		);
	});

	it('re-solves a colour that was derived against the one it fixed', () => {
		// `labelWater` is solved against the water, so darkening the water has to move it too — this is
		// what applying a fix to the target rather than to the finished colour buys
		const { tables } = generate([wateryDark]);
		expect(colors(tables, 'natural').labelWater).not.toBe(colors(base, 'natural').labelWater);
		expect(signedContrast(colors(tables, 'natural'), 'labelWater', 'water')).toBeCloseTo(
			signedContrast(colors(base, 'natural'), 'labelWater', 'water'),
			2
		);
	});

	it('leaves colours the fix does not name alone', () => {
		const { tables } = generate([wateryDark]);
		const before = colors(base, 'natural');
		const after = colors(tables, 'natural');
		const moved = Object.keys(before).filter((key) => before[key] !== after[key]);
		expect(moved.sort()).toStrictEqual(['labelWater', 'water']);
	});

	it('scales chroma without touching hue', () => {
		const fix: Fix = { keys: ['natureWood'], light: { chroma: 1.5 } };
		const { tables } = generate([fix]);
		expect(chromaOf(colors(tables, 'natural'), 'natureWood')).toBeGreaterThan(
			chromaOf(colors(base, 'natural'), 'natureWood')
		);
		expect(Color.parse(colors(tables, 'natural').natureWood).oklch.h).toBeCloseTo(
			Color.parse(colors(base, 'natural').natureWood).oklch.h,
			1
		);
	});

	// `blend` is the one adjustment that changes the colour being derived rather than scaling the
	// derivation, so what it has to prove is that everything downstream follows the blended colour
	describe('blend', () => {
		const washed: Fix = { keys: ['natureWood'], light: { blend: 0.5 }, dark: { blend: 0.5 } };

		it('moves a colour toward the land, in chroma and in separation', () => {
			const { tables } = generate([washed]);
			for (const theme of ['natural', 'natural-dark'] as Palette[]) {
				const before = colors(base, theme);
				const after = colors(tables, theme);
				// closer to the land means less separation from it, whichever side it sits on
				expect(Math.abs(Math.log(signedContrast(after, 'natureWood', 'land')))).toBeLessThan(
					Math.abs(Math.log(signedContrast(before, 'natureWood', 'land')))
				);
				expect(chromaOf(after, 'natureWood')).toBeLessThan(chromaOf(before, 'natureWood'));
			}
		});

		it('reaches the land at 1', () => {
			const { tables } = generate([{ keys: ['natureWood'], light: { blend: 1 } }]);
			expect(signedContrast(colors(tables, 'natural'), 'natureWood', 'land')).toBeCloseTo(1, 2);
		});

		it('keeps the reference alpha, so a wash does not turn translucent colours solid', () => {
			// siteConstruction is '#A9A9A91A' in colorful: alpha says what it hides, not how it stands out
			const fix: Fix = { keys: ['siteConstruction'], light: { blend: 0.6 } };
			const { tables } = generate([fix]);
			const alpha = (hex: string) => hex.slice(7);
			expect(alpha(colors(tables, 'natural').siteConstruction)).toBe(alpha(colors(base, 'natural').siteConstruction));
			expect(colors(tables, 'natural').siteConstruction).not.toBe(colors(base, 'natural').siteConstruction);
		});

		it('re-solves a colour derived against the one it blended', () => {
			const { tables } = generate([{ keys: ['water'], light: { blend: 0.4 } }]);
			expect(colors(tables, 'natural').labelWater).not.toBe(colors(base, 'natural').labelWater);
		});

		it('composes with lightness, which is applied after it', () => {
			const blended = generate([{ keys: ['natureWood'], light: { blend: 0.5 } }]).tables;
			const pushed = generate([{ keys: ['natureWood'], light: { blend: 0.5, lightness: 1.15 } }]).tables;
			expect(signedContrast(colors(pushed, 'natural'), 'natureWood', 'land')).toBeGreaterThan(
				signedContrast(colors(blended, 'natural'), 'natureWood', 'land')
			);
		});

		it.each([
			[{ keys: ['water'], light: { blend: 1.5 } }, /fraction from 0 to 1/],
			[{ keys: ['water'], light: { blend: -0.2 } }, /fraction from 0 to 1/],
			[{ keys: ['water'], light: { blend: 0 } }, /changes nothing/],
			[{ keys: ['water'], light: { blend: 0, chroma: 1, lightness: 1 } }, /changes nothing/],
		] as [Fix, RegExp][])('rejects a blend that cannot mean anything (%#)', (fix, message) => {
			expect(() => generate([fix])).toThrow(message);
		});
	});

	it('restricts to the named themes', () => {
		const fix: Fix = { keys: ['water'], light: { lightness: 0.9 }, themes: ['muted'] };
		const { tables } = generate([fix]);
		expect(colors(tables, 'muted').water).not.toBe(colors(base, 'muted').water);
		expect(colors(tables, 'natural').water).toBe(colors(base, 'natural').water);
	});

	// colorful light is the hand-written reference; the generator does not produce it, so a fix has
	// nothing there to act on and must not appear to
	it('cannot reach colorful light, but still applies to colorful-dark', () => {
		const fix: Fix = {
			keys: ['water'],
			light: { lightness: 0.5 },
			dark: { lightness: 0.5 },
			themes: ['colorful'],
		};
		const { tables } = generate([fix]);
		expect(getPaletteColors('colorful').water).toBe('#BFD9F2');
		expect(colors(tables, 'colorful-dark').water).not.toBe(colors(base, 'colorful-dark').water);
	});

	it('rejects a fix that could only have applied to colorful light', () => {
		const fix: Fix = { keys: ['water'], light: { lightness: 0.9 }, themes: ['colorful'] };
		expect(() => generate([fix])).toThrow(/applies to no generated theme/);
	});

	it('rejects two fixes on the same colour in the same theme', () => {
		const one: Fix = { keys: ['water'], light: { lightness: 0.9 } };
		const two: Fix = { keys: ['water', 'glacier'], light: { chroma: 1.2 } };
		expect(() => generate([one, two])).toThrow(/both adjust water in natural/);
	});

	it.each(['land', 'background', 'labelHalo'])('rejects %s, which no contrast target derives', (key) => {
		const fix: Fix = { keys: [key], light: { lightness: 0.9 } };
		expect(() => generate([fix])).toThrow(/cannot reach it/);
	});

	it.each([
		[{ keys: ['nope'], light: { lightness: 0.9 } }, /not a colour key/],
		[{ keys: ['water'], light: { lightness: 0 } }, /positive multiple/],
		[{ keys: ['water'], dark: { chroma: -1 } }, /positive multiple/],
		[{ keys: [], light: { lightness: 0.9 } }, /no keys/],
		[{ keys: ['water'] }, /neither a light nor a dark adjustment/],
		[{ keys: ['water'], light: { lightness: 0.9 }, themes: ['nope'] }, /not a theme/],
	] as [Fix, RegExp][])('rejects a malformed fix (%#)', (fix, message) => {
		expect(() => generate([fix])).toThrow(message);
	});

	it('reports a fix the derivation cannot deliver instead of silently dropping it', () => {
		// nothing can be 50× lighter than its background and still be a colour
		const fix: Fix = { keys: ['natureWood'], light: { lightness: 50 } };
		const { diagnostics } = generate([fix]);
		expect(diagnostics.length).toBeGreaterThan(0);
		expect(diagnostics.every((d) => d.key === 'natureWood')).toBe(true);
		expect(diagnostics[0].message).toMatch(/out of range|cannot reach/);
	});

	it('ships no fix that applies to nothing or collides', () => {
		expect(() => generate(FIXES)).not.toThrow();
	});
});

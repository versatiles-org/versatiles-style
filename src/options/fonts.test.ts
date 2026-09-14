import { describe, expect, it } from 'vitest';
import { FONT_GROUPS, minimizeFonts, resolveFonts, uniformFonts, type FontOptions } from './fonts.js';
import { DEFAULT_FONTS } from './text.js';

const R = 'noto_sans_regular';
const B = 'noto_sans_bold';

/** How many glyph names a tree spells out — what `minimizeFonts` minimises. */
function size(fonts: unknown): number {
	if (fonts === undefined) return 0;
	if (typeof fonts === 'string') return 1;
	return Object.values(fonts as Record<string, unknown>).reduce<number>((sum, child) => sum + size(child), 0);
}

describe('minimizeFonts', () => {
	it('is undefined for the defaults, however they are spelled', () => {
		expect(minimizeFonts(undefined, DEFAULT_FONTS)).toBeUndefined();
		expect(minimizeFonts({}, DEFAULT_FONTS)).toBeUndefined();
		expect(minimizeFonts(DEFAULT_FONTS, DEFAULT_FONTS)).toBeUndefined();
		expect(minimizeFonts({ streets: { refs: B }, pois: { general: B } }, DEFAULT_FONTS)).toBeUndefined();
		expect(minimizeFonts(B, uniformFonts(B))).toBeUndefined();
	});

	it('writes one face everywhere as a string', () => {
		expect(minimizeFonts(uniformFonts('x'), DEFAULT_FONTS)).toBe('x');
		expect(minimizeFonts({ default: 'x', streets: 'x', pois: { general: 'x' } }, DEFAULT_FONTS)).toBe('x');
	});

	it('names a single changed topic, and a changed group as a string', () => {
		expect(minimizeFonts({ water: { rivers: 'x' } }, DEFAULT_FONTS)).toEqual({ water: { rivers: 'x' } });
		expect(minimizeFonts({ water: { lakes: 'x', rivers: 'x' } }, DEFAULT_FONTS)).toEqual({ water: 'x' });
		expect(minimizeFonts({ addresses: 'x' }, DEFAULT_FONTS)).toEqual({ addresses: 'x' });
	});

	it('uses `default` where it saves names', () => {
		expect(minimizeFonts({ streets: { names: 'x', exits: 'x' } }, DEFAULT_FONTS)).toEqual({
			streets: { names: 'x', exits: 'x' },
		});
		expect(minimizeFonts({ default: 'x', water: 'y' }, DEFAULT_FONTS)).toEqual({ default: 'x', water: 'y' });
		// swapped weights: three names instead of eleven
		expect(
			minimizeFonts(
				resolveFonts({ default: B, streets: { refs: R }, pois: { general: R } }, DEFAULT_FONTS),
				DEFAULT_FONTS
			)
		).toEqual({
			default: B,
			streets: { refs: R },
			pois: { general: R },
		});
	});

	it('minimises against the fallback it is given', () => {
		const bold = uniformFonts(B);
		expect(minimizeFonts(DEFAULT_FONTS, bold)).toEqual({ default: R, streets: { refs: B }, pois: { general: B } });
		expect(minimizeFonts({ water: 'x' }, bold)).toEqual({ water: 'x' });
	});

	describe('on random trees', () => {
		// A small deterministic generator, so a failure names a reproducible case.
		let seed = 42;
		const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
		const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
		const FACES = [R, B, 'a', 'b'];

		function randomTree(): FontOptions | undefined {
			const r = random();
			if (r < 0.1) return undefined;
			if (r < 0.2) return pick(FACES);
			const tree: Record<string, unknown> = {};
			if (random() < 0.4) tree.default = pick(FACES);
			if (random() < 0.4) tree.addresses = pick(FACES);
			for (const [group, leaves] of Object.entries(FONT_GROUPS)) {
				const g = random();
				if (g < 0.4) continue;
				if (g < 0.6) {
					tree[group] = pick(FACES);
					continue;
				}
				const node: Record<string, string> = {};
				if (random() < 0.4) node.default = pick(FACES);
				for (const leaf of leaves) if (random() < 0.5) node[leaf] = pick(FACES);
				tree[group] = node;
			}
			return tree as FontOptions;
		}

		const cases = Array.from(
			{ length: 500 },
			(_, i) => [i, randomTree(), pick([DEFAULT_FONTS, uniformFonts(B)])] as const
		);

		it('resolves to the same fonts, is no larger, and is already minimal', () => {
			for (const [i, tree, fallback] of cases) {
				const min = minimizeFonts(tree, fallback);
				const label = `case ${i}: ${JSON.stringify(tree)}`;
				expect(resolveFonts(min, fallback), label).toStrictEqual(resolveFonts(tree, fallback));
				expect(size(min), label).toBeLessThanOrEqual(size(tree));
				expect(minimizeFonts(min, fallback), label).toStrictEqual(min);
			}
		});
	});
});

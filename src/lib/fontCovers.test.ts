import { describe, expect, it } from 'vitest';
import { fontCovers } from './fontCovers.js';

// `codeblocks` as tiles.versatiles.org published them on 2026-09-14. Merged faces publish only their first
// source file's blocks, so Noto Sans lists no Arabic although it is served with it — Arabic is tested
// once that is fixed (issue #132).
const NOTO_SANS = {
	codeblocks:
		'0,2-7,A-52,90-97,10F,1AB-1AC,1C8,1D0-20C,20F-215,218,221,25C,2C6-2C7,2DE-2E5,A64-A69,A70-A7D,A7F,A8F,A92,AB3-AB6,FB0,FE0,FE2,FEF,FFF,1078-107B,1DF0-1DF1',
};
const LIBRE_BASKERVILLE = {
	codeblocks:
		'2-7,A-29,2B-2D,30-33,3B,1D7,1E0-1EF,201-204,207-208,20A-20B,211-212,215,221,226,2C6-2C7,A74,A78-A7A,F6C,FB0',
};

describe('fontCovers', () => {
	it('covers Latin languages with any Latin face', () => {
		for (const language of ['de', 'en', 'fr', 'pl', 'sr-Latn']) {
			expect(fontCovers(NOTO_SANS, language), language).toBe(true);
			expect(fontCovers(LIBRE_BASKERVILLE, language), language).toBe(true);
		}
	});

	it('tells a face with Cyrillic and Greek from one without', () => {
		for (const language of ['ru', 'uk', 'el']) {
			expect(fontCovers(NOTO_SANS, language), language).toBe(true);
			expect(fontCovers(LIBRE_BASKERVILLE, language), language).toBe(false);
		}
	});

	it('reads the script from the whole locale, not only the language', () => {
		expect(fontCovers(LIBRE_BASKERVILLE, 'sr')).toBe(false); // Serbian defaults to Cyrillic
		expect(fontCovers(LIBRE_BASKERVILLE, 'sr-Latn')).toBe(true);
	});

	it('checks Chinese, Japanese and Korean by their own scripts', () => {
		const cjk = { codeblocks: '2-7,304-30F,4E0-9FF' }; // kana and ideographs, no Hangul
		expect(fontCovers(cjk, 'zh')).toBe(true);
		expect(fontCovers(cjk, 'zh-TW')).toBe(true);
		expect(fontCovers(cjk, 'ja')).toBe(true);
		expect(fontCovers(cjk, 'ko')).toBe(false);
		expect(fontCovers(NOTO_SANS, 'ja')).toBe(false);
	});

	it('is undefined when there is nothing to check', () => {
		expect(fontCovers(NOTO_SANS, 'local')).toBeUndefined();
		expect(fontCovers(NOTO_SANS, 'not a locale!')).toBeUndefined();
		expect(fontCovers(NOTO_SANS, 'chr')).toBeUndefined(); // Cherokee: no sample letters
	});

	it('is false for a face with no blocks', () => {
		expect(fontCovers({ codeblocks: '' }, 'de')).toBe(false);
	});
});

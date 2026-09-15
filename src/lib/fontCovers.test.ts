import { describe, expect, it, vi } from 'vitest';
import { FONT_SCRIPTS, LANGUAGE_SAMPLES, fontCovers, fontScripts, languageScript, textScripts } from './fontCovers.js';
import * as lib from '../index.js';

// `codeblocks` as tiles.versatiles.org published them on 2026-09-14. Merged faces publish only their first
// source file's blocks, so Noto Sans lists no Arabic although it is served with it — Arabic is tested
// once that is fixed (issue #132).
const NOTO_SANS = {
	codeblocks:
		'0,2-7,A-52,90-97,10F,1AB-1AC,1C8,1D0-20C,20F-215,218,221,25C,2C6-2C7,2DE-2E5,A64-A69,A70-A7D,A7F,A8F,A92,AB3-AB6,FB0,FE0,FE2,FEF,FFF,1078-107B,1DF0-1DF1',
};
// PT Sans draws Latin, Cyrillic and Greek, but not the Vietnamese letters of Latin Extended-B and Latin
// Extended Additional — the one gap among the Latin languages on tiles.versatiles.org (2026-09-15).
const PT_SANS = {
	codeblocks:
		'2-7,A-17,19,1F,21,23,2B-2D,30,39-3C,40-4F,51-52,1E3,1E5,1E9,201-204,208,20A-20C,211-212,220-222,224,226,25C,2C6,F40,F48-F49,F4C-F4D,F50-F54,F62-F63,F66,F6C-F6D,FB0',
};
// Open Sans lacks Latin Extended-B capitals such as Ə Ɓ Ɗ, and Roboto the dotted-below letters of Yoruba.
const OPEN_SANS = {
	codeblocks:
		'0,2-7,A-17,19-1B,1E-1F,21,23,25,2B-2D,2F-32,38-3D,40-51,5B-5E,1E0,1E3,1E8-1EF,1F4,1FD,200-204,207-20A,210-212,215,220-222,224,226,25C,A7B,AB5,FB0,FB2-FB4,FEF,FFF',
};
const ROBOTO = {
	codeblocks:
		'0,2-7,A-1B,1F,21,23,25,2B-2D,2F-30,32,38-3D,40-51,1E0,1E3,1E8-1EF,1F4,200-204,207-208,20A-20C,210-212,215,220-222,224,226,25A,25C,EE0,F6C,FB0,FEF,FFF',
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

	it('is undefined for a face that lists no blocks, whose coverage is unknown', () => {
		expect(fontCovers({ codeblocks: '' }, 'de')).toBeUndefined();
		expect(fontCovers({ codeblocks: '' }, 'ja')).toBeUndefined();
		expect(fontCovers({ codeblocks: ',' }, 'de')).toBeUndefined();
	});

	it('checks the letters of Vietnamese beyond the Latin samples', () => {
		expect(fontCovers(PT_SANS, 'de')).toBe(true);
		expect(fontCovers(PT_SANS, 'pl')).toBe(true);
		expect(fontCovers(PT_SANS, 'vi')).toBe(false);
		expect(fontCovers(PT_SANS, 'vi-VN')).toBe(false);
		expect(fontCovers(NOTO_SANS, 'vi')).toBe(true);
		expect(fontCovers(LIBRE_BASKERVILLE, 'vi')).toBe(true);
		// the script is still Latin, and PT Sans still covers it
		expect(languageScript('vi')).toBe('Latn');
		expect(fontScripts(PT_SANS)).toContain('Latn');
	});

	it('checks the letters of other languages written with more than the basic alphabet', () => {
		// what the faces on tiles.versatiles.org lack
		expect(fontCovers(OPEN_SANS, 'az')).toBe(false); // Ə
		expect(fontCovers(OPEN_SANS, 'ha')).toBe(false); // Ɓ Ɗ Ƙ
		expect(fontCovers(OPEN_SANS, 'yo')).toBe(false); // ṣ
		expect(fontCovers(ROBOTO, 'az')).toBe(true);
		expect(fontCovers(ROBOTO, 'yo')).toBe(false);
		for (const language of ['pl', 'cs', 'tr', 'ro', 'hu', 'lv', 'uk', 'sr', 'sr-Latn', 'kk']) {
			expect(fontCovers(OPEN_SANS, language), language).toBe(true);
			expect(fontCovers(ROBOTO, language), language).toBe(true);
		}
	});

	it('reads the letters by language and script, so Serbian in Latin and in Cyrillic differ', () => {
		const latinOnly = { codeblocks: '2-7,A-17' };
		expect(fontCovers(latinOnly, 'sr-Latn')).toBe(true);
		expect(fontCovers(latinOnly, 'sr')).toBe(false);
		const cyrillicWithoutSerbian = { codeblocks: '2-7,41-43' }; // Ж ж, but not Ђ Ј Љ …
		expect(fontCovers(cyrillicWithoutSerbian, 'ru')).toBe(true);
		expect(fontCovers(cyrillicWithoutSerbian, 'sr')).toBe(false);
	});

	it("reads 'user' as the browser language, as text.language does", () => {
		vi.stubGlobal('navigator', { language: 'ru-RU' });
		try {
			expect(fontCovers(NOTO_SANS, 'user')).toBe(true);
			expect(fontCovers(LIBRE_BASKERVILLE, 'user')).toBe(false);
		} finally {
			vi.unstubAllGlobals();
		}
		vi.stubGlobal('navigator', undefined);
		try {
			expect(fontCovers(NOTO_SANS, 'user')).toBeUndefined(); // no browser: local names
		} finally {
			vi.unstubAllGlobals();
		}
	});
});

describe('FONT_SCRIPTS', () => {
	it('lists the checkable scripts as ISO 15924 codes, in a fixed order, Latin first', () => {
		expect(FONT_SCRIPTS[0]).toBe('Latn');
		expect(FONT_SCRIPTS).toContain('Cyrl');
		expect(FONT_SCRIPTS).toContain('Jpan');
		expect(new Set(FONT_SCRIPTS).size).toBe(FONT_SCRIPTS.length);
		for (const code of FONT_SCRIPTS) expect(code, code).toMatch(/^[A-Z][a-z]{3}$/);
		expect(Object.isFrozen(FONT_SCRIPTS)).toBe(true);
	});

	it('is exported from the package, with fontScripts and languageScript', () => {
		expect(lib.FONT_SCRIPTS).toBe(FONT_SCRIPTS);
		expect(lib.fontScripts).toBe(fontScripts);
		expect(lib.languageScript).toBe(languageScript);
		expect(lib.textScripts).toBe(textScripts);
	});
});

describe('fontScripts', () => {
	it('lists the scripts a face covers, in the order of FONT_SCRIPTS', () => {
		expect(fontScripts(LIBRE_BASKERVILLE)).toStrictEqual(['Latn']);
		expect(fontScripts(PT_SANS)).toStrictEqual(['Latn', 'Cyrl', 'Grek']);
		const noto = fontScripts(NOTO_SANS);
		expect(noto.slice(0, 3)).toStrictEqual(['Latn', 'Cyrl', 'Grek']);
		expect(noto).not.toContain('Arab'); // see the note on NOTO_SANS
		expect(noto).toStrictEqual(FONT_SCRIPTS.filter((script) => noto.includes(script)));
	});

	it('agrees with fontCovers for the languages that need no letters beyond their script', () => {
		const cjk = { codeblocks: '2-7,304-30F,4E0-9FF' };
		for (const face of [NOTO_SANS, LIBRE_BASKERVILLE, PT_SANS, cjk]) {
			for (const language of ['de', 'ru', 'el', 'he', 'ar', 'hi', 'th', 'ka', 'zh', 'ja', 'ko']) {
				const script = languageScript(language)!;
				expect(fontScripts(face).includes(script), `${language} ${face.codeblocks}`).toBe(fontCovers(face, language));
			}
		}
	});

	it('is empty for a face with no blocks', () => {
		expect(fontScripts({ codeblocks: '' })).toStrictEqual([]);
	});
});

describe('languageScript', () => {
	it('places a language in its script, reading the whole locale', () => {
		expect(languageScript('de')).toBe('Latn');
		expect(languageScript('uk')).toBe('Cyrl');
		expect(languageScript('el')).toBe('Grek');
		expect(languageScript('sr')).toBe('Cyrl');
		expect(languageScript('sr-Latn')).toBe('Latn');
		expect(languageScript('ja')).toBe('Jpan');
	});

	it('writes Chinese as Hani and Korean as Hangul', () => {
		expect(languageScript('zh')).toBe('Hani');
		expect(languageScript('zh-TW')).toBe('Hani');
		expect(languageScript('ko')).toBe('Hang');
	});

	it("resolves 'user' to the browser language", () => {
		vi.stubGlobal('navigator', { language: 'el-GR' });
		try {
			expect(languageScript('user')).toBe('Grek');
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('is undefined for local, for what Intl cannot place, and for scripts outside FONT_SCRIPTS', () => {
		expect(languageScript('local')).toBeUndefined();
		expect(languageScript('not a locale!')).toBeUndefined();
		expect(languageScript('chr')).toBeUndefined(); // Cherokee
	});
});

describe('textScripts', () => {
	it('lists the scripts that occur in a text, in the order of FONT_SCRIPTS', () => {
		expect(textScripts('Berlin')).toStrictEqual(['Latn']);
		expect(textScripts('Москва')).toStrictEqual(['Cyrl']);
		expect(textScripts('Αθήνα / Athens / Атина')).toStrictEqual(['Latn', 'Cyrl', 'Grek']);
		expect(textScripts('القاهرة')).toStrictEqual(['Arab']);
		expect(textScripts('서울')).toStrictEqual(['Hang']);
		expect(textScripts('北京')).toStrictEqual(['Hani']);
	});

	it('writes Japanese kana as Jpan and kanji as Hani', () => {
		expect(textScripts('東京タワー')).toStrictEqual(['Hani', 'Jpan']);
		expect(textScripts('ひらがな')).toStrictEqual(['Jpan']);
		expect(textScripts('東京')).toStrictEqual(['Hani']);
	});

	it('counts no script for digits, punctuation and spaces, or for scripts outside FONT_SCRIPTS', () => {
		expect(textScripts('')).toStrictEqual([]);
		expect(textScripts('A7 – 12, (3)')).toStrictEqual(['Latn']);
		expect(textScripts('112 – 3.5 · ½')).toStrictEqual([]);
		expect(textScripts('ᏣᎳᎩ')).toStrictEqual([]); // Cherokee
	});

	it('names a script for text in every language languageScript places', () => {
		const samples: Record<string, string> = {
			de: 'Straße',
			ru: 'улица',
			el: 'οδός',
			he: 'רחוב',
			ar: 'شارع',
			hi: 'सड़क',
			th: 'ถนน',
			ka: 'ქუჩა',
			zh: '街道',
			ko: '거리',
		};
		for (const [language, text] of Object.entries(samples)) {
			expect(textScripts(text), language).toContain(languageScript(language));
		}
		// Japanese needs both, as fontScripts does
		expect(textScripts('通り')).toStrictEqual(['Hani', 'Jpan']);
		expect(languageScript('ja')).toBe('Jpan');
	});

	it('gives the same answer when called again, since the patterns keep no state', () => {
		expect(textScripts('Wien')).toStrictEqual(['Latn']);
		expect(textScripts('Wien')).toStrictEqual(['Latn']);
	});
});

describe('LANGUAGE_SAMPLES', () => {
	const entries = Object.entries(LANGUAGE_SAMPLES);

	it.each(entries)(
		'%s is a language written in a script of FONT_SCRIPTS, with letters of that script',
		(key, letters) => {
			const [language, script] = key.split('-');
			expect(FONT_SCRIPTS).toContain(script);
			expect(key).toBe(`${language}-${script}`);
			expect(languageScript(key)).toBe(script);
			expect(new Intl.Locale(key).maximize().language).toBe(language);
			expect(textScripts(letters)).toStrictEqual([script]);
			for (const letter of letters) expect(textScripts(letter), `${key} ${letter}`).toStrictEqual([script]);
		}
	);

	it.each(entries)('%s is not covered by a face with only the letters of its script', (key) => {
		const scriptOnly = { Latn: '4,6,E', Cyrl: '41,43', Arab: '62' }[key.split('-')[1]]!;
		expect(fontCovers({ codeblocks: scriptOnly }, key)).toBe(false);
		expect(fontCovers({ codeblocks: '0-FFF' }, key)).toBe(true);
	});
});

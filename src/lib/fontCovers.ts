import type { FontFaceInfo } from './fetchFontFaces.js';
import { labelLanguage } from '../options/text.js';

/**
 * Sample letters per script (ISO 15924 code): a face covers a script when it has the blocks of all of
 * them. A few letters, not whole ranges — enough to tell a Latin-only face from one that draws Cyrillic,
 * while `codeblocks` is too coarse (16 codepoints a block) for anything finer to mean more.
 */
const SCRIPT_SAMPLES: Readonly<Record<string, readonly number[]>> = {
	Latn: [0x41, 0x61, 0xe9], // A a é
	Cyrl: [0x416, 0x436], // Ж ж
	Grek: [0x391, 0x3b1], // Α α
	Armn: [0x531, 0x561], // Ա ա
	Hebr: [0x5d0], // א
	Arab: [0x627, 0x628], // ا ب
	Syrc: [0x710], // ܐ
	Thaa: [0x780], // ހ
	Deva: [0x915], // क
	Beng: [0x995], // ক
	Guru: [0xa15], // ਕ
	Gujr: [0xa95], // ક
	Orya: [0xb15], // କ
	Taml: [0xb95], // க
	Telu: [0xc15], // క
	Knda: [0xc95], // ಕ
	Mlym: [0xd15], // ക
	Sinh: [0xd9a], // ක
	Thai: [0xe01], // ก
	Laoo: [0xe81], // ກ
	Tibt: [0xf40], // ཀ
	Mymr: [0x1000], // က
	Geor: [0x10d0], // ა
	Ethi: [0x1200], // ሀ
	Khmr: [0x1780], // ក
	Mong: [0x1820], // ᠠ
	Hang: [0xac00], // 가
	Hani: [0x4e00, 0x4e2d], // 一 中
	Jpan: [0x3042, 0x30a2, 0x4e00], // あ ア 一
};

/**
 * Letters a language needs beyond its script's samples, by language subtag. A script's few samples tell
 * a Latin face from a Cyrillic one, but not whether a Latin face has every letter of every language
 * written in Latin, so a language gets its own letters where a face can lack them.
 *
 * Listed only where a face on the VersaTiles glyph server does lack them (checked 2026-09-15 against its
 * `font_families.json`): Polish, Czech, Turkish, Romanian and Hungarian letters were in all 187 faces,
 * while PT Sans lacks the Vietnamese letters, which sit in Latin Extended-B and Latin Extended Additional.
 */
const LANGUAGE_SAMPLES: Readonly<Record<string, readonly number[]>> = {
	vi: [0x1a1, 0x1b0, 0x1ea1, 0x1ec7], // ơ ư ạ ệ
};

/** Scripts a locale maximises to that are written with the samples of another. */
const SCRIPT_ALIASES: Readonly<Record<string, string>> = {
	Hans: 'Hani',
	Hant: 'Hani',
	Kore: 'Hang', // map labels in Korean are written in Hangul
};

/** `"0,2-7,A-2E"` → the covered 16-codepoint block ranges. */
function parseCodeblocks(codeblocks: string): [number, number][] {
	return codeblocks
		.split(',')
		.filter((part) => part !== '')
		.map((part) => {
			const [from, to = from] = part.split('-');
			return [parseInt(from, 16), parseInt(to, 16)];
		});
}

/**
 * The scripts `fontCovers` and `fontScripts` can check, as ISO 15924 codes (`'Latn'`, `'Cyrl'`, `'Grek'`,
 * …), in a fixed order: roughly by Unicode block, Latin first.
 */
export const FONT_SCRIPTS: readonly string[] = Object.freeze(Object.keys(SCRIPT_SAMPLES));

/** Whether every sample letter falls into one of the covered blocks. */
function hasSamples(blocks: [number, number][], samples: readonly number[]): boolean {
	return samples.every((codepoint) => {
		const block = codepoint >> 4;
		return blocks.some(([from, to]) => block >= from && block <= to);
	});
}

/**
 * The scripts of `FONT_SCRIPTS` a face has the glyphs for, in that order — for filtering a font picker by
 * writing system. `[]` for a face that publishes no blocks.
 *
 * Coverage is read from the `codeblocks` the glyph server lists for the face in its `font_families.json`
 * (see `fetchFontFaces`), by checking a few sample letters of each script. It is a hint for a font picker,
 * not a guarantee: the blocks are coarse, and a merged face may list only its first source file's blocks.
 */
export function fontScripts(face: Pick<FontFaceInfo, 'codeblocks'>): string[] {
	const blocks = parseCodeblocks(face.codeblocks);
	return FONT_SCRIPTS.filter((script) => hasSamples(blocks, SCRIPT_SAMPLES[script]));
}

/**
 * The script of `FONT_SCRIPTS` labels in `language` are written in, from `Intl.Locale` (`ja` → `'Jpan'`,
 * `uk` → `'Cyrl'`, `sr-Latn` → `'Latn'`). Simplified and traditional Chinese both count as `'Hani'`, and
 * Korean as `'Hang'`, since map labels in Korean are written in Hangul.
 *
 * `'user'` is the browser's language first, as for `text.language`. `undefined` for `'local'`, which shows
 * every name in its own script; for a language `Intl` cannot place in a script; and for a script outside
 * `FONT_SCRIPTS`.
 */
export function languageScript(language: string): string | undefined {
	return placeLanguage(language)?.script;
}

/** The language subtag and the `FONT_SCRIPTS` script of `language`, or `undefined` as in `languageScript`. */
function placeLanguage(language: string): { language: string; script: string } | undefined {
	const resolved = labelLanguage(language);
	if (resolved === 'local') return undefined;
	let locale: Intl.Locale;
	try {
		locale = new Intl.Locale(resolved).maximize();
	} catch {
		return undefined;
	}
	if (locale.script === undefined) return undefined;
	const script = SCRIPT_ALIASES[locale.script] ?? locale.script;
	return Object.hasOwn(SCRIPT_SAMPLES, script) ? { language: locale.language, script } : undefined;
}

/**
 * The characters of each script in `FONT_SCRIPTS`, by Unicode `Script` property. Japanese is not a
 * Unicode script, so `Jpan` is its kana; kanji are Han and count as `Hani`. `Script` rather than
 * `Script_Extensions`, so digits and punctuation, which belong to no one script, count as none.
 */
const SCRIPT_PATTERNS: Readonly<Record<string, RegExp>> = Object.fromEntries(
	FONT_SCRIPTS.map((script) => [
		script,
		new RegExp(script === 'Jpan' ? '[\\p{Script=Hira}\\p{Script=Kana}]' : `\\p{Script=${script}}`, 'u'),
	])
);

/**
 * The scripts of `FONT_SCRIPTS` that occur in `text`, in that order — e.g. for the labels a map shows,
 * to pick the fonts that can write them. Japanese text with kanji and kana is `['Hani', 'Jpan']`, matching
 * `fontScripts`, whose `Jpan` needs both. `[]` for text of digits, punctuation or scripts outside
 * `FONT_SCRIPTS` only.
 */
export function textScripts(text: string): string[] {
	return FONT_SCRIPTS.filter((script) => SCRIPT_PATTERNS[script].test(text));
}

/**
 * Whether a face has the glyphs to write labels in `language` — for a warning in a font picker, not a
 * guarantee.
 *
 * The language's script comes from `languageScript`, so `language` can be any `text.language`, `'user'`
 * included. The face needs the script's sample letters, and for a language whose letters a face can lack
 * — Vietnamese — that language's own letters too, so a Latin face may cover `'de'` but not `'vi'`.
 * Coverage is read, as in `fontScripts`, from the `codeblocks` the glyph server lists for the face in its
 * `font_families.json`. `undefined` when there is nothing to check against: `local`, a language
 * `Intl` cannot place in a script, or a script this table has no sample letters for.
 *
 * MapLibre GL JS draws CJK ideographs, Hangul and kana with a local browser font by default
 * (`localIdeographFontFamily`), so a `false` for Chinese, Japanese or Korean matters to MapLibre Native,
 * not to GL JS in its default setting.
 */
export function fontCovers(face: Pick<FontFaceInfo, 'codeblocks'>, language: string): boolean | undefined {
	const placed = placeLanguage(language);
	if (placed === undefined) return undefined;
	const blocks = parseCodeblocks(face.codeblocks);
	const own = Object.hasOwn(LANGUAGE_SAMPLES, placed.language) ? LANGUAGE_SAMPLES[placed.language] : [];
	return hasSamples(blocks, SCRIPT_SAMPLES[placed.script]) && hasSamples(blocks, own);
}

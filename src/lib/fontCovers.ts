import type { FontFaceInfo } from './fetchFontFaces.js';

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
 * Whether a face has the glyphs to write labels in `language`, from the `codeblocks` a glyph server
 * publishes — for a warning in a font picker, not a guarantee.
 *
 * The language's script comes from `Intl.Locale` (`ja` → Japanese, `uk` → Cyrillic, `sr-Latn` → Latin).
 * `undefined` when there is nothing to check against: `local`, which shows every name in its own script;
 * a language `Intl` cannot place in a script; or a script this table has no sample letters for.
 *
 * MapLibre GL JS draws CJK ideographs, Hangul and kana with a local browser font by default
 * (`localIdeographFontFamily`), so a `false` for Chinese, Japanese or Korean matters to MapLibre Native,
 * not to GL JS in its default setting.
 */
export function fontCovers(face: Pick<FontFaceInfo, 'codeblocks'>, language: string): boolean | undefined {
	if (language === 'local') return undefined;
	let script: string | undefined;
	try {
		script = new Intl.Locale(language).maximize().script;
	} catch {
		return undefined;
	}
	if (script === undefined) return undefined;
	const samples = SCRIPT_SAMPLES[SCRIPT_ALIASES[script] ?? script];
	if (samples === undefined) return undefined;

	const blocks = parseCodeblocks(face.codeblocks);
	return samples.every((codepoint) => {
		const block = codepoint >> 4;
		return blocks.some(([from, to]) => block >= from && block <= to);
	});
}

import { checkKeys } from './keys.js';
import { resolveFonts, uniformFonts, type FontOptions, type ResolvedFonts } from './fonts.js';
import type { KnownFontName } from './font-names.js';

export type TextOptions = {
	language?: string;
	languageStrict?: boolean;
	fonts?: FontOptions;
};

export type ResolvedText = {
	language: string;
	languageStrict: boolean;
	fonts: ResolvedFonts;
};

// `satisfies` fails the typecheck if the glyph server stops publishing a default face.
export const DEFAULT_FONT_REGULAR = 'noto_sans_regular' satisfies KnownFontName;
export const DEFAULT_FONT_BOLD = 'noto_sans_bold' satisfies KnownFontName;

/** The fonts of `osm()`, `omt()` and `protomaps()`: regular, with motorway refs and POI names in bold. */
export const DEFAULT_FONTS: ResolvedFonts = resolveFonts(
	{ streets: { refs: DEFAULT_FONT_BOLD }, pois: { general: DEFAULT_FONT_BOLD } },
	uniformFonts(DEFAULT_FONT_REGULAR)
);

/**
 * `fontDefaults` is what an unset font topic falls back to — `DEFAULT_FONTS`, or the satellite
 * overlay's all-bold fonts — so an overlay caller who sets one topic keeps the overlay's others.
 */
export function resolveText(
	text?: TextOptions,
	path = 'text',
	fontDefaults: ResolvedFonts = DEFAULT_FONTS
): ResolvedText {
	checkKeys(text, { language: true, languageStrict: true, fonts: true }, path);
	let language = text?.language ?? 'local';
	if (language === 'user') {
		language = (typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : undefined) ?? 'local';
	}
	return {
		language,
		languageStrict: text?.languageStrict ?? false,
		fonts: resolveFonts(text?.fonts, fontDefaults, `${path}.fonts`),
	};
}

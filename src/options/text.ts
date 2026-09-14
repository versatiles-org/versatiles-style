import { checkKeys } from './keys.js';
import { resolveFonts, uniformFonts, type FontOptions, type ResolvedFonts } from './fonts.js';

export type TextOptions = {
	/** `'local'` (each feature's own name), `'user'` (the browser language), or a code such as `'de'`. Default `'local'`. */
	language?: string;
	/** Omit labels that have no name in `language`, instead of falling back to the local name. Default `false`. */
	languageStrict?: boolean;
	/** A glyph name per label topic — see `FontOptions`. Default: Noto Sans, bold for motorway refs and POI names. */
	fonts?: FontOptions;
};

export type ResolvedText = {
	language: string;
	languageStrict: boolean;
	fonts: ResolvedFonts;
};

export const DEFAULT_FONT_REGULAR = 'noto_sans_regular';
export const DEFAULT_FONT_BOLD = 'noto_sans_bold';

/** The fonts of `osm()`, `omt()` and `protomaps()`: regular, with motorway refs and POI names in bold. */
export const DEFAULT_FONTS: ResolvedFonts = resolveFonts(
	{ streets: { refs: DEFAULT_FONT_BOLD }, pois: { general: DEFAULT_FONT_BOLD } },
	uniformFonts(DEFAULT_FONT_REGULAR)
);

/**
 * The language labels are drawn in: `'user'` becomes the browser's language (`'de'` for `de-AT`), or
 * `'local'` where there is no browser. Every other value is returned as it is.
 */
export function labelLanguage(language: string): string {
	if (language !== 'user') return language;
	return (typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : undefined) || 'local';
}

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
	return {
		// `'user'` stays as it is: the resolved options are stored and shared, so they must not carry
		// the browser language of whoever resolved them. `labelLanguage` reads it at build time.
		language: text?.language ?? 'local',
		languageStrict: text?.languageStrict ?? false,
		fonts: resolveFonts(text?.fonts, fontDefaults, `${path}.fonts`),
	};
}

import { checkKeys } from './keys.js';
export type TextOptions = {
	language?: string;
	languageStrict?: boolean;
	fontNormal?: string;
	fontBold?: string;
};

export type ResolvedText = {
	language: string;
	languageStrict: boolean;
	fontNormal: string;
	fontBold: string;
};

const DEFAULT_FONT_NORMAL = 'noto_sans_regular';
const DEFAULT_FONT_BOLD = 'noto_sans_bold';

export function resolveText(text?: TextOptions, path = 'text'): ResolvedText {
	checkKeys(text, { language: true, languageStrict: true, fontNormal: true, fontBold: true }, path);
	let language = text?.language ?? 'local';
	if (language === 'user') {
		language = (typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : undefined) ?? 'local';
	}
	return {
		language,
		languageStrict: text?.languageStrict ?? false,
		fontNormal: text?.fontNormal ?? DEFAULT_FONT_NORMAL,
		fontBold: text?.fontBold ?? DEFAULT_FONT_BOLD,
	};
}

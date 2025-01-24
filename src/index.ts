export { colorful, eclipse, graybeard, neutrino, type StyleBuilderFunction } from './styles/index';
import { colorful, eclipse, graybeard, neutrino } from './styles/index';
export const styles = {
	colorful,
	eclipse,
	graybeard,
	neutrino,
};

export type { GuessStyleOptions } from './guess_style/index';
export type { RGB, HSL, HSV, RandomColorOptions } from './color/index';
export type { TileJSONSpecification, TileJSONSpecificationRaster, TileJSONSpecificationVector } from './types/tilejson';
export type { VectorLayer } from './types/index';
export type { StyleBuilderOptions, StyleBuilderColorStrings, Language, StyleBuilderColors, StyleRule, StyleRuleValue, StyleRules, StyleRulesOptions, StyleBuilderColorKeys, StyleBuilderFonts, StyleBuilderFontKeys } from './style_builder/types';
export type { RecolorOptions } from './style_builder/recolor';
export type { StyleBuilder } from './style_builder/style_builder';

export { guessStyle } from './guess_style/index';
export { Color } from './color/index';

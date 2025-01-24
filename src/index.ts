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
export type { StyleBuilderOptions, Language, StyleBuilderColors, StyleBuilderColorsEnsured, StyleBuilderFonts } from './style_builder/types';
export type { RecolorOptions } from './style_builder/recolor';

export { guessStyle } from './guess_style/index';
export { Color } from './color/index';

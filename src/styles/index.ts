import type { StyleBuilder } from '../style_builder/style_builder.js';
import type { StyleBuilderOptions } from '../style_builder/types.js';
import { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';



// import styles
import Colorful from './colorful.js';
import Colorfancy from './colorfancy.js';
import Eclipse from './eclipse.js';
import Graybeard from './graybeard.js';
import Neutrino from './neutrino.js';
import Empty from './empty.js';

export interface StyleBuilderFunction {
	(options?: StyleBuilderOptions): StyleSpecification;
	getOptions(): StyleBuilderOptions;
}

function getStyleBuilder(styleBuilder: new () => StyleBuilder): StyleBuilderFunction {
	const fn = function (options?: StyleBuilderOptions): StyleSpecification {
		return new styleBuilder().build(options);
	};
	fn.getOptions = (): StyleBuilderOptions => new styleBuilder().getDefaultOptions();
	return fn;
}


// generate style builders
export const colorful = getStyleBuilder(Colorful);
export const colorfancy = getStyleBuilder(Colorfancy);
export const eclipse = getStyleBuilder(Eclipse);
export const graybeard = getStyleBuilder(Graybeard);
export const neutrino = getStyleBuilder(Neutrino);
export const empty = getStyleBuilder(Empty);

import type { StyleBuilder } from '../style_builder/style_builder';
import type { StyleBuilderOptions } from '../style_builder/types';
import { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';



// import styles
import Colorful from './colorful';
import Eclipse from './eclipse';
import Graybeard from './graybeard';
import Neutrino from './neutrino';
import Empty from './empty';


function getStyleBuilder(styleBuilder: new () => StyleBuilder) {
	const fn = function (options?: StyleBuilderOptions): StyleSpecification {
		return new styleBuilder().build(options);
	};
	fn.getOptions = (): StyleBuilderOptions => new styleBuilder().getDefaultOptions();
	return fn;
}


// generate style builders
export const colorful = getStyleBuilder(Colorful);
export const eclipse = getStyleBuilder(Eclipse);
export const graybeard = getStyleBuilder(Graybeard);
export const neutrino = getStyleBuilder(Neutrino);
export const empty = getStyleBuilder(Empty);

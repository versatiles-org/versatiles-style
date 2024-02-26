import type StyleBuilder from '../style_builder/style_builder.js';
import type { StyleBuilderOptions } from '../style_builder/types.js';
import type { MaplibreStyle } from '../types/maplibre.js';
export type { StyleBuilderOptions, MaplibreStyle };

import Colorful from './colorful.js';
import Graybeard from './graybeard.js';
import Neutrino from './neutrino.js';

type MakeStyle<T extends StyleBuilder<T>> =
	((options?: StyleBuilderOptions<T>) => MaplibreStyle) &
	{ 
		getOptions: () => StyleBuilderOptions<T>;
	};

function makeStyle<T extends StyleBuilder<T>>(styleBuilder: new () => T): MakeStyle<T> {
	const fn = function (options?: StyleBuilderOptions<T>): MaplibreStyle {
		return new styleBuilder().build(options);
	};
	fn.getOptions = (): StyleBuilderOptions<T> => new styleBuilder().getDefaultOptions();
	return fn;
}

export const colorful = makeStyle<Colorful>(Colorful);
export const graybeard = makeStyle<Graybeard>(Graybeard);
export const neutrino = makeStyle<Neutrino>(Neutrino);

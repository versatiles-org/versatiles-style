import type StyleBuilder from '../style_builder/style_builder.js';
import type { StyleBuilderOptions } from '../style_builder/types.js';
import type { MaplibreStyle } from '../types/maplibre.js';
export type { MaplibreStyle };

import Colorful from './colorful.js';
import Graybeard from './graybeard.js';
import Neutrino from './neutrino.js';



export type ColorfulOptions = StyleBuilderOptions<Colorful>;
export type GraybeardOptions = StyleBuilderOptions<Graybeard>;
export type NeutrinoOptions = StyleBuilderOptions<Neutrino>;

export type SomeOptions = ColorfulOptions | GraybeardOptions | NeutrinoOptions;



type MakeStyle<T extends StyleBuilder<T>, O extends StyleBuilderOptions<T>> =
	((options?: O) => MaplibreStyle) &
	{
		getOptions: () => O;
	};

export type ColorfulBuilder = MakeStyle<Colorful, ColorfulOptions>;
export type GraybeardBuilder = MakeStyle<Graybeard, GraybeardOptions>;
export type NeutrinoBuilder = MakeStyle<Neutrino, NeutrinoOptions>;

export type SomeBuilder = ColorfulBuilder | GraybeardBuilder | NeutrinoBuilder;



function makeStyle<T extends StyleBuilder<T>>(styleBuilder: new () => T): MakeStyle<T, StyleBuilderOptions<T>> {
	const fn = function (options?: StyleBuilderOptions<T>): MaplibreStyle {
		return new styleBuilder().build(options);
	};
	fn.getOptions = (): StyleBuilderOptions<T> => new styleBuilder().getDefaultOptions();
	return fn;
}

export const colorful: ColorfulBuilder = makeStyle<Colorful>(Colorful);
export const graybeard: GraybeardBuilder = makeStyle<Graybeard>(Graybeard);
export const neutrino: NeutrinoBuilder = makeStyle<Neutrino>(Neutrino);

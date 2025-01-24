import type { StyleBuilder } from '../style_builder/style_builder';
import type { StyleBuilderOptions } from '../style_builder/types';
import { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';



// import styles
import Colorful from './colorful';
import Eclipse from './eclipse';
import Graybeard from './graybeard';
import Neutrino from './neutrino';
import Empty from './empty';


// generate style option types
export type ColorfulOptions = StyleBuilderOptions<Colorful>;
export type EclipseOptions = StyleBuilderOptions<Eclipse>;
export type GraybeardOptions = StyleBuilderOptions<Graybeard>;
export type NeutrinoOptions = StyleBuilderOptions<Neutrino>;
export type EmptyOptions = StyleBuilderOptions<Empty>;

export type SomeOptions = ColorfulOptions | EclipseOptions | EmptyOptions | GraybeardOptions | NeutrinoOptions;


// generate style builder types
export type MakeStyle<T extends StyleBuilder<T>, O extends StyleBuilderOptions<T>> =
	((options?: O) => StyleSpecification) &
	{
		getOptions: () => O;
	};

export type ColorfulBuilder = MakeStyle<Colorful, ColorfulOptions>;
export type EclipseBuilder = MakeStyle<Eclipse, EclipseOptions>;
export type GraybeardBuilder = MakeStyle<Graybeard, GraybeardOptions>;
export type NeutrinoBuilder = MakeStyle<Neutrino, NeutrinoOptions>;
export type EmptyBuilder = MakeStyle<Empty, EmptyOptions>;

export type SomeBuilder = ColorfulBuilder | EclipseBuilder | EmptyBuilder | GraybeardBuilder | NeutrinoBuilder;



function getStyleBuilder<T extends StyleBuilder<T>>(styleBuilder: new () => T): MakeStyle<T, StyleBuilderOptions<T>> {
	const fn = function (options?: StyleBuilderOptions<T>): StyleSpecification {
		return new styleBuilder().build(options);
	};
	fn.getOptions = (): StyleBuilderOptions<T> => new styleBuilder().getDefaultOptions();
	return fn;
}


// generate style builders
export const colorful: ColorfulBuilder = getStyleBuilder<Colorful>(Colorful);
export const eclipse: EclipseBuilder = getStyleBuilder<Eclipse>(Eclipse);
export const graybeard: GraybeardBuilder = getStyleBuilder<Graybeard>(Graybeard);
export const neutrino: NeutrinoBuilder = getStyleBuilder<Neutrino>(Neutrino);
export const empty: EmptyBuilder = getStyleBuilder<Empty>(Empty);

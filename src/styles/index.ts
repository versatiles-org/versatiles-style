import type { StyleBuilderOptions } from '../style_builder/types';
import type { MaplibreStyle } from '../types/maplibre';
export type { StyleBuilderOptions, MaplibreStyle };

import Colorful from './colorful';
import Graybeard from './graybeard';
import Neutrino from './neutrino';

export function colorful(options?: StyleBuilderOptions<Colorful>): MaplibreStyle {
	return new Colorful().build(options);
}
colorful.getOptions = (): StyleBuilderOptions<Colorful> => new Colorful().getDefaultOptions();

export function graybeard(options?: StyleBuilderOptions<Graybeard>): MaplibreStyle {
	return new Graybeard().build(options);
}
graybeard.getOptions = (): StyleBuilderOptions<Graybeard> => new Graybeard().getDefaultOptions();

export function neutrino(options?: StyleBuilderOptions<Neutrino>): MaplibreStyle {
	return new Neutrino().build(options);
}
neutrino.getOptions = (): StyleBuilderOptions<Neutrino> => new Neutrino().getDefaultOptions();

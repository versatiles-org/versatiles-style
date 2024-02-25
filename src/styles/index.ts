import type { StyleBuilderOptions } from '../lib/style_builder/types';
import type { MaplibreStyle } from '../lib/types/maplibre';
export type { StyleBuilderOptions, MaplibreStyle };

import Colorful from './colorful';
import Graybeard from './graybeard';
import Neutrino from './neutrino';

export function colorful(options?: StyleBuilderOptions<Colorful>): MaplibreStyle {
	return new Colorful().build(options);
}

export function graybeard(options?: StyleBuilderOptions<Graybeard>): MaplibreStyle {
	return new Graybeard().build(options);
}

export function neutrino(options?: StyleBuilderOptions<Neutrino>): MaplibreStyle {
	return new Neutrino().build(options);
}


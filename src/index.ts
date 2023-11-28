import type { MaplibreStyle, StylemakerOptions } from './lib/types.js';

import Colorful from './style/colorful.js';
export function colorful(options?: StylemakerOptions<Colorful>): MaplibreStyle {
	return new Colorful().build(options);
}

import Graybeard from './style/graybeard.js';
export function graybeard(options?: StylemakerOptions<Graybeard>): MaplibreStyle {
	return new Graybeard().build(options);
}

import Neutrino from './style/neutrino.js';
export function neutrino(options?: StylemakerOptions<Neutrino>): MaplibreStyle {
	return new Neutrino().build(options);
}


export type { TileJSONSpecification, TileJSONSpecificationRaster, TileJSONSpecificationVector } from './lib/types.js';

export { default as guessStyle } from './lib/style_guesser.js';

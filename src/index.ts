import type { MaplibreStyle, StylemakerOptions, StyleGuessOptions } from './lib/types';
export type { MaplibreStyle, StylemakerOptions, StyleGuessOptions };

export type { TileJSONSpecification, TileJSONSpecificationRaster, TileJSONSpecificationVector } from './lib/types';

import Colorful from './style/colorful';
import Graybeard from './style/graybeard';
import Neutrino from './style/neutrino';

export const styles = {
	colorful: function colorful(options?: StylemakerOptions<Colorful>): MaplibreStyle {
		return new Colorful().build(options);
	},
	graybeard: function graybeard(options?: StylemakerOptions<Graybeard>): MaplibreStyle {
		return new Graybeard().build(options);
	},
	neutrino: function neutrino(options?: StylemakerOptions<Neutrino>): MaplibreStyle {
		return new Neutrino().build(options);
	},
};

export { guessStyle } from './lib/guess_style';

import type { MaplibreStyle, StylemakerOptions } from '../lib/types';
export type { MaplibreStyle, StylemakerOptions };

import Colorful from './colorful';
import Graybeard from './graybeard';
import Neutrino from './neutrino';

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

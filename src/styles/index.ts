import type { StyleBuilder } from '../style_builder/style_builder.js';
import type { StyleBuilderOptions } from '../style_builder/types.js';
import { applyElevation } from '../lib/elevation.js';
import { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

// import styles
import Colorful from './colorful.js';
import Eclipse from './eclipse.js';
import Graybeard from './graybeard.js';
import Shadow from './shadow.js';
import Neutrino from './neutrino.js';
import Empty from './empty.js';

export { buildSatelliteStyle as satellite, type SatelliteStyleOptions } from './satellite.js';

type ElevationStyleBuilderOptions = StyleBuilderOptions &
	(
		| { terrain: NonNullable<StyleBuilderOptions['terrain']> }
		| { hillshade: NonNullable<StyleBuilderOptions['hillshade']> }
	);

export interface StyleBuilderFunction {
	(options: ElevationStyleBuilderOptions): Promise<StyleSpecification>;
	(options?: StyleBuilderOptions): StyleSpecification;
	getOptions(): StyleBuilderOptions;
}

function needsElevation(options?: StyleBuilderOptions): boolean {
	return Boolean(options && (options.terrain || options.hillshade));
}

function getStyleBuilder(styleBuilder: new () => StyleBuilder): StyleBuilderFunction {
	const fn = function (options?: StyleBuilderOptions): StyleSpecification | Promise<StyleSpecification> {
		const style = new styleBuilder().build(options);
		if (needsElevation(options)) {
			return applyElevation(style, {
				baseUrl: options!.baseUrl,
				elevationTilejson: options!.elevationTilejson,
				terrain: options!.terrain,
				hillshade: options!.hillshade,
			});
		}
		return style;
	} as StyleBuilderFunction;
	fn.getOptions = (): StyleBuilderOptions => new styleBuilder().getDefaultOptions();
	return fn;
}

// generate style builders
export const colorful = getStyleBuilder(Colorful);
export const eclipse = getStyleBuilder(Eclipse);
export const graybeard = getStyleBuilder(Graybeard);
export const shadow = getStyleBuilder(Shadow);
export const neutrino = getStyleBuilder(Neutrino);
export const empty = getStyleBuilder(Empty);

export { getStyleVariants, type StyleVariant } from './variants.js';

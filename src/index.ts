/**
 * This library provides everything you need to build a map style.
 * 
 * You can use it in the browser:
 * ```html
 * <html>
 *   <head>
 *     <script src="https://tiles.versatiles.org/assets/lib/versatiles-style/versatiles-style.js"></script>
 *   </head>
 *   <body>
 *     <!-- ... -->
 *     <script>
 *       const style = VersaTilesStyle.colorful();
 *       // ...
 *     </script>
 *   </body>
 * </html>
 * ```
 * 
 * or in Node.js:
 * ```shell
 * npm i @versatiles/style
 * ```
 * ```
 * import { colorful } from '@versatiles/style';
 * // OR: const { colorful } = require('@versatiles/style');
 * const style = colorful();
 * ```
 * 
 * You probably want to use one of the following functions:
 * 
 * ---
 * 
 * ## Generate a style for OpenStreetMap data:
 * 
 * To generate a style from scratch you can use on of the prepared style functions:
 * - {@link colorful}
 * - {@link eclipse}
 * - {@link graybeard}
 * - {@link neutrino}
 * - {@link shadow}
 * 
 * Each function accepts optional {@link StyleBuilderOptions} as argument to customize the style.
 * 
 * Example:
 * ```
 * import { colorful } from 'versatiles-style';
 * const style = colorful({
 *   baseUrl: 'https://tiles.example.org',
 *   recolor: {
 *     blend: 0.5,
 *     blendColor: '#FFF', // make all colors lighter
 *   }
 * });
 * ```
 * 
 * ---
 * 
 * ## Guess a style based on a TileJSON:
 * 
 * To guess a style from a TileJSON you can use {@link guessStyle}.
 * This function needs a {@link TileJSONSpecification} and an optional {@link GuessStyleOptions} object.
 * Example:
 * ```
 * import { guessStyle } from 'versatiles-style';
 * const style = guessStyle(tilejson);
 * ```
 * 
 * ---
 * 
 * ## Please help us to improve this library:
 * 
 * This library is used in quite some projects of the VersaTiles ecosystem but it is still in an early stage.
 * We are always looking for feedback, contributions, ideas, bug reports and help with the documentation.
 * 
 * If you have any suggestions, please [open an issue](https://github.com/versatiles-org/versatiles-style/issues) or a pull request on [GitHub](https://github.com/versatiles-org/versatiles-style).
 * 
 * If you want to know more about the VersaTiles project, please visit [versatiles.org](https://versatiles.org).
 * 
 * @module
 */

export { colorful, eclipse, graybeard, neutrino, shadow, type StyleBuilderFunction } from './styles/index.js';
import { colorful, eclipse, graybeard, neutrino, shadow } from './styles/index.js';
export const styles = {
	colorful,
	eclipse,
	graybeard,
	shadow,
	neutrino,
};

export type { GuessStyleOptions } from './guess_style/index.js';
export type { RGB, HSL, HSV } from './color/index.js';
export type { TileJSONSpecification, TileJSONSpecificationRaster, TileJSONSpecificationVector } from './types/tilejson.js';
export type { VectorLayer } from './types/index.js';
export type { StyleBuilderOptions, Language, StyleBuilderColors, StyleBuilderColorKey, StyleBuilderFonts } from './style_builder/types.js';
export type { RecolorOptions } from './style_builder/recolor.js';

export { guessStyle } from './guess_style/index.js';
export { Color } from './color/index.js';

export type { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';

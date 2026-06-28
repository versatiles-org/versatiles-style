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
 *       const style = VersaTilesStyle.osm();
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
 * import { osm } from '@versatiles/style';
 * const style = osm({ theme: 'colorful' });
 * ```
 *
 * ---
 *
 * ## Generate a style for OpenStreetMap data:
 *
 * {@link osm} accepts an {@link OsmOptions} object and returns a synchronous MapLibre style.
 *
 * ```ts
 * import { osm } from '@versatiles/style';
 * const style = osm({
 *   theme: { palette: 'colorful', darkMode: false },
 *   urls: { base: 'https://tiles.example.org' },
 * });
 * ```
 *
 * Available palettes: `'colorful' | 'natural' | 'muted' | 'gray' | 'toner'`
 *
 * ---
 *
 * ## Generate a satellite / raster style:
 *
 * {@link satellite} wraps a raster tile source and optionally adds an OSM vector overlay.
 *
 * ```ts
 * import { satellite } from '@versatiles/style';
 * const style = satellite({ osmOverlay: { theme: 'toner' } });
 * ```
 *
 * ---
 *
 * ## Guess a style from a TileJSON:
 *
 * {@link guessStyle} inspects a {@link TileJSONSpecification} and returns the most appropriate style.
 *
 * ```ts
 * import { guessStyle } from '@versatiles/style';
 * const style = guessStyle(tilejson);
 * ```
 *
 * ---
 *
 * ## Please help us to improve this library:
 *
 * If you have any suggestions, please [open an issue](https://github.com/versatiles-org/versatiles-style/issues) or a pull request on [GitHub](https://github.com/versatiles-org/versatiles-style).
 *
 * @module
 */

// ── v6 API (new) ──────────────────────────────────────────────────────────────

export { osm } from './api/osm.js';
export { satellite } from './api/satellite.js';
export { guessStyle } from './api/guessStyle.js';

// ── v6 types ──────────────────────────────────────────────────────────────────

export type {
	OsmOptions,
	OsmContentOptions,
	SatelliteOptions,
	Palette,
	TextOptions,
	LayoutOptions,
	SunOptions,
	SkyOptions,
	HillshadeOptions,
	SpriteEntry,
	SpriteInput,
} from './types/options.js';

export type { ColorsOptions, RecolorOptions } from './types/colors.js';
export { colorOptionsKeys } from './types/colors.js';
export type { LayerGroupOptions } from './types/layer-groups.js';

export type { ResolvedOsmOptions, ResolvedSatelliteOptions } from './types/resolved.js';

export type {
	StyleSpecification,
	TileJSONSpecification,
	TileJSONSpecificationRaster,
	TileJSONSpecificationVector,
	VectorLayer,
} from './types/index.js';
export { isTileJSONSpecification, isRasterTileJSONSpecification } from './types/index.js';

export { Color } from './color/index.js';
export type { RGB, HSL, HSV, RandomColorOptions } from './color/index.js';

// ── v5 API (kept for backward compatibility) ──────────────────────────────────

import {
	colorful,
	eclipse,
	graybeard,
	neutrino,
	shadow,
	satellite as satelliteV5,
	getStyleVariants,
} from './styles/index.js';

export { colorful, eclipse, graybeard, neutrino, shadow, getStyleVariants };
export type { StyleBuilderFunction, SatelliteStyleOptions, StyleVariant } from './styles/index.js';

/** @deprecated Use `satellite()` from the v6 API instead. */
export const styles = {
	colorful,
	eclipse,
	graybeard,
	shadow,
	neutrino,
	satellite: satelliteV5,
};

export type { GuessStyleOptions } from './guess_style/index.js';
export type {
	StyleBuilderOptions,
	Language,
	StyleBuilderColors,
	StyleBuilderColorKey,
	StyleBuilderFonts,
} from './style_builder/types.js';

export type { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';

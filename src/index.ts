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
 *       const style = await VersaTilesStyle.osm();
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
 * const style = await osm({ theme: 'colorful' });
 * ```
 *
 * ---
 *
 * ## Generate a style for OpenStreetMap data:
 *
 * {@link osm} accepts an {@link OsmOptions} object and resolves to a MapLibre style.
 * It is async because TileJSON sources (any `*.json` source URL) are downloaded and
 * their relative tile paths are made absolute before being embedded into the style.
 *
 * ```ts
 * import { osm } from '@versatiles/style';
 * const style = await osm({
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
 * const style = await satellite({ osmOverlay: { theme: 'toner' } });
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
 * const style = await guessStyle(tilejson);
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
	ColorsOptions,
	RecolorOptions,
	LayerGroupOptions,
	ResolvedOsmOptions,
	ResolvedSatelliteOptions,
} from './options/index.js';
export { colorOptionsKeys } from './options/index.js';

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

// ── Style variants (used by the build pipeline and the dev playground) ────────

export { getStyleVariants } from './variants.js';
export type { StyleVariant } from './variants.js';

export type { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';

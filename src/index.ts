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
 * {@link osm} accepts an {@link OsmOptions} object and returns a MapLibre style.
 * It is synchronous and performs no I/O: a `*.json` source URL becomes a source `url`
 * that MapLibre resolves when the map loads.
 *
 * Call {@link inlineSources} afterwards when the style has to stand on its own — a
 * published `style.json`, an offline deployment, or anywhere the first tile request
 * should not wait for a TileJSON round-trip.
 *
 * ```ts
 * import { osm, inlineSources } from '@versatiles/style';
 * const style = osm({
 *   theme: { palette: 'colorful', darkMode: false },
 *   urls: { base: 'https://tiles.example.org' },
 * });
 *
 * // optional: resolve every source reference into a self-contained style
 * const standalone = await inlineSources(style);
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
 * ## Guess a style from a tile source:
 *
 * {@link guessStyle} downloads a TileJSON and returns the most appropriate style for it.
 * It is the one style function that is asynchronous, because it has to read the document
 * before it can decide what to build.
 *
 * ```ts
 * import { guessStyle } from '@versatiles/style';
 * const style = await guessStyle('https://tiles.example.org/tiles.json');
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

export { osm, satellite, guessStyle } from './api/index.js';
export type { GuessStyleOptions } from './api/guessStyle.js';

// ── v6 types ──────────────────────────────────────────────────────────────────

export type {
	// ── Input option types ──
	OsmOptions,
	OsmOverlayOptions,
	SatelliteOptions,
	Palette,
	ThemeOptions,
	TextOptions,
	LayoutOptions,
	SunOptions,
	SkyOptions,
	ProjectionOptions,
	HillshadeOptions,
	TerrainOptions,
	OsmFeaturesOptions,
	SatelliteFeaturesOptions,
	OsmUrlsOptions,
	SatelliteUrlsOptions,
	SatelliteRasterOptions,
	SpriteEntries,
	FetchLike,
	ColorsOptions,
	RecolorOptions,
	LayerGroupOptions,
	// ── Resolved option types ──
	ResolvedLayerGroups,
	ResolvedOsm,
	ResolvedOsmOverlay,
	ResolvedSatellite,
	ResolvedTheme,
	ResolvedText,
	ResolvedLayout,
	ResolvedHillshade,
	ResolvedSky,
	ResolvedProjection,
	ResolvedTerrain,
	ResolvedOsmFeatures,
	ResolvedSatelliteFeatures,
	ResolvedRecolor,
	ResolvedSatelliteRaster,
	ResolvedOsmUrls,
	ResolvedSatelliteUrls,
	TileSource,
} from './options/index.js';
export { isDarkMode } from './options/index.js';

export type {
	StyleSpecification,
	TileJSONSpecification,
	TileJSONSpecificationRaster,
	TileJSONSpecificationVector,
	VectorLayer,
} from './types/index.js';
export {
	assertTileJSONSpecification,
	assertRasterTileJSONSpecification,
	isTileJSONSpecification,
	isRasterTileJSONSpecification,
} from './types/index.js';

export type { LayerGroupMap } from './shortbread/layer-groups-map.js';
export { inlineSources, fetchTileJSON } from './lib/index.js';
export { Color } from './color/index.js';
export type { RGB, HSL, HSV, RandomColorOptions } from './color/index.js';

// ── Style variants (used by the build pipeline and the dev playground) ────────

export { getStyleVariants } from './variants.js';
export type { StyleVariant } from './variants.js';

export type { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';

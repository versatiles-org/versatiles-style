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
 *   theme: 'colorful',
 *   urls: { base: 'https://tiles.example.org' },
 * });
 *
 * // optional: resolve every source reference into a self-contained style
 * const standalone = await inlineSources(style);
 * ```
 *
 * Available palettes: `'colorful' | 'natural' | 'muted' | 'gray' | 'toner'`, each also as a dark
 * theme with a `-dark` suffix (`'colorful-dark'`, …).
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
 * {@link guessStyle} inspects a tileset and returns the most appropriate style for it. Pass the URL
 * of a TileJSON document, which it downloads, or a TileJSON object you already hold, which it uses
 * without network access. It is the one style function that is asynchronous.
 *
 * ```ts
 * import { guessStyle } from '@versatiles/style';
 * const style = await guessStyle('https://tiles.example.org/tiles.json');
 * const fromObject = await guessStyle(tileJSON, { urls: { base: 'https://tiles.example.org' } });
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

export { osm, satellite, guessStyle, guessSchema } from './api/';
export type { GuessStyleOptions, SchemaGuess, SchemaName, SchemaScore } from './api/';

// ── v6 types ──────────────────────────────────────────────────────────────────

export type {
	// ── Core types ──
	FetchLike,
	Palette,
	SpriteEntries,
	TileSource,

	// ── Input option types ──
	ColorsOptions,
	FontName,
	HillshadeOptions,
	IconOptions,
	LabelStyle,
	LayerGroupOptions,
	OsmFeaturesOptions,
	OsmOptions,
	OsmOverlayOptions,
	OsmUrlsOptions,
	PitchAlignment,
	ProjectionOptions,
	RecolorOptions,
	SatelliteFeaturesOptions,
	SatelliteOptions,
	SatelliteRasterOptions,
	SatelliteUrlsOptions,
	SkyOptions,
	SunOptions,
	TerrainOptions,
	TextOptions,
	TextTopic,
	TextTransform,
	ThemeOptions,

	// ── Resolved option types ──
	ResolvedColors,
	ResolvedHillshade,
	ResolvedIcon,
	ResolvedLabelStyle,
	ResolvedLayerGroups,
	ResolvedOsm,
	ResolvedOsmFeatures,
	ResolvedOsmOverlay,
	ResolvedOsmUrls,
	ResolvedProjection,
	ResolvedRecolor,
	ResolvedSatellite,
	ResolvedSatelliteFeatures,
	ResolvedSatelliteRaster,
	ResolvedSatelliteUrls,
	ResolvedSky,
	ResolvedSun,
	ResolvedTerrain,
	ResolvedText,
	ResolvedTheme,
} from './options/';
export { isDarkMode, labelLanguage } from './options/';

export type {
	StyleSpecification,
	TileJSONSpecification,
	TileJSONSpecificationRaster,
	TileJSONSpecificationVector,
	VectorLayer,
} from './types/';
export {
	assertTileJSONSpecification,
	assertRasterTileJSONSpecification,
	isTileJSONSpecification,
	isRasterTileJSONSpecification,
} from './types/';

export type { TextGroupMap, LayerGroupMap } from './shortbread/';
/**
 * The shape a schema function carries so `guessStyle` can recognise its tileset — exported so a caller
 * can inject a schema of their own (`guessStyle(tj, { schemas: [mySchema] })`), not only `omt`.
 */
export type { SchemaBuilder, SchemaDescriptor, SchemaUrls } from './api/';
export {
	inlineSources,
	fetchTileJSON,
	fetchFontFaces,
	fontCovers,
	fontScripts,
	languageScript,
	textScripts,
	FONT_SCRIPTS,
} from './lib/';
export type { FontFaceInfo } from './lib/';
export { Color, ColorParseError } from './color/';
export type { Channels, Coords, HueMethod, MixOptions, RandomColorOptions, Space } from './color/';

// ── Style variants (used by the build pipeline and the dev playground) ────────

export { getStyleVariants } from './variants.js';
export type { StyleVariant } from './variants.js';

export type { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';

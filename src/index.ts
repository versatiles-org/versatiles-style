/**
 * This library provides everything you need to build a map style.
 *
 * **This page documents the npm package.** Install it and import what you need:
 *
 * ```shell
 * npm i @versatiles/style
 * ```
 * ```ts
 * import { osm } from '@versatiles/style';
 * const style = osm({ theme: 'colorful' });
 * ```
 *
 * There is a second way to use the library — a prebuilt bundle loaded from a `<script>` tag, which
 * puts the same functions on a `VersaTilesStyle` global:
 *
 * ```html
 * <script src="https://tiles.versatiles.org/assets/lib/versatiles-style/versatiles-style.js"></script>
 * <script>
 *   const style = VersaTilesStyle.osm();
 * </script>
 * ```
 *
 * That bundle carries **less than this page lists**, and it is documented on its own page: see the
 * {@link "versatiles-style.js"} module. Everything you build a style with — `osm`, `satellite`,
 * `guessStyle`, `inlineSources`, `Color` — is in both. What only npm has is editor and tooling work:
 * `osm.minimizeOptions` and `osm.toCode`, the font-discovery helpers, and the TileJSON validators.
 * Each of those is marked **npm only** on its own page. They are left out so that a page which merely
 * builds a style and hands it to MapLibre does not download them.
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
 * @module @versatiles/style
 */

// ── v6 API (new) ──────────────────────────────────────────────────────────────

export * from './exports.js';

import { osm as osmCore, satellite as satelliteCore, styleCode } from './api/index.js';
import { getOverlayLayerGroupMap } from './shortbread/layer-groups-map.js';
import {
	minimizeOsmOptions,
	minimizeSatelliteOptions,
	type OsmOptions,
	type SatelliteOptions,
} from './options/index.js';

/**
 * `osm()` with the authoring helpers attached.
 *
 * They live here rather than on the function object itself so that the browser bundle, whose entry is
 * `browser.ts`, can leave them out: attached, they are a property of an exported object and nothing can
 * tree-shake them away. Only a tool that stores or emits options needs them; a page that just builds a
 * style does not, and every consumer of the CDN bundle is the latter.
 */
export const osm = Object.assign(osmCore, {
	/**
	 * The smallest options object that builds the same style: every value equal to its default is
	 * dropped, colours compared against the chosen palette. For storing a style in a URL or config.
	 */
	minimizeOptions: minimizeOsmOptions,

	/** A runnable `@versatiles/style` snippet for these options, minimised first. */
	toCode: (options?: OsmOptions): string => styleCode('osm', minimizeOsmOptions(options)),
});

/** `satellite()` with the same authoring helpers. */
export const satellite = Object.assign(satelliteCore, {
	/**
	 * The smallest options object that builds the same style. Overlay colours are compared against
	 * the overlay's palette — `gray` unless `osmOverlay.theme` says otherwise.
	 */
	minimizeOptions: (options?: SatelliteOptions) => minimizeSatelliteOptions(options, getOverlayLayerGroupMap),

	/** A runnable `@versatiles/style` snippet for these options, minimised first. */
	toCode: (options?: SatelliteOptions): string =>
		styleCode('satellite', minimizeSatelliteOptions(options, getOverlayLayerGroupMap)),
});

// ── TileJSON validation ───────────────────────────────────────────────────────
//
// npm only. These check a TileJSON document a caller holds — the question a tool that ingests tilesets
// asks, not a page that builds a style: `guessStyle` already validates what it fetches, and throws the
// same errors. `assertTileJSONSpecification` is in the CDN bundle either way because `guessStyle` calls
// it; being free to re-export is not a reason to widen the surface a page has to read.

export {
	assertTileJSONSpecification,
	assertRasterTileJSONSpecification,
	isTileJSONSpecification,
	isRasterTileJSONSpecification,
} from './types/index.js';

// ── Font discovery ────────────────────────────────────────────────────────────
//
// npm only. These answer "which faces does this glyph server have, and which of them can write this
// language" — the question a font *picker* asks, which is editor work. Nothing in the style-building
// path uses them, so a page that loads the CDN bundle would carry 4 KB it never calls.

export { fetchFontFaces } from './lib/fetchFontFaces.js';
export type { FontFaceInfo } from './lib/fetchFontFaces.js';
export { fontCovers, fontScripts, languageScript, textScripts, FONT_SCRIPTS } from './lib/fontCovers.js';

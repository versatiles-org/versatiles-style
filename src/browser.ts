/**
 * The entry for the browser bundle served from the CDN (`versatiles-style.js`, the `VersaTilesStyle`
 * global).
 *
 * **Everything listed on this page is available as `VersaTilesStyle.<name>`.** Load the bundle from a
 * `<script>` tag and call it — no build step, no import. The full npm package is documented separately
 * under {@link "@versatiles/style"}; this is that surface minus `osm.minimizeOptions`, `osm.toCode`,
 * `osm.validateOptions` and their `satellite` counterparts, the font-discovery helpers, and the four
 * TileJSON validators.
 * Those exist to store options compactly, print a code snippet, or report everything wrong with an
 * options object someone typed — jobs for a style *editor*, which is
 * an npm consumer with its own bundler. A page that loads this file wants to build a style and hand it
 * to MapLibre, and would otherwise pay ~2 KB gzipped for methods it never calls; attached to the
 * exported function object, they cannot be tree-shaken away by the page.
 *
 * Anything else that belongs to the public API belongs in `exports.ts`, so both entries keep it.
 *
 * @module versatiles-style.js
 */

export * from './exports.js';
export { osm, satellite } from './api/index.js';

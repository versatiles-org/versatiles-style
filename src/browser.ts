/**
 * The entry for the browser bundle served from the CDN (`versatiles-style.js`, the `VersaTilesStyle`
 * global).
 *
 * It is the npm surface minus `osm.minimizeOptions`, `osm.toCode` and their `satellite` counterparts.
 * Those exist to store options compactly or print a code snippet — jobs for a style *editor*, which is
 * an npm consumer with its own bundler. A page that loads this file wants to build a style and hand it
 * to MapLibre, and would otherwise pay ~2 KB gzipped for methods it never calls; attached to the
 * exported function object, they cannot be tree-shaken away by the page.
 *
 * Anything else that belongs to the public API belongs in `exports.ts`, so both entries keep it.
 */

export * from './exports.js';
export { osm, satellite } from './api/';

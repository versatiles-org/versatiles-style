/**
 * Shared helpers used by the style builders: TileJSON loading, source descriptors, style metadata
 * and URL/attribution utilities.
 *
 * ⚠️ **`src/options/*` and `src/types/*` must not import this barrel.** `lib/tileSource.ts` and
 * `lib/loadTileSource.ts` import types from `options`, so an `options → lib/index` edge closes a
 * loop. It is harmless today only because those two imports are `import type` and therefore erased;
 * making either one a value import would turn it into a real runtime cycle. `options/urls.ts` and
 * `options/sprite.ts` therefore import `./utils.js` directly — it is a true leaf, importing nothing.
 * An `no-restricted-imports` rule in `eslint.config.js` enforces this.
 */

export { normalizeAttribution, resolveUrl, basename } from './utils.js';
export { STYLE_LICENSE, STYLE_METADATA, styleName } from './styleMeta.js';
export { cachingFetch, clearTileSourceCache, loadTileSource, resolveTileJSONTiles } from './loadTileSource.js';
export { buildSourceDescriptor, inlinedFields } from './tileSource.js';
export { fetchTileJSON } from './fetchTileJSON.js';
export { inlineSources } from './inlineSources.js';

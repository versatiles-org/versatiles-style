// The option surface, in dependency order: the composable parts, then the resolvers built from them.
// See `parts.ts` for why that split exists.
//
// ⚠️ **Per-schema option code does not live here.** `osm` and `satellite` do, because they are the
// package's root entry. Each additional schema keeps its options in its own directory —
// `src/omt/options.ts`, `src/protomaps/options.ts` — for the reason behind the whole
// one-subpath-per-schema design: anything reachable from `src/index.ts` is in the CDN
// bundle, and a caller who never touches OpenMapTiles should not download its option resolver. The
// building blocks those modules compose (`resolveTheme`, `resolveTileSource`, `minimizeThemed`, …) are
// exported from here; the per-schema assembly of them is not.
export * from './parts/index.js';
export * from './minimize.js';
export * from './osm-overlay.js';
export * from './osm.js';
export * from './satellite.js';

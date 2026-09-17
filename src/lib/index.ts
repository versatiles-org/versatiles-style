/**
 * Shared helpers used by the style builders: TileJSON loading, source descriptors, style metadata
 * and URL/attribution utilities.
 *
 * ⚠️ **`src/options/*` and `src/types/*` must not import from `lib`.** The dependency runs the other
 * way: `lib` fetches things using URLs and option values that `options` resolved, so half of this
 * directory imports `checkKeys`, `resolveUrl` and `labelLanguage` from there. An edge back would make
 * the two directories mutually dependent. Nothing in `options` imports `lib` today, and
 * `src/import-graph.test.ts` fails if that changes.
 */

export { normalizeAttribution } from './utils.js';
export {
	STYLE_LICENSE,
	STYLE_METADATA,
	styleName,
	styleMetadata,
	readStyleOptions,
	METADATA_BUILDER_KEY,
	METADATA_OPTIONS_KEY,
	METADATA_VERSION_KEY,
	METADATA_VERSION,
} from './styleMeta.js';
export type { StyleBuilder, StyleOptionsRecord } from './styleMeta.js';
export { cachingFetch, clearTileSourceCache, loadTileSource, resolveTileJSONTiles } from './loadTileSource.js';
export { buildSourceDescriptor, inlinedFields } from './tileSource.js';
export { fetchTileJSON } from './fetchTileJSON.js';
export { inlineSources } from './inlineSources.js';
export { scaleLayerOpacity } from './opacity.js';
export { padForSpacing, scaleSymbolSpacing, scaleValue } from './symbol-layout.js';
export { getLanguages } from './languages.js';
export { SCHEMA_NAMES, SCHEMA_SIGNATURES, type SchemaName } from './schema-signatures.js';

// Font discovery is deliberately absent from this barrel. `fontCovers.ts` builds a frozen table at
// module level — `Object.freeze` mutates, so no bundler may drop it — and naming it here would pull
// that into every bundle that imports anything from `lib`, including the CDN one, which has no font
// picker to serve. The npm entry imports those modules directly instead.

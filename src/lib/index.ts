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
} from './style-meta.js';
export type { StyleBuilder, StyleOptionsRecord } from './style-meta.js';
export { cachingFetch, clearTileSourceCache, loadTileSource, resolveTileJSONTiles } from './load-tile-source.js';
export { buildSourceDescriptor, inlinedFields } from './tile-source.js';
export { fetchTileJSON } from './fetch-tilejson.js';
export { inlineSources } from './inline-sources.js';
export { moveToLineLayerOpacity, scaleLayerOpacity, type ZoomCurve } from './opacity.js';
export { padForSpacing, scaleSymbolSpacing, scaleValue, PADDING_PER_SPACING } from './symbol-layout.js';
export { getLanguages } from './languages.js';

// Font discovery is not here but in `src/fonts/`, behind a barrel of its own, so that importing anything
// from `lib` — which the CDN bundle does — cannot pull in its frozen script table. See `fonts/index.ts`.

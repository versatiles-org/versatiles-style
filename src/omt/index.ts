/**
 * `@versatiles/style/omt` — the OpenMapTiles entry point.
 *
 * Deliberately small: one function and its option types. Everything schema-neutral — palettes, colour
 * helpers, `inlineSources`, `guessStyle`, the TileJSON types — stays in the root entry, because a
 * caller using both schemas should import those once, not twice.
 *
 * @module @versatiles/style/omt
 */
export { omt } from './api.js';
export type {
	OmtOptions,
	ResolvedOmt,
	// The option sub-types `OmtOptions` names. A consumer cannot type a variable holding one of these
	// unless the entry exports it, which is what `npm run check-exports` walks the type graph to prove.
	OmtUrlsOptions,
	OmtFeaturesOptions,
	ResolvedOmtUrls,
	ResolvedOmtFeatures,
} from './options.js';
export { OMT_SCHEMA, type OmtLayer } from './schema.js';

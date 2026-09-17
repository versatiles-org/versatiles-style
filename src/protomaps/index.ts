/**
 * `@versatiles/style/protomaps` — the Protomaps Basemap entry point.
 *
 * As with the OpenMapTiles subpath: one function and its option types, with everything schema-neutral
 * left in the root entry.
 *
 * @module @versatiles/style/protomaps
 */
export { protomaps } from './api.js';
export type {
	ProtomapsOptions,
	ResolvedProtomaps,
	ProtomapsUrlsOptions,
	ProtomapsFeaturesOptions,
	ResolvedProtomapsUrls,
	ResolvedProtomapsFeatures,
} from './options.js';
export { PROTOMAPS_SCHEMA, type ProtomapsLayer } from './schema.js';

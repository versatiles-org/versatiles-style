import type { StyleSpecification, TileJSONSpecification } from '../types/index.js';
import type { OsmUrlsOptions } from '../options/index.js';

/**
 * What `guessStyle` needs from a schema in order to recognise its tileset and build a style for it.
 *
 * Each schema function carries one as a static, so the schema owns both halves: which source-layers
 * identify its tiles, and how its own `urls` option names the vector source. `guessStyle` never learns
 * either — it just asks.
 *
 * Deliberately its own module rather than living in `guessStyle.ts`: `osm` must carry a descriptor and
 * `guessStyle` must read `osm`'s, so declaring the type in either file makes the two mutually
 * dependent. TypeScript resolves such a cycle by widening the inferred statics to `any`, silently — it
 * cost a whole file's type-checking before this module existed.
 */
export type SchemaDescriptor = {
	/**
	 * Which schema this builds. For the built-in schemas it is the name `guessSchema` reports
	 * (`'shortbread'`, `'openmaptiles'`, `'protomaps'`), which is how `guessStyle` finds the builder for a
	 * detected tileset. Any other id marks a caller's own schema, recognised by `sourceLayers` alone.
	 */
	readonly id: string;
	/** Source-layer ids this schema's tileset carries, for detection. */
	readonly sourceLayers: readonly string[];
	/** Build a style for a tileset already detected as this schema. */
	build: (source: string | TileJSONSpecification, urls: SchemaUrls) => StyleSpecification;
};

/** The subset of the URL options a guessed style can carry over: everything but the tile source. */
export type SchemaUrls = Pick<OsmUrlsOptions, 'base' | 'glyphsPattern' | 'sprite'> | undefined;

/** A schema function as `guessStyle` sees it — `osm`, `omt`, or another schema's builder. */
export type SchemaBuilder = { readonly tileset: SchemaDescriptor };

import { osm } from '../../src/api/';
import { omt } from '../../src/omt/';
import { protomaps } from '../../src/protomaps/';
import type { OsmOptions } from '../../src/options/';
import type { StyleSpecification, TileJSONSpecification } from '../../src/types/';
import { tileTemplate } from '../lib/native-render.js';
import type { SourceMetadata } from '../lib/tile-cache.js';
import type { Schema } from './baseline.js';

/**
 * Building the style of one schema for the comparison, shared by `compare.ts` and `findings-report.ts`.
 *
 * Everything that is not about the schema is held fixed — theme, projection, no sky — so that only the
 * schema varies, and the vector source is the tile cache (see `scripts/lib/native-render.ts`).
 */

/** The options every render starts from. */
export const COMMON_OPTIONS: OsmOptions = { theme: 'colorful', projection: 'mercator', sky: false };

/** The same options with labels and icons off, for comparing geometry. */
export const GEOMETRY_OPTIONS: OsmOptions = { ...COMMON_OPTIONS, layers: { labels: false, icons: false } };

/** `osm()`, `omt()` or `protomaps()` with `options`, reading tiles from the cache. */
export function buildStyle(schema: Schema, metadata: SourceMetadata, options: OsmOptions): StyleSpecification {
	const tileJSON = {
		tilejson: '3.0.0',
		tiles: [tileTemplate(schema)],
		minzoom: metadata.minzoom,
		maxzoom: metadata.maxzoom,
		vector_layers: metadata.vectorLayers,
	} as TileJSONSpecification;
	switch (schema) {
		case 'shortbread':
			return osm({ ...options, urls: { osm: tileJSON } });
		case 'omt':
			return omt({ ...options, urls: { omt: tileJSON } });
		case 'protomaps':
			return protomaps({ ...options, urls: { protomaps: tileJSON } });
	}
}

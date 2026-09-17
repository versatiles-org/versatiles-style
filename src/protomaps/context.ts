import type { DataDrivenPropertyValueSpecification, FormattedSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { ResolvedProtomaps } from './options.js';
import { buildLayerContext, type LayerContext } from '../dsl/index.js';
import { PROTOMAPS_SCHEMA } from './schema.js';

// Protomaps' half of the layer context — the third mirror of `src/shortbread/context.ts`.
export type { LayerContext, ColorSet } from '../dsl/index.js';

const SOURCE_NAME = 'protomaps';

/**
 * Protomaps carries translations only as `name:xx`, with `name` as the local fallback — the convention
 * expected for it, and the simplest of the three: Shortbread has only
 * `name_xx`, OpenMapTiles has both and needs them coalesced, Protomaps has only the colon form.
 *
 * The vendored record also lists `name2`, `name3` and a `pgf:` family (pre-rendered glyph fallbacks for
 * scripts MapLibre cannot shape). Neither is a language, and neither is read here.
 */
function buildNameField(
	language: string,
	languageStrict: boolean
): DataDrivenPropertyValueSpecification<FormattedSpecification> {
	if (!language || language === 'local') return ['get', 'name'];
	if (languageStrict) return ['get', 'name:' + language];
	return ['coalesce', ['get', 'name:' + language], ['get', 'name']];
}

export function buildContext(resolved: ResolvedProtomaps): LayerContext {
	return buildLayerContext(resolved, { source: SOURCE_NAME, nameField: buildNameField });
}

/** Where each Protomaps source-layer's data begins, for the data floor in `buildLayers`. */
export const PROTOMAPS_DATA_FLOORS = PROTOMAPS_SCHEMA;

import type { DataDrivenPropertyValueSpecification, FormattedSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { ResolvedOmt } from './options.js';
import { buildLayerContext } from '../dsl/context.js';
import type { LayerContext } from '../dsl/';
import { OMT_SCHEMA } from './schema.js';

// OpenMapTiles' half of the layer context — the mirror of `src/shortbread/context.ts`. The derivation
// is shared (`src/dsl/context.ts`); only the source name and the name-field convention are ours.
export type { LayerContext, ColorSet } from '../dsl/';

const SOURCE_NAME = 'openmaptiles';

/**
 * OpenMapTiles carries translations in two conventions at once, and they are not interchangeable.
 *
 * The vendored record (`src/omt/schema.ts`) settles which is which: of the underscore form only
 * `name_de`, `name_en` and `name_int` exist, while the `name:xx` form covers all ~80 languages. So
 * `name:xx` is the form to ask for — it is the only one that works for an arbitrary language — and the
 * underscore form is worth coalescing after it for German and English, where OpenMapTiles generates it
 * with its own fallback logic and it is therefore more likely to be populated than the raw tag.
 *
 * Both spellings name the *same* language, so consulting both stays strict: `languageStrict` promises
 * never to fall back to the local name, not to read one field.
 */
function buildNameField(
	language: string,
	languageStrict: boolean
): DataDrivenPropertyValueSpecification<FormattedSpecification> {
	if (!language || language === 'local') return ['get', 'name'];
	// Spelled out rather than spread: `coalesce` is a tuple type, so building it from an array loses the
	// arity the spec type requires.
	if (languageStrict) return ['coalesce', ['get', 'name:' + language], ['get', 'name_' + language]];
	return ['coalesce', ['get', 'name:' + language], ['get', 'name_' + language], ['get', 'name']];
}

export function buildContext(resolved: ResolvedOmt): LayerContext {
	return buildLayerContext(resolved, { source: SOURCE_NAME, nameField: buildNameField });
}

/**
 * Where each OpenMapTiles source-layer's data begins, for the data floor in `buildLayers`.
 *
 * Aliased rather than used directly at the call site so the seam reads the same as Shortbread's, and
 * so the one place that depends on the record's *shape* is visible from the context module.
 */
export const OMT_DATA_FLOORS = OMT_SCHEMA;

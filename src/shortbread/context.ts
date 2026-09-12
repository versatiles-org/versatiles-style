import type { DataDrivenPropertyValueSpecification, FormattedSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { ResolvedOsm } from '../options/index.js';
import { buildLayerContext } from '../dsl/context.js';
import type { LayerContext } from '../dsl/context.js';

// Shortbread's half of the layer context. The derivation itself is schema-neutral and lives in
// `src/dsl/context.ts`; what is restated here is only what a tileset decides for itself — its source
// name and how it spells a localised name field.
//
// Re-exported so this schema's layer modules keep importing their context types from their own schema
// directory: a second schema does the same from its own `context.ts`, and neither has to reach into
// the DSL for a type it uses on every generator signature.
export type { LayerContext, ColorSet } from '../dsl/context.js';

const SOURCE_NAME = 'versatiles-shortbread';

/** Shortbread carries translations as `name_de`, with `name` as the local-language fallback. */
function buildNameField(
	language: string,
	languageStrict: boolean
): DataDrivenPropertyValueSpecification<FormattedSpecification> {
	if (!language || language === 'local') return ['get', 'name'];
	if (languageStrict) return ['get', 'name_' + language];
	return ['coalesce', ['get', 'name_' + language], ['get', 'name']];
}

export function buildContext(resolved: ResolvedOsm): LayerContext {
	return buildLayerContext(resolved, { source: SOURCE_NAME, nameField: buildNameField });
}

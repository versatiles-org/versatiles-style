import { buildContext } from './context.js';
import { omtLayers } from './layers/index.js';
import { resolveOmt } from './options.js';
import { buildGroupMaps, type TextGroupMap, type LayerGroupMap } from '../dsl/group-maps.js';

// This schema's own group maps, with their own module-level cache.
//
// SCHEMA-SUPPORT-PLAN.md §6: under option A this needs no new mechanism — `omt.layerGroups` is correct
// by construction because it is built from `omt`'s own layers, and the cache stays valid because each
// schema module has one of its own. The map *types* and the builder are shared; the maps are not.

let cached: { layers: LayerGroupMap; text: TextGroupMap } | undefined;

function maps(): { layers: LayerGroupMap; text: TextGroupMap } {
	// `buildings: 'flat'` and `'extruded'` are mutually exclusive, so both are walked and unioned.
	return (cached ??= buildGroupMaps(
		(['flat', 'extruded'] as const).map((buildings) => omtLayers(buildContext(resolveOmt({ features: { buildings } }))))
	));
}

export function getLayerGroupMap(): LayerGroupMap {
	return maps().layers;
}

export function getTextGroupMap(): TextGroupMap {
	return maps().text;
}

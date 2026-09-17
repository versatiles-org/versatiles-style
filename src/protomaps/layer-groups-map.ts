import { buildContext } from './context.js';
import { protomapsLayers } from './layers/index.js';
import { resolveProtomaps } from './options.js';
import { buildGroupMaps, type TextGroupMap, type LayerGroupMap } from '../dsl/index.js';

// This schema's own group maps, with their own module-level cache.
//
// Because each schema keeps its own cartography, this needs no new mechanism — `protomaps.layerGroups` is
// correct by construction because it is built from `protomaps`'s own layers, and the cache stays valid
// because each schema module has one of its own. The map *types* and the builder are shared; the maps
// are not.

let cached: { layers: LayerGroupMap; text: TextGroupMap } | undefined;

function maps(): { layers: LayerGroupMap; text: TextGroupMap } {
	// `buildings: 'flat'` and `'extruded'` are mutually exclusive, so both are walked and unioned.
	// `landcover` only adds layers, so it is on in both.
	return (cached ??= buildGroupMaps(
		(['flat', 'extruded'] as const).map((buildings) =>
			protomapsLayers(buildContext(resolveProtomaps({ features: { buildings, landcover: true } })))
		)
	));
}

export function getLayerGroupMap(): LayerGroupMap {
	return maps().layers;
}

export function getTextGroupMap(): TextGroupMap {
	return maps().text;
}

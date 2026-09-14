import { buildContext } from './context.js';
import { shortbreadLayers } from './layers/index.js';
import { resolveOsm } from '../options/index.js';
import { buildGroupMaps, type FontGroupMap, type LayerGroupMap } from '../dsl/group-maps.js';

export type { FontGroupMap, LayerGroupMap } from '../dsl/group-maps.js';

let cached: { layers: LayerGroupMap; fonts: FontGroupMap } | undefined;

/**
 * Both group maps of the Shortbread layers, built once. `buildings: 'flat'` and `'extruded'` are
 * walked and unioned (see `buildGroupMaps`); no other feature changes which layers exist.
 */
function maps(): { layers: LayerGroupMap; fonts: FontGroupMap } {
	return (cached ??= buildGroupMaps(
		(['flat', 'extruded'] as const).map((buildings) =>
			shortbreadLayers(buildContext(resolveOsm({ features: { buildings } })))
		)
	));
}

/** The map of layer-group keys to layer IDs. */
export function getLayerGroupMap(): LayerGroupMap {
	return maps().layers;
}

/** The map of font topics to the text layer IDs they set. */
export function getFontGroupMap(): FontGroupMap {
	return maps().fonts;
}

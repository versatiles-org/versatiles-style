import { buildContext } from './context.js';
import { shortbreadLayers } from './layers/index.js';
import { resolveOsm } from '../options/index.js';
import { buildGroupMaps, type FontGroupMap, type LayerGroupMap } from '../dsl/group-maps.js';
import type { TaggedLayer } from '../dsl/build.js';
import { keepInOverlay } from '../features/satellite-overlay.js';

export type { FontGroupMap, LayerGroupMap } from '../dsl/group-maps.js';

let cached: { layers: LayerGroupMap; fonts: FontGroupMap } | undefined;
let cachedOverlay: LayerGroupMap | undefined;

/**
 * The tagged Shortbread layers of each build that has to be walked to see every layer.
 * `buildings: 'flat'` and `'extruded'` are walked and unioned (see `buildGroupMaps`); no other
 * feature changes which layers exist.
 */
function builds(): Iterable<TaggedLayer>[] {
	return (['flat', 'extruded'] as const).map((buildings) =>
		shortbreadLayers(buildContext(resolveOsm({ features: { buildings } })))
	);
}

/** Both group maps of the Shortbread layers, built once. */
function maps(): { layers: LayerGroupMap; fonts: FontGroupMap } {
	return (cached ??= buildGroupMaps(builds()));
}

/** The map of layer-group keys to layer IDs. */
export function getLayerGroupMap(): LayerGroupMap {
	return maps().layers;
}

/**
 * The layer-group map of the satellite overlay: only the layers `keepInOverlay` keeps. Groups left
 * with no layer (land, water, sites, airport, buildings) are absent, since they change nothing there.
 */
export function getOverlayLayerGroupMap(): LayerGroupMap {
	return (cachedOverlay ??= buildGroupMaps(
		builds().map((tagged) => [...tagged].filter(({ layer }) => keepInOverlay(layer)))
	).layers);
}

/** The map of font topics to the text layer IDs they set. */
export function getFontGroupMap(): FontGroupMap {
	return maps().fonts;
}

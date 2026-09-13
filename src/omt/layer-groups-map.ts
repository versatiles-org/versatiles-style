import { buildContext } from './context.js';
import { omtLayers } from './layers/index.js';
import { resolveOmt } from '../options/index.js';
import type { LayerGroupMap } from '../shortbread/layer-groups-map.js';

// This schema's own layer-group map, with its own module-level cache.
//
// SCHEMA-SUPPORT-PLAN.md §6: under option A this needs no new mechanism — `omt.layerGroups` is correct
// by construction because it is built from `omt`'s own layers, and the cache stays valid because each
// schema module has one of its own. The `LayerGroupMap` *type* is shared; the map is not.

function insert(root: LayerGroupMap, path: string, id: string): void {
	const parts = path.split('.');
	let node = root;
	for (const key of parts.slice(0, -1)) {
		const next = (node[key] ??= {});
		if (Array.isArray(next)) throw new Error(`layerGroups: "${path}" conflicts with a leaf group`);
		node = next;
	}
	const leaf = (node[parts.at(-1)!] ??= []) as string[];
	if (!leaf.includes(id)) leaf.push(id);
}

let cached: LayerGroupMap | undefined;

export function getLayerGroupMap(): LayerGroupMap {
	if (cached) return cached;

	const map: LayerGroupMap = {};
	// `buildings: 'flat'` and `'extruded'` are mutually exclusive, so neither build alone lists every
	// layer the group can control; both are walked and their IDs unioned, as in the Shortbread map.
	for (const buildings of ['flat', 'extruded'] as const) {
		const ctx = buildContext(resolveOmt({ features: { buildings } }));
		for (const { layer, group } of omtLayers(ctx)) {
			if (group) insert(map, group, layer.id);
		}
	}

	const transit = map.transit as LayerGroupMap | undefined;
	map.icons = [
		...((map.pois as string[]) ?? []),
		...((map.markings as string[]) ?? []),
		...((transit?.stops as string[]) ?? []),
	];

	cached = map;
	return map;
}

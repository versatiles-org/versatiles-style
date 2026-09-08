import { buildContext } from './context.js';
import { shortbreadLayers } from './layers/index.js';
import { resolveOsm } from '../options/index.js';

/**
 * A tree mirroring `LayerGroupOptions`, with the layer IDs each group controls at the leaves.
 * Branch nodes (e.g. `roads.streets`) hold their sub-groups rather than IDs.
 */
export type LayerGroupMap = { [key: string]: string[] | LayerGroupMap };

function insert(root: LayerGroupMap, path: string, id: string): void {
	const parts = path.split('.');
	let node = root;
	for (const key of parts.slice(0, -1)) {
		const next = (node[key] ??= {});
		// Group paths form a clean tree — no path is a prefix of another — so a branch is
		// never also a leaf. Guard anyway rather than silently dropping IDs.
		if (Array.isArray(next)) throw new Error(`layerGroups: "${path}" conflicts with a leaf group`);
		node = next;
	}
	const leaf = (node[parts.at(-1)!] ??= []) as string[];
	// The same layer can be reached from more than one build (see getLayerGroupMap).
	if (!leaf.includes(id)) leaf.push(id);
}

let cached: LayerGroupMap | undefined;

/**
 * Build the map of layer-group keys to layer IDs.
 *
 * Derived from the layers themselves — every layer carries the semantic group path that
 * `gate()` uses to hide or dim it — so the map cannot drift from what the options actually
 * control.
 *
 * `buildings: 'flat'` and `'extruded'` are mutually exclusive (flat footprints are replaced by
 * `building-3d`), so neither build alone lists every layer a group can control. Both are walked
 * and their IDs unioned; no other feature changes which layers exist.
 *
 * `icons` is a cross-cutting alias rather than a tag of its own, so it is listed as the union
 * of the groups it defaults: `pois`, `markings` and `transit.stops`.
 */
export function getLayerGroupMap(): LayerGroupMap {
	if (cached) return cached;

	const map: LayerGroupMap = {};
	for (const buildings of ['flat', 'extruded'] as const) {
		const ctx = buildContext(resolveOsm({ features: { buildings } }));
		for (const { layer, group } of shortbreadLayers(ctx)) {
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

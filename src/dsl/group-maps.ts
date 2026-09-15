import type { TaggedLayer } from './build.js';
import { textTopic } from './text.js';

/**
 * A tree mirroring `LayerGroupOptions`, with the layer IDs each group controls at the leaves.
 * Branch nodes (e.g. `roads.streets`) hold their sub-groups rather than IDs.
 */
export type LayerGroupMap = { [key: string]: string[] | LayerGroupMap };

/** The text tree — `boundaries.countries`, `pois.transit`, … — with the text layer IDs each topic sets. */
export type TextGroupMap = LayerGroupMap;

function insert(root: LayerGroupMap, path: string, id: string): void {
	const parts = path.split('.');
	let node = root;
	for (const key of parts.slice(0, -1)) {
		const next = (node[key] ??= {});
		// Group paths form a clean tree — no path is a prefix of another — so a branch is
		// never also a leaf. Guard anyway rather than silently dropping IDs.
		if (Array.isArray(next)) throw new Error(`group map: "${path}" conflicts with a leaf group`);
		node = next;
	}
	const leaf = (node[parts.at(-1)!] ??= []) as string[];
	// The same layer can be reached from more than one build (see buildGroupMaps).
	if (!leaf.includes(id)) leaf.push(id);
}

/**
 * The layer-group map and the text-group map of a schema, from its tagged layers.
 *
 * Both are derived from the same `group` tag that `gate()` hides layers by and `applyText()` styles
 * labels by, so neither map can drift from what the options actually control.
 *
 * `builds` holds one tagged-layer stream per build a schema has to walk to see every layer:
 * `buildings: 'flat'` and `'extruded'` are mutually exclusive (flat footprints are replaced by
 * `building-3d`), so the callers pass both and their IDs are unioned.
 *
 * `icons` is a cross-cutting alias rather than a tag of its own, so it is listed as the union of the
 * groups it defaults: `pois`, `markings` and `transit.stops`.
 */
export function buildGroupMaps(builds: Iterable<Iterable<TaggedLayer>>): {
	layers: LayerGroupMap;
	text: TextGroupMap;
} {
	const layers: LayerGroupMap = {};
	const text: TextGroupMap = {};
	for (const tagged of builds) {
		for (const { layer, group } of tagged) {
			if (!group) continue;
			insert(layers, group, layer.id);
			const textField = (layer as { layout?: Record<string, unknown> }).layout?.['text-field'];
			const topic = textTopic(group);
			if (layer.type === 'symbol' && textField != null && topic) insert(text, topic, layer.id);
		}
	}

	const transit = layers.transit as LayerGroupMap | undefined;
	layers.icons = [
		...((layers.pois as string[]) ?? []),
		...((layers.markings as string[]) ?? []),
		...((transit?.stops as string[]) ?? []),
	];

	return { layers, text };
}

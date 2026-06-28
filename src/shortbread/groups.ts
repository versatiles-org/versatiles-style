import { resolveOsmOptions } from '../resolve/index.js';
import { buildContext } from './context.js';
import {
	shortbreadLayers,
	SLOT_BELOW_FILLS,
	SLOT_BELOW_STREETS,
	SLOT_BELOW_SYMBOLS,
	SLOT_BELOW_LABELS,
} from './layers/index.js';

// ── Slot IDs for osm.slots ────────────────────────────────────────────────────

export const SLOT_IDS = {
	belowFills: SLOT_BELOW_FILLS,
	belowStreets: SLOT_BELOW_STREETS,
	belowSymbols: SLOT_BELOW_SYMBOLS,
	belowLabels: SLOT_BELOW_LABELS,
} as const;

// ── Layer group registry (derived from the modules' group tags) ────────────────
//
// Each layer module tags its layers with a semantic group path (e.g. 'roads.streets.residential').
// The registry that powers the `layers:` show/hide/opacity option is assembled from those tags —
// a single source of truth, so it can never drift out of sync with the layer definitions.

type GroupNode = string[] | { [key: string]: GroupNode };

function deriveLayerGroups(): Record<string, GroupNode> {
	// Color values don't affect group membership; any resolved context yields the same tags.
	const ctx = buildContext(resolveOsmOptions());
	const root: Record<string, GroupNode> = {};

	for (const { layer, group } of shortbreadLayers(ctx)) {
		if (!group) continue;
		const segments = group.split('.');
		let node: Record<string, GroupNode> = root;
		for (let i = 0; i < segments.length - 1; i++) {
			node[segments[i]] ??= {};
			node = node[segments[i]] as Record<string, GroupNode>;
		}
		const leaf = segments[segments.length - 1];
		(node[leaf] ??= []) as string[];
		(node[leaf] as string[]).push(layer.id);
	}

	// convenience alias: all icon-type symbols combined (POIs + transit stops + markings)
	const transit = root.transit as Record<string, GroupNode> | undefined;
	root.icons = [
		...((root.pois as string[]) ?? []),
		...((transit?.stops as string[]) ?? []),
		...((root.markings as string[]) ?? []),
	];

	return root;
}

export const layerGroups = deriveLayerGroups();

export type LayerGroups = typeof layerGroups;

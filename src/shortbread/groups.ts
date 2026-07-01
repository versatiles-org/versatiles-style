import type { LayerGroupOptions } from '../options/index.js';
import { resolveOsmOptions } from '../options/index.js';
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

// ── Layer override resolution (from the `layers:` option) ──────────────────────
//
// Resolves a LayerGroupOptions tree into a flat `layerId → override` map, used by
// the layer assembler to drop invisible layers and apply opacity at build time.

/** The effective state a `layers:` option imposes on a single layer. */
export type LayerOverride = { visible: boolean; opacity?: number };

// Walk a registry group node alongside the matching option value, recording an
// override for every affected layer id. `false`/`0` hides; `true`/`1` clears any
// inherited override (back to default visible); a fractional number sets opacity.
function collectGroupOverrides(group: unknown, opt: unknown, result: Map<string, LayerOverride>): void {
	if (opt === undefined) return;

	if (Array.isArray(group)) {
		const ids = group as string[];
		if (opt === false || opt === 0) {
			ids.forEach((id) => result.set(id, { visible: false }));
		} else if (opt === true || opt === 1) {
			ids.forEach((id) => result.delete(id));
		} else if (typeof opt === 'number') {
			ids.forEach((id) => result.set(id, { visible: true, opacity: opt }));
		}
		return;
	}

	if (typeof group === 'object' && group !== null) {
		const groupObj = group as Record<string, unknown>;
		if (typeof opt === 'boolean' || typeof opt === 'number') {
			for (const child of Object.values(groupObj)) {
				collectGroupOverrides(child, opt, result);
			}
		} else if (typeof opt === 'object' && opt !== null) {
			const optObj = opt as Record<string, unknown>;
			for (const [key, child] of Object.entries(groupObj)) {
				if (key in optObj) collectGroupOverrides(child, optObj[key], result);
			}
		}
	}
}

const GROUP_KEYS = [
	'land',
	'water',
	'roads',
	'transit',
	'buildings',
	'sites',
	'airport',
	'pois',
	'boundaries',
	'markings',
	'labels',
] as const;

/** Resolve the `layers:` option into a `layerId → override` map. Returns an empty
 *  map when no layer options are set (all layers stay at their default state). */
export function resolveLayerOverrides(opts: LayerGroupOptions | undefined): Map<string, LayerOverride> {
	const overrides = new Map<string, LayerOverride>();
	if (!opts || Object.keys(opts).length === 0) return overrides;

	// Process the `icons` alias first (least specific), then individual groups override it.
	if (opts.icons !== undefined) collectGroupOverrides(layerGroups.icons, opts.icons, overrides);

	const groups = layerGroups as unknown as Record<string, unknown>;
	const optsObj = opts as Record<string, unknown>;
	for (const key of GROUP_KEYS) {
		if (key in optsObj) collectGroupOverrides(groups[key], optsObj[key], overrides);
	}
	return overrides;
}

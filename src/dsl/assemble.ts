import type { MaplibreLayer } from '../types/index.js';
import { gate, type TaggedLayer } from './build.js';
import type { LayerContext } from './context.js';
import { applyText } from './text.js';

/**
 * Assembling a schema's tagged layer stream into a finished layer list — schema-neutral.
 *
 * Everything here was lifted out of `src/shortbread/layers/index.ts`, where it sat next to the two
 * things that really are per-schema: the render-order list (`assembleLayers`) and the `MERGES` table,
 * which is keyed by layer id and so speaks a schema's own dialect. The machinery around them is not:
 * raising a layer to its data floor, collapsing registered identical runs, and materializing the
 * stream are the same operations whichever tileset is underneath (SCHEMA-SUPPORT-PLAN.md §3).
 *
 * Both entry points take their per-schema data as an argument, so a second schema composes this rather
 * than copying it — which is the difference between duplicating cartography (option A's accepted cost)
 * and duplicating plumbing (not).
 */

/**
 * The zoom each source-layer's data begins at — structurally what a vendored schema record provides,
 * narrowed to the one field the data floor needs. `SHORTBREAD_SCHEMA` and `OMT_SCHEMA` both satisfy it
 * as generated, so neither has to be adapted.
 */
export type DataFloors = Readonly<Record<string, { minzoom: number }>>;

/** Layers drawn as one, by merged ID, with their members in draw order. */
export type MergeTable = Readonly<Record<string, readonly string[]>>;

// Materialize the assembled layers, adding the source to every non-background layer (background +
// slot anchors carry no source), ready to drop into a style. Per-group visibility/opacity from the
// `layers:` option is applied here in a single pass by `gate`: hidden groups are dropped, fractional
// opacity is merged into each affected layer. Text layers get their typography here too, from the same
// group tag (`applyText`), so no layer module sets a font, halo or capitalization of its own.
export function buildLayers(ctx: LayerContext, floors: DataFloors, tagged: Iterable<TaggedLayer>): MaplibreLayer[] {
	const layers: MaplibreLayer[] = [];
	for (const { layer, group } of gate(ctx.layers, tagged)) {
		applyText(layer, group, ctx.text);
		if (layer.type !== 'background') applyDataFloor(layer, floors);
		layers.push(layer.type === 'background' ? layer : ({ ...layer, source: ctx.source } as MaplibreLayer));
	}
	return layers;
}

/**
 * Raise a layer's `minzoom` to the zoom where its source-layer's data actually begins.
 *
 * `make()` derives `minzoom` from a layer's transition, which covers everything that fades or grows
 * in. Layers with no transition had no gate at all, so MapLibre processed them from z0 while the
 * tiles carried nothing — `water-river` was live from z0 although `water_lines` starts at z9.
 *
 * Only ever raises, never lowers: a layer deliberately gated later than its data keeps that.
 * `addLandcover` runs after this and clears the gate on the fills it reveals, which is what lets
 * the low-zoom landcover extension supply those kinds below their plain-Shortbread zoom (#124).
 */
function applyDataFloor(layer: MaplibreLayer, floors: DataFloors): void {
	const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
	if (!sourceLayer) return;
	const dataFrom = floors[sourceLayer]?.minzoom;
	if (dataFrom === undefined) return;
	const l = layer as { minzoom?: number };
	if ((l.minzoom ?? 0) < dataFrom) l.minzoom = dataFrom;
}

// ── Merging layers that render identically (issue #51) ───────────────────────

/** Index a merge table by each run's first member, which is where a run is recognised. */
function mergeIndex(merges: MergeTable) {
	return new Map(Object.entries(merges).map(([id, members]) => [members[0], { id, members }]));
}

/** Everything that decides how a layer draws — its identity and its filter aside. */
function renderKey(layer: MaplibreLayer): string {
	const { id, filter, ...rest } = layer as MaplibreLayer & { filter?: unknown };
	void id;
	void filter;
	return JSON.stringify(rest);
}

/**
 * Combine the filters of a merged run.
 *
 * `['any', …]` is always correct, but the run is nearly always a set of layers selecting one `kind`
 * each out of an otherwise identical clause list, so that case collapses to a single `in` test and
 * keeps the emitted filter readable (and small — halving the style's filter text was part of the
 * point of #51). Anything else falls back to `any`.
 */
function mergeFilters(filters: unknown[]): unknown {
	// a layer with no filter draws every feature, so the union is "everything"
	if (filters.some((f) => f === undefined)) return undefined;

	const all = filters as [string, ...unknown[]][];
	if (all.every((f) => f[0] === 'all' && f.length === all[0].length)) {
		const differing: number[] = [];
		for (let i = 1; i < all[0].length; i++) {
			const first = JSON.stringify(all[0][i]);
			if (!all.every((f) => JSON.stringify(f[i]) === first)) differing.push(i);
		}
		if (differing.length === 1) {
			const i = differing[0];
			const clauses = all.map((f) => f[i]) as [string, unknown, unknown][];
			const getter = JSON.stringify(clauses[0]?.[1]);
			if (clauses.every((c) => c[0] === '==' && JSON.stringify(c[1]) === getter)) {
				const merged = [...all[0]];
				merged[i] = ['in', clauses[0][1], ['literal', clauses.map((c) => c[2])]];
				return merged;
			}
		}
	}
	return ['any', ...filters];
}

/**
 * Collapse a schema's registered merges into single layers (issue #51: v6 emitted 355 layers
 * against v5's 324).
 *
 * A registered merge is applied when its members arrive **adjacent**, in the **same group**, and
 * identical in every property **except their filter** — so the merged layer paints exactly the pixels
 * they did, and `osm.layerGroups` keeps controlling the same features. Feature order within the
 * merged layer differs from the old layer-by-layer order, which cannot matter: the paint is the same
 * for all of them. Layers that are not registered are never merged, however they are drawn.
 *
 * Symbol layers are never registered: MapLibre resolves label collisions in layer order, so folding
 * `label-street-*` together would change which street name survives a collision.
 *
 * This runs over the assembled generator rather than over the built style so that
 * `getLayerGroupMap()` — which walks the same generator — reports the merged IDs. Merging before
 * `gate()` is safe because a merge is single-group: whatever `gate` does to one member it does to all.
 */
export function* mergeIdenticalLayers(merges: MergeTable, source: Iterable<TaggedLayer>): Generator<TaggedLayer> {
	const byFirstMember = mergeIndex(merges);
	const layers = [...source];
	for (let i = 0; i < layers.length; i++) {
		const merge = byFirstMember.get(layers[i].layer.id);
		const run = merge ? layers.slice(i, i + merge.members.length) : [];
		const applies =
			merge !== undefined &&
			run.length === merge.members.length &&
			run.every(
				(tagged, k) =>
					tagged.layer.id === merge.members[k] &&
					tagged.group === run[0].group &&
					renderKey(tagged.layer) === renderKey(run[0].layer)
			);
		if (!applies) {
			yield layers[i];
			continue;
		}
		const filter = mergeFilters(run.map((t) => (t.layer as { filter?: unknown }).filter));
		const merged = { ...run[0].layer, id: merge.id } as MaplibreLayer & { filter?: unknown };
		if (filter === undefined) delete merged.filter;
		else merged.filter = filter;
		yield { layer: merged, group: run[0].group };
		i += merge.members.length - 1;
	}
}

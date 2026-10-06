import type { MaplibreLayer } from '../types/index.js';
import { gate, type TaggedLayer } from './build.js';
import type { LayerContext } from './context.js';
import { applyText } from './text.js';
import { scaleValue } from '../lib/index.js';

/**
 * Assembling a schema's tagged layer stream into a finished layer list — schema-neutral.
 *
 * Everything here was lifted out of `src/shortbread/layers/index.ts`, where it sat next to what really
 * is per-schema: the render-order list. The machinery around it is not: raising a layer to its data
 * floor and materializing the stream are the same operations whichever tileset is underneath.
 *
 * Kinds that draw alike are not merged here after the fact: each schema's generators emit one layer per
 * style class in the first place (`STREET_CLASSES` in `src/shortbread/layers/roads.ts`, say). A
 * post-processing merge used to do it, keyed by a table of member ids in each schema's dialect; the
 * classes made the table and its second vocabulary of ids unnecessary.
 *
 * `buildLayers` takes its per-schema data as an argument, so a second schema composes this rather than
 * copying it — which is the difference between duplicating cartography (option A's accepted cost) and
 * duplicating plumbing (not).
 */

/**
 * The zoom each source-layer's data begins at — structurally what a vendored schema record provides,
 * narrowed to the one field the data floor needs. `SHORTBREAD_SCHEMA` and `OMT_SCHEMA` both satisfy it
 * as generated, so neither has to be adapted.
 */
export type DataFloors = Readonly<Record<string, { minzoom: number }>>;

// Materialize the assembled layers, adding the source to every non-background layer (background +
// slot anchors carry no source), ready to drop into a style. Per-group visibility/opacity from the
// `layers:` option is applied here in a single pass by `gate`: hidden groups are dropped, fractional
// opacity is merged into each affected layer. Text layers get their typography here too, from the same
// group tag (`applyText`), so no layer module sets a font, halo or capitalization of its own.
export function buildLayers(ctx: LayerContext, floors: DataFloors, tagged: Iterable<TaggedLayer>): MaplibreLayer[] {
	const layers: MaplibreLayer[] = [];
	for (const { layer, group } of gate(ctx.layers, tagged)) {
		applyText(layer, group, ctx.text);
		applyLineWidth(layer, group, ctx.layers);
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

/**
 * Scale the width of a line by its group's `width` — the multiplier a border or a path takes in
 * `layers` (`LineStyle`).
 *
 * Here, by group tag, rather than in the module that draws the line: a group is several layers — the
 * line, a border's halo, a path's bridge deck, the same again in a tunnel — and they have to grow
 * together, in every schema. A dash needs nothing: its pattern is in multiples of the width. Nor does
 * `minzoom`, which follows where a width ramp leaves 0, and scaling leaves a 0 where it is.
 *
 * A width of 1, which is every line's unless asked otherwise, touches nothing, so a style built without
 * the option is the style it always was.
 */
function applyLineWidth(layer: MaplibreLayer, group: string | undefined, layers: LayerContext['layers']): void {
	if (layer.type !== 'line' || !group) return;
	let node: unknown = layers;
	for (const segment of group.split('.')) node = (node as Record<string, unknown> | undefined)?.[segment];
	const width = (node as { width?: unknown } | undefined)?.width;
	if (typeof width !== 'number' || width === 1) return;
	const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
	// an unset `line-width` is MapLibre's default of 1
	paint['line-width'] = scaleValue(paint['line-width'] ?? 1, width);
}

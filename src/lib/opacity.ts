/**
 * Opacity arithmetic on built MapLibre layers — schema-neutral, and deliberately a leaf module.
 *
 * Both the group-visibility gate in the layer DSL and the satellite overlay need to dim an
 * already-built layer. Keeping this here rather than in a schema's DSL is what lets
 * `features/satellite-overlay.ts` stay free of any `shortbread/` import.
 */
import type { MaplibreLayer } from '../types/index.js';

// The opacity paint property (or properties, for symbols) of each layer type.
const OPACITY_PROPS: Partial<Record<MaplibreLayer['type'], string[]>> = {
	fill: ['fill-opacity'],
	line: ['line-opacity'],
	symbol: ['text-opacity', 'icon-opacity'],
	background: ['background-opacity'],
	'fill-extrusion': ['fill-extrusion-opacity'],
};

// Scale an existing opacity value by `factor`, preserving any zoom-stops fade: a number is
// multiplied directly, an `interpolate` expression has each of its output values scaled, and an
// absent value is treated as fully opaque (→ `factor`). Any other expression is wrapped in a `*`.
function scaleOpacity(value: unknown, factor: number): unknown {
	if (value == null) return factor;
	if (typeof value === 'number') return value * factor;
	// ['interpolate', <interp>, ['zoom'], z0, v0, z1, v1, …] — output values live at 4, 6, 8, …
	if (Array.isArray(value) && value[0] === 'interpolate') {
		const scaled = value.slice();
		for (let i = 4; i < scaled.length; i += 2) {
			if (typeof scaled[i] === 'number') scaled[i] = (scaled[i] as number) * factor;
		}
		return scaled;
	}
	return ['*', value, factor];
}

// Dim a layer by `factor`, merging with its existing opacity rather than overwriting it — so a fade
// `{14:0, 15:0.8}` scaled by 0.5 becomes `{14:0, 15:0.4}`, and a plain layer becomes a constant.
export function scaleLayerOpacity(layer: MaplibreLayer, factor: number): void {
	const props = OPACITY_PROPS[layer.type];
	if (!props) return;
	const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
	for (const prop of props) paint[prop] = scaleOpacity(paint[prop], factor);
}

/**
 * The same dimming, but moved onto `line-layer-opacity` — for a layer whose own geometry overlaps
 * itself.
 *
 * `line-opacity` is applied per feature, so wherever a line covers a pixel twice MapLibre blends
 * twice and the pixel comes out brighter than the value asked for. `line-layer-opacity` composites
 * the layer's finished output once instead, so overlapping lines read as one surface. The whole
 * value moves — the property is data-constant but takes zoom expressions, so an `appear` fade
 * survives the trip — because a `line-opacity` left behind would accumulate again *before* the
 * layer is composited, which is the artefact this exists to remove.
 *
 * Requires MapLibre GL JS 6. Older renderers, and MapLibre Native (maplibre-native#4298), ignore the
 * property and draw the layer opaque.
 */
export function liftLineOpacityToLayer(layer: MaplibreLayer, factor: number): void {
	if (layer.type !== 'line') return;
	const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
	paint['line-layer-opacity'] = scaleOpacity(paint['line-opacity'], factor);
	delete paint['line-opacity'];
}

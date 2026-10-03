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

/** Zoom stops of a piecewise-linear curve, `{ zoom: value }`. */
export type ZoomCurve = Readonly<Record<number, number>>;

// The stops of a constant or of a linear zoom ramp, or `undefined` for anything else.
function zoomStops(value: unknown): [number, number][] | undefined {
	if (value == null) return [[0, 1]];
	if (typeof value === 'number') return [[0, value]];
	if (
		Array.isArray(value) &&
		value[0] === 'interpolate' &&
		JSON.stringify(value[1]) === '["linear"]' &&
		JSON.stringify(value[2]) === '["zoom"]' &&
		value.slice(3).every((entry) => typeof entry === 'number')
	) {
		const stops: [number, number][] = [];
		for (let i = 3; i < value.length; i += 2) stops.push([value[i] as number, value[i + 1] as number]);
		return stops;
	}
	return undefined;
}

// A piecewise-linear curve at `zoom`, held constant past its first and last stop.
function at(stops: [number, number][], zoom: number): number {
	if (zoom <= stops[0][0]) return stops[0][1];
	for (let i = 1; i < stops.length; i++) {
		const [z1, v1] = stops[i];
		if (zoom <= z1) {
			const [z0, v0] = stops[i - 1];
			return v0 + ((v1 - v0) * (zoom - z0)) / (z1 - z0);
		}
	}
	return stops[stops.length - 1][1];
}

/**
 * Move a line layer's dimming from `line-opacity` to `line-layer-opacity`: the layer's own opacity,
 * scaled by `factor`, becomes its layer opacity, and the per-feature `line-opacity` is removed.
 *
 * `factor` is a number, or a {@link ZoomCurve} when the scale has to change with zoom; the result is
 * then a linear zoom ramp over the stops of both.
 *
 * `line-layer-opacity` takes zoom expressions but no data expressions, so a layer whose opacity reads
 * feature properties is left untouched and `false` returned; it then needs `scaleLayerOpacity`. With a
 * curve, an opacity that is not a constant or a linear zoom ramp is left untouched the same way.
 */
export function moveToLineLayerOpacity(layer: MaplibreLayer, factor: number | ZoomCurve): boolean {
	if (layer.type !== 'line') return false;
	const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
	const value = paint['line-opacity'];
	if (typeof factor === 'number') {
		const zoomOnly =
			value == null ||
			typeof value === 'number' ||
			(Array.isArray(value) &&
				value[0] === 'interpolate' &&
				JSON.stringify(value[2]) === '["zoom"]' &&
				value.slice(3).every((entry) => typeof entry === 'number'));
		if (!zoomOnly) return false;
		paint['line-layer-opacity'] = scaleOpacity(value, factor);
	} else {
		const base = zoomStops(value);
		if (!base) return false;
		const curve = Object.entries(factor).map(([zoom, f]): [number, number] => [Number(zoom), f]);
		curve.sort((a, b) => a[0] - b[0]);
		const zooms = [...new Set([...base, ...curve].map(([zoom]) => zoom))].sort((a, b) => a - b);
		paint['line-layer-opacity'] = [
			'interpolate',
			['linear'],
			['zoom'],
			// Rounded, so a product like 0.4 × 1.15 is written as 0.46 rather than 0.45999999999999996.
			...zooms.flatMap((zoom) => [zoom, Math.round(at(base, zoom) * at(curve, zoom) * 1e6) / 1e6]),
		];
	}
	delete paint['line-opacity'];
	return true;
}

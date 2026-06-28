import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Color } from '../color/index.js';
import type { MaplibreLayer } from '../types/index.js';
import propertyLookup from './properties.js';

// ── Public value types ────────────────────────────────────────────────────────

/** A scalar, or zoom-stops `{ z: value }` that become an `interpolate` expression. */
export type SizeValue = number | Record<number, number>;
type ColorValue = Color | string;

/** A built layer plus its semantic group path (e.g. 'roads.streets.residential'); the
 *  assembler records the path into the visibility registry and drops it from the output. */
export type TaggedLayer = { layer: MaplibreLayer; group?: string };

// Style overrides — the same camelCase keys the old decorator/ThemeRules used. Each is
// mapped to its MapLibre paint/layout property (per type) via properties.ts.
export type StyleProps = {
	color?: ColorValue;
	size?: SizeValue;
	opacity?: number | Record<number, number>;
	image?: unknown;
	text?: unknown;
	font?: string;
	minzoom?: number;
	maxzoom?: number;
	fillOutlineColor?: ColorValue;
	fillAntialias?: boolean;
	fillTranslate?: [number, number];
	fillExtrusionHeight?: unknown;
	fillExtrusionBase?: unknown;
	lineBlur?: number;
	lineCap?: string;
	lineJoin?: string;
	lineDasharray?: number[];
	textHaloColor?: ColorValue;
	textHaloWidth?: number;
	textHaloBlur?: number;
	textTransform?: string;
	textAnchor?: string;
	textOffset?: [number, number];
	textPadding?: number;
	textOptional?: boolean;
	symbolPlacement?: string;
	iconSize?: SizeValue;
	iconOpacity?: number;
	iconKeepUpright?: boolean;
	iconAnchor?: string;
	iconOptional?: boolean;
};

// Structural fields (define the layer itself, not its paint/layout styling).
type StructuralProps = {
	sourceLayer?: string;
	filter?: FilterSpecification;
	/** Raw layout passthrough for structural props not covered by StyleProps (e.g. symbol-spacing). */
	layout?: Record<string, unknown>;
	/** Semantic group path for the derived visibility registry. */
	group?: string;
};

export type BuildOpts = StyleProps & StructuralProps;

// ── Value processing (ported from the old decorator, applied to ONE known layer) ──

type RuleValue = boolean | number | object | string;

function processColor(value: RuleValue): string {
	if (typeof value === 'string') value = Color.parse(value);
	if (value instanceof Color) return value.asString();
	throw new Error(`build.processColor: expected a color string or Color, got ${typeof value}`);
}

function processFont(value: RuleValue): string[] {
	if (typeof value === 'string') return [value];
	throw new Error(`build.processFont: expected a font name string, got ${typeof value}`);
}

// Zoom-stops object `{ z: v }` → ['interpolate', ['linear'], ['zoom'], z1, v1, …] (zooms sorted).
function processZoomStops(obj: Record<string, RuleValue>, cb?: (v: RuleValue) => RuleValue): RuleValue[] {
	const pairs = Object.entries(obj)
		.map(([z, v]) => [parseInt(z, 10), cb ? cb(v) : v] as [number, RuleValue])
		.sort((a, b) => a[0] - b[0]);
	const expr: RuleValue[] = ['interpolate', ['linear'] as unknown as RuleValue, ['zoom'] as unknown as RuleValue];
	for (const [z, v] of pairs) expr.push(z, v);
	return expr;
}

function processExpression(value: RuleValue, cb?: (v: RuleValue) => RuleValue): RuleValue {
	if (typeof value === 'object') {
		if (value instanceof Color) return processColor(value);
		if (!Array.isArray(value)) return processZoomStops(value as Record<string, RuleValue>, cb);
	}
	return cb ? cb(value) : value;
}

function camelToKebab(s: string): string {
	return s.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

function assign(layer: MaplibreLayer, parent: 'layer' | 'layout' | 'paint', key: string, value: unknown): void {
	if (parent === 'layer') {
		(layer as Record<string, unknown>)[key] = value;
	} else {
		const target = ((layer as Record<string, unknown>)[parent] ??= {}) as Record<string, unknown>;
		target[key] = value;
	}
}

// Apply a set of camelCase style overrides to a single layer, dispatching each to the
// correct paint/layout property for the layer's type. Keys with no mapping for this type
// are silently ignored (matching the old decorator).
function applyProps(layer: MaplibreLayer, props: StyleProps): void {
	for (const [camelKey, raw] of Object.entries(props)) {
		if (raw == null) continue;
		const ruleKey = camelToKebab(camelKey);
		const defs = propertyLookup.get(layer.type + '/' + ruleKey);
		if (!defs) continue;
		for (const def of defs) {
			let value: RuleValue;
			switch (def.valueType) {
				case 'color':
					value = processExpression(raw as RuleValue, processColor);
					break;
				case 'fonts':
					value = processExpression(raw as RuleValue, processFont);
					break;
				default:
					value = processExpression(raw as RuleValue);
					break;
			}
			assign(layer, def.parent, def.key, value);
		}
	}
}

// ── Builders ──────────────────────────────────────────────────────────────────

function make(type: MaplibreLayer['type'], id: string, opts: BuildOpts): TaggedLayer {
	const { sourceLayer, filter, layout, group, ...style } = opts;
	const layer = { id, type } as MaplibreLayer;
	if (sourceLayer != null) (layer as Record<string, unknown>)['source-layer'] = sourceLayer;
	if (filter != null) (layer as Record<string, unknown>).filter = filter;
	if (layout != null) (layer as Record<string, unknown>).layout = { ...layout };
	applyProps(layer, style as StyleProps);
	return { layer, group };
}

export const background = (id: string, opts: BuildOpts = {}): TaggedLayer => make('background', id, opts);
export const fill = (id: string, opts: BuildOpts = {}): TaggedLayer => make('fill', id, opts);
export const line = (id: string, opts: BuildOpts = {}): TaggedLayer => make('line', id, opts);
export const symbol = (id: string, opts: BuildOpts = {}): TaggedLayer => make('symbol', id, opts);
export const fillExtrusion = (id: string, opts: BuildOpts = {}): TaggedLayer => make('fill-extrusion', id, opts);

/** An invisible background anchor layer used as a MapLibre `beforeId` slot. */
export const slot = (id: string): TaggedLayer => ({
	layer: { id, type: 'background', paint: { 'background-opacity': 0 } } as MaplibreLayer,
});

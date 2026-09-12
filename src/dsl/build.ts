import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import { Color } from '../color/index.js';
import type { MaplibreLayer } from '../types/index.js';
import type { ResolvedLayerGroups } from '../options/index.js';
import { scaleLayerOpacity } from '../lib/opacity.js';

// ── Public value types ────────────────────────────────────────────────────────

/** Exponential zoom-stops: `{ base, stops: { z: value } }` → `interpolate ['exponential', base]`.
 *  Used to match OpenMapTiles/OSM Bright curves (which interpolate width with `base: 1.2`). */
export type ExpStops = { base: number; stops: Record<number, number> };

/** A scalar, linear zoom-stops `{ z: value }`, or exponential zoom-stops `{ base, stops }`. */
export type SizeValue = number | Record<number, number> | ExpStops;
type ColorValue = Color | string;

/** A built layer plus its semantic group path (e.g. 'roads.streets.residential'); the
 *  assembler records the path into the visibility registry and drops it from the output. */
export type TaggedLayer = { layer: MaplibreLayer; group?: string };

// Style overrides authored as camelCase keys; each is mapped to its MapLibre paint/layout
// property (per layer type) by the PROPERTY_DEFS table below.
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
	textOpacity?: number | Record<number, number>;
	textOptional?: boolean;
	symbolPlacement?: string;
	iconSize?: SizeValue;
	iconOpacity?: number | Record<number, number>;
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
	/** Smoothly fade this layer in over `appear`→`appear+1` by ramping opacity 0 → target (the layer's
	 *  own constant `opacity`, e.g. 0.1/0.8, else 1), so it doesn't pop in when its features first
	 *  appear in the tiles. Mutually exclusive with a zoom-stops `opacity`.
	 *
	 *  Also sets `minzoom` to the same zoom unless one is given explicitly: the fade is already at
	 *  opacity 0 below it, so this is output-identical and lets MapLibre skip the layer instead of
	 *  drawing it invisibly. `addLandcover` clears the `minzoom` again on the fills it flattens,
	 *  which is what lets the landcover feature reveal them at low zoom. */
	appear?: number;
};

export type BuildOpts = StyleProps & StructuralProps;

// ── MapLibre property metadata ────────────────────────────────────────────────
//
// Maps each StyleProps key (and the type-dependent shorthands color/size/opacity/image/text/font)
// to its MapLibre property: which `parent` (paint/layout/layer) it lives under and how its value
// is processed (`color` → parse, `fonts` → wrap in array, `plain` → passthrough / zoom-stops).
// Scoped to exactly the keys the builders support.

type PropParent = 'layer' | 'layout' | 'paint';
type PropValueType = 'color' | 'fonts' | 'plain';
type PropDef = { parent: PropParent; types: string; key: string; short?: string; valueType: PropValueType };

const PROPERTY_DEFS: PropDef[] = [
	// layer
	{ parent: 'layer', types: 'background,fill,fill-extrusion,line,symbol', key: 'minzoom', valueType: 'plain' },
	{ parent: 'layer', types: 'background,fill,fill-extrusion,line,symbol', key: 'maxzoom', valueType: 'plain' },
	// layout — line
	{ parent: 'layout', types: 'line', key: 'line-cap', valueType: 'plain' },
	{ parent: 'layout', types: 'line', key: 'line-join', valueType: 'plain' },
	// layout — symbol
	{ parent: 'layout', types: 'symbol', key: 'icon-anchor', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'icon-image', short: 'image', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'icon-keep-upright', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'icon-optional', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'icon-size', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'symbol-placement', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'text-anchor', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'text-field', short: 'text', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'text-font', short: 'font', valueType: 'fonts' },
	{ parent: 'layout', types: 'symbol', key: 'text-offset', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'text-optional', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'text-padding', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'text-size', short: 'size', valueType: 'plain' },
	{ parent: 'layout', types: 'symbol', key: 'text-transform', valueType: 'plain' },
	// paint — background
	{ parent: 'paint', types: 'background', key: 'background-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'background', key: 'background-opacity', short: 'opacity', valueType: 'plain' },
	{ parent: 'paint', types: 'background', key: 'background-pattern', short: 'image', valueType: 'plain' },
	// paint — fill
	{ parent: 'paint', types: 'fill', key: 'fill-antialias', valueType: 'plain' },
	{ parent: 'paint', types: 'fill', key: 'fill-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'fill', key: 'fill-opacity', short: 'opacity', valueType: 'plain' },
	{ parent: 'paint', types: 'fill', key: 'fill-outline-color', valueType: 'color' },
	{ parent: 'paint', types: 'fill', key: 'fill-pattern', short: 'image', valueType: 'plain' },
	{ parent: 'paint', types: 'fill', key: 'fill-translate', valueType: 'plain' },
	// paint — fill-extrusion
	{ parent: 'paint', types: 'fill-extrusion', key: 'fill-extrusion-base', valueType: 'plain' },
	{ parent: 'paint', types: 'fill-extrusion', key: 'fill-extrusion-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'fill-extrusion', key: 'fill-extrusion-height', valueType: 'plain' },
	{ parent: 'paint', types: 'fill-extrusion', key: 'fill-extrusion-opacity', short: 'opacity', valueType: 'plain' },
	// paint — line
	{ parent: 'paint', types: 'line', key: 'line-blur', valueType: 'plain' },
	{ parent: 'paint', types: 'line', key: 'line-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'line', key: 'line-dasharray', valueType: 'plain' },
	{ parent: 'paint', types: 'line', key: 'line-opacity', short: 'opacity', valueType: 'plain' },
	{ parent: 'paint', types: 'line', key: 'line-pattern', short: 'image', valueType: 'plain' },
	{ parent: 'paint', types: 'line', key: 'line-width', short: 'size', valueType: 'plain' },
	// paint — symbol
	{ parent: 'paint', types: 'symbol', key: 'icon-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'symbol', key: 'icon-opacity', short: 'opacity', valueType: 'plain' },
	{ parent: 'paint', types: 'symbol', key: 'text-color', short: 'color', valueType: 'color' },
	{ parent: 'paint', types: 'symbol', key: 'text-halo-blur', valueType: 'plain' },
	{ parent: 'paint', types: 'symbol', key: 'text-halo-color', valueType: 'color' },
	{ parent: 'paint', types: 'symbol', key: 'text-halo-width', valueType: 'plain' },
	{ parent: 'paint', types: 'symbol', key: 'text-opacity', short: 'opacity', valueType: 'plain' },
];

type PropTarget = { key: string; parent: PropParent; valueType: PropValueType };

// `${layerType}/${key|short}` → target property descriptors (a symbol `color`/`opacity` hits two).
const PROPERTY_LOOKUP = new Map<string, PropTarget[]>();
for (const def of PROPERTY_DEFS) {
	for (const type of def.types.split(',')) {
		for (const name of def.short ? [def.key, def.short] : [def.key]) {
			const lookupKey = type + '/' + name;
			const target: PropTarget = { key: def.key, parent: def.parent, valueType: def.valueType };
			const list = PROPERTY_LOOKUP.get(lookupKey);
			if (list) list.push(target);
			else PROPERTY_LOOKUP.set(lookupKey, [target]);
		}
	}
}

// ── Value processing (color → string, zoom-stops → interpolate), applied to ONE known layer ──

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

// Zoom-stops object `{ z: v }` → ['interpolate', <interp>, ['zoom'], z1, v1, …] (zooms sorted).
// `base` selects the interpolation: linear by default, ['exponential', base] when given.
function processZoomStops(
	obj: Record<string, RuleValue>,
	cb?: (v: RuleValue) => RuleValue,
	base?: number
): RuleValue[] {
	const pairs = Object.entries(obj)
		// parseFloat (not parseInt) so fractional zoom stops like 6.5 / 13.5 are preserved rather
		// than truncated — truncation collides with integer stops and yields invalid interpolations.
		.map(([z, v]) => [parseFloat(z), cb ? cb(v) : v] as [number, RuleValue])
		.sort((a, b) => a[0] - b[0]);
	const interp: RuleValue = base == null ? ['linear'] : ['exponential', base];
	const expr: RuleValue[] = ['interpolate', interp, ['zoom'] as unknown as RuleValue];
	for (const [z, v] of pairs) expr.push(z, v);
	return expr;
}

function isExpStops(o: Record<string, unknown>): o is { base: number; stops: Record<string, RuleValue> } {
	return typeof o.base === 'number' && typeof o.stops === 'object' && o.stops !== null && !Array.isArray(o.stops);
}

function processExpression(value: RuleValue, cb?: (v: RuleValue) => RuleValue): RuleValue {
	if (typeof value === 'object') {
		if (value instanceof Color) return processColor(value);
		if (!Array.isArray(value)) {
			const o = value as Record<string, RuleValue>;
			if (isExpStops(o)) return processZoomStops(o.stops, cb, o.base);
			return processZoomStops(o, cb);
		}
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
// are silently ignored.
function applyProps(layer: MaplibreLayer, props: StyleProps): void {
	for (const [camelKey, raw] of Object.entries(props)) {
		if (raw == null) continue;
		const ruleKey = camelToKebab(camelKey);
		const defs = PROPERTY_LOOKUP.get(layer.type + '/' + ruleKey);
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

/** Opacity ramp 0 → `target` over `appear`→`appear+span` (then held). A smooth fade-in that
 *  replaces hand-written `{ z: 0, z+1: 1 }` stops; pass a `target` below 1 for translucent fills. */
export function fadeIn(appear: number, target = 1, span = 1): Record<number, number> {
	return { [appear]: 0, [appear + span]: target };
}

/** VersaTiles tiles are generated for z0–14 only; z14 is always the deepest real tile. */
const SOURCE_MAXZOOM = 14;

/** The first zoom of a `{ z: 0, … }` ramp, or undefined if the value is not such a ramp. */
function rampFromZero(value: unknown): number | undefined {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
	const zooms = Object.keys(value as Record<string, number>)
		.map(Number)
		.filter((z) => Number.isFinite(z))
		.sort((a, b) => a - b);
	if (zooms.length === 0) return undefined;
	return (value as Record<number, number>)[zooms[0]] === 0 ? zooms[0] : undefined;
}

/**
 * The zoom at which a layer first draws something, or undefined if it has no zoom transition.
 *
 * A layer is visible only once *every* channel that ramps from 0 has left 0, so the appearance zoom
 * is the latest of them — a line whose opacity ramps at z10 but whose width ramps at z12 shows
 * nothing until z12.
 */
function appearZoom(style: StyleProps): number | undefined {
	const starts = [rampFromZero(style.opacity), rampFromZero(style.size)].filter((z): z is number => z !== undefined);
	return starts.length > 0 ? Math.max(...starts) : undefined;
}

function make(type: MaplibreLayer['type'], id: string, opts: BuildOpts): TaggedLayer {
	const { sourceLayer, filter, layout, group, appear, ...style } = opts;
	const layer = { id, type } as MaplibreLayer;
	if (sourceLayer != null) (layer as Record<string, unknown>)['source-layer'] = sourceLayer;
	if (filter != null) (layer as Record<string, unknown>).filter = filter;
	if (layout != null) (layer as Record<string, unknown>).layout = { ...layout };

	if (appear != null) {
		if (style.opacity != null && typeof style.opacity !== 'number')
			throw new Error(`build: layer "${id}" combines \`appear\` with a zoom-stops \`opacity\` — use one or the other`);
		style.opacity = fadeIn(appear, style.opacity ?? 1);
	}

	// ── minzoom is derived, never hand-written ────────────────────────────────────
	//
	// `minzoom` carries no cartographic meaning of its own: what a layer looks like is decided by
	// its transition (an opacity ramp, or a width ramp growing from 0). `minzoom` exists purely to
	// stop MapLibre processing a layer that is drawing nothing. So it is computed from the
	// transition rather than written by hand — hand-written values drift from the transition they
	// are meant to match, which is how the old style ended up with layers gated a zoom level away
	// from the fade they were meant to match, hiding a line that its own ramp said was already
	// drawing (or paying for one that was still invisible).
	//
	// The clamp matters as much as the derivation: VersaTiles tiles are only generated for z0–14,
	// so z14 is always the deepest real tile and everything above it is overzoomed from it. Gating a
	// layer later than 14 therefore gains no data — it only defers the work (bucket build, and for
	// symbols the collision/placement pass) from the final real tile to a worse moment.
	//
	// Layers with no transition keep whatever `minzoom` they were given: for those, `minzoom` *is*
	// the appearance mechanism. `addLandcover` clears the derived value on the fills it flattens.
	const appearsAt = appearZoom(style);
	if (appearsAt !== undefined) style.minzoom = Math.min(appearsAt, SOURCE_MAXZOOM);

	applyProps(layer, style as StyleProps);
	return { layer, group };
}

// `color` is mandatory wherever a missing color would render solid black in MapLibre
// (fill, line, fill-extrusion and background all default their color to black).
export type ColoredBuildOpts = BuildOpts & { color: ColorValue };

// Data layers must name the vector `source-layer` they read from; without it the layer
// silently renders nothing. (background and slot anchors carry no source and are exempt.)
type DataBuildOpts = BuildOpts & { sourceLayer: string };
type ColoredDataBuildOpts = ColoredBuildOpts & { sourceLayer: string };

/** StyleProps that are guaranteed to carry a color — the return shape for style
 *  helpers feeding the mandatory-color builders. */
export type ColoredStyleProps = StyleProps & { color: ColorValue };

export const background = (id: string, opts: ColoredBuildOpts): TaggedLayer => make('background', id, opts);
export const fill = (id: string, opts: ColoredDataBuildOpts): TaggedLayer => make('fill', id, opts);
export const line = (id: string, opts: ColoredDataBuildOpts): TaggedLayer => make('line', id, opts);
export const symbol = (id: string, opts: DataBuildOpts): TaggedLayer => make('symbol', id, opts);
export const fillExtrusion = (id: string, opts: ColoredDataBuildOpts): TaggedLayer => make('fill-extrusion', id, opts);

/** An invisible background anchor layer used as a MapLibre `beforeId` slot. */
export const slot = (id: string): TaggedLayer => ({
	layer: { id, type: 'background', paint: { 'background-opacity': 0 } } as MaplibreLayer,
});

// ── Group visibility gating ─────────────────────────────────────────────────────
//
// Each layer names a semantic group path (e.g. 'roads.streets.residential'); `gate` resolves that
// path against the fully-resolved `layers:` options and either drops the layer (hidden), dims it by
// merging a fractional opacity into its existing paint, or passes it through. It runs as a single
// post-processing pass over all assembled layers (see `buildStyleLayers`), so the group generators
// stay free of visibility concerns — the group tag they attach is the only input it needs.

// Read a resolved group option by its dotted path. Unknown/absent paths (e.g. untagged layers)
// resolve to `true` (visible), so only explicitly-grouped layers can be hidden or dimmed.
function layerOpt(layers: ResolvedLayerGroups, path: string | undefined): boolean | number {
	if (!path) return true;
	let node: unknown = layers;
	for (const segment of path.split('.')) {
		if (node && typeof node === 'object') node = (node as Record<string, unknown>)[segment];
		else return true;
	}
	return typeof node === 'boolean' || typeof node === 'number' ? node : true;
}

/** Filter/dim a stream of tagged layers by their group's resolved option: each layer is dropped
 *  entirely when hidden (`false`) rather than emitted at zero opacity, dimmed (opacity scaled) when
 *  fractional, and passed through unchanged when fully visible (`true`). Resolved options are already
 *  normalized (see `resolveLayerGroups`), so a group value is only ever `true`, `false`, or a
 *  fractional opacity in (0, 1). */
export function* gate(layers: ResolvedLayerGroups, tagged: Iterable<TaggedLayer>): Generator<TaggedLayer> {
	for (const tl of tagged) {
		const opt = layerOpt(layers, tl.group);
		if (opt === false) continue; // invisible → filtered out, not emitted
		if (typeof opt === 'number') scaleLayerOpacity(tl.layer, opt);
		yield tl;
	}
}

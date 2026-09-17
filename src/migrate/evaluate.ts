import {
	featureFilter,
	latest,
	normalizePropertyExpression,
	type Color as SpecColor,
	type StylePropertyExpression,
	type StylePropertySpecification,
} from '@maplibre/maplibre-gl-style-spec';
import type { SchemaName } from '../lib/index.js';
import type { StyleSpecification } from '../types/index.js';
import type { Probe, ProbeFeature, ProbeGeometry } from './probes.js';

/**
 * Reading a style without rendering it: which layer draws a probe's feature, and with which paint.
 *
 * Filters and property values are evaluated with the style spec's own expression engine against the
 * probe's synthetic feature, so a `match` on `class` or a zoom `interpolate` resolves exactly as MapLibre
 * would resolve it. What cannot be learned this way — collisions, the look of a sprite — is not read.
 */

/** Red, green, blue and alpha, each 0–1, not premultiplied. Alpha already includes the layer's opacity. */
export type RGBA = [number, number, number, number];

/** The colour roles a probe reading can carry. */
export type Channel = 'color' | 'outline' | 'casing' | 'text' | 'halo';

export type ProbeReading = {
	readonly probe: Probe;
	readonly zoom: number;
	/** The layers the reading came from, topmost first. */
	readonly layers: string[];
	readonly colors: Partial<Record<Channel, RGBA>>;
	/** Symbol probes: the text size in px. */
	readonly textSize?: number;
	/** Symbol probes: the font stack. */
	readonly textFont?: readonly string[];
	/** Symbol probes: the halo width in px — 0 when the label draws no halo, which is a choice of its
	 *  own and not the absence of one (the target haloes every label by default). */
	readonly textHaloWidth?: number;
	/** Symbol probes: the halo blur in px. Only read where a halo is actually drawn. */
	readonly textHaloBlur?: number;
	/** Symbol probes: the `text-field` layer and feature, for reading which name field it shows. */
	readonly label?: { layer: StyleLayer; feature: ProbeFeature };
	/** Fill probes: drawn as `fill-extrusion`. */
	readonly extruded?: boolean;
	/** Line probes: the line width in px. */
	readonly lineWidth?: number;
};

type StyleLayer = StyleSpecification['layers'][number];
type Layer = StyleLayer & {
	source?: string;
	'source-layer'?: string;
	filter?: unknown;
	paint?: Record<string, unknown>;
	layout?: Record<string, unknown>;
};

type EvalFeature = { type: 1 | 2 | 3; id: number; properties: Record<string, unknown> };

const GEOMETRY_TYPE: Record<ProbeGeometry, 1 | 2 | 3> = { Point: 1, LineString: 2, Polygon: 3 };
const DEFAULT_GEOMETRY: Record<Probe['kind'], ProbeGeometry> = {
	background: 'Polygon',
	fill: 'Polygon',
	line: 'LineString',
	symbol: 'Point',
};

// Parsed filters and property expressions, per layer object. A style is read once per probe and zoom,
// so without this every probe would re-parse every layer's expressions.
const filterCache = new WeakMap<object, ((zoom: number, feature: EvalFeature) => boolean) | null>();
const propertyCache = new WeakMap<object, Map<string, StylePropertyExpression | null>>();

function passesFilter(layer: Layer, zoom: number, feature: EvalFeature): boolean {
	let filter = filterCache.get(layer);
	if (filter === undefined) {
		try {
			const compiled = featureFilter(layer.filter as Parameters<typeof featureFilter>[0], 'filter');
			filter = (z, feat) => compiled.filter({ zoom: z }, feat);
		} catch {
			filter = null;
		}
		filterCache.set(layer, filter);
	}
	if (filter === null) return false;
	try {
		return filter(zoom, feature);
	} catch {
		return false;
	}
}

function propertyExpression(layer: Layer, group: 'paint' | 'layout', name: string): StylePropertyExpression | null {
	let byName = propertyCache.get(layer);
	if (!byName) propertyCache.set(layer, (byName = new Map()));
	const key = group + '/' + name;
	if (byName.has(key)) return byName.get(key)!;

	const value = layer[group]?.[name];
	const spec = (latest as unknown as Record<string, Record<string, StylePropertySpecification>>)[
		`${group}_${layer.type}`
	]?.[name];
	let expression: StylePropertyExpression | null = null;
	if (spec) {
		try {
			expression = normalizePropertyExpression(
				(value === undefined ? spec.default : value) as never,
				name,
				spec
			) as StylePropertyExpression;
		} catch {
			expression = null;
		}
	}
	byName.set(key, expression);
	return expression;
}

/** A paint or layout property of `layer`, evaluated for `feature` at `zoom`; its spec default when unset. */
export function evaluateProperty(
	layer: StyleLayer,
	group: 'paint' | 'layout',
	name: string,
	zoom: number,
	feature: EvalFeature
): unknown {
	const expression = propertyExpression(layer as Layer, group, name);
	if (!expression) return undefined;
	try {
		return expression.evaluate({ zoom }, feature as never);
	} catch {
		return undefined;
	}
}

function toRGBA(value: unknown, opacity: unknown): RGBA | undefined {
	if (!value || typeof value !== 'object' || !('rgb' in value)) return undefined;
	const [r, g, b, a] = (value as SpecColor).rgb;
	const factor = typeof opacity === 'number' ? opacity : 1;
	return [r, g, b, a * factor];
}

function isVisibleAtZoom(layer: Layer, zoom: number): boolean {
	if (layer.layout?.visibility === 'none') return false;
	if (layer.minzoom !== undefined && zoom < layer.minzoom) return false;
	if (layer.maxzoom !== undefined && zoom >= layer.maxzoom) return false;
	return true;
}

export function toEvalFeature(probe: Probe, feature: ProbeFeature): EvalFeature {
	const geometry = feature.geometry ?? DEFAULT_GEOMETRY[probe.kind];
	return { type: GEOMETRY_TYPE[geometry], id: 1, properties: { ...feature.props } };
}

/**
 * What `style` draws for `probe` at `zoom`, or `undefined` when it draws nothing.
 *
 * `schemas` maps a style's source ids to the schema of their tiles: a layer reads a probe only when its
 * source is one of them and the probe knows that schema's feature.
 */
export function readProbe(
	style: StyleSpecification,
	schemas: ReadonlyMap<string, SchemaName>,
	probe: Probe,
	zoom: number = probe.zoom
): ProbeReading | undefined {
	return quietly(() => read(style, schemas, probe, zoom));
}

/**
 * Runs `fn` with `console.warn` muted. The expression engine warns once per expression that fails at
 * runtime — a `get` of a field the synthetic feature lacks — and those warnings would be about the probe,
 * not about the style. Everything here is synchronous, so nothing else can log in between.
 */
function quietly<T>(fn: () => T): T {
	const warn = console.warn;
	console.warn = () => {};
	try {
		return fn();
	} finally {
		console.warn = warn;
	}
}

function read(
	style: StyleSpecification,
	schemas: ReadonlyMap<string, SchemaName>,
	probe: Probe,
	zoom: number
): ProbeReading | undefined {
	const layers = style.layers as Layer[];

	if (probe.kind === 'background') {
		const empty: EvalFeature = { type: 3, id: 1, properties: {} };
		for (let i = layers.length - 1; i >= 0; i--) {
			const layer = layers[i];
			if (layer.type !== 'background' || !isVisibleAtZoom(layer, zoom)) continue;
			const color = toRGBA(
				evaluateProperty(layer, 'paint', 'background-color', zoom, empty),
				evaluateProperty(layer, 'paint', 'background-opacity', zoom, empty)
			);
			if (color && color[3] > 0.01) return { probe, zoom, layers: [layer.id], colors: { color } };
		}
		return undefined;
	}

	// The matching layers, bottom to top, each with the feature it matched.
	const matches: { layer: Layer; feature: EvalFeature; source: ProbeFeature }[] = [];
	for (const layer of layers) {
		if (!isVisibleAtZoom(layer, zoom) || layer.source === undefined) continue;
		const schema = schemas.get(layer.source);
		for (const source of (schema && probe.features[schema]) || []) {
			if (layer['source-layer'] !== source.sourceLayer) continue;
			const feature = toEvalFeature(probe, source);
			if (!passesFilter(layer, zoom, feature)) continue;
			matches.push({ layer, feature, source });
			break;
		}
	}

	switch (probe.kind) {
		case 'fill':
			return readFill(probe, zoom, matches);
		case 'line':
			return readLine(probe, zoom, matches);
		case 'symbol':
			return readSymbol(probe, zoom, matches);
	}
}

type Match = { layer: Layer; feature: EvalFeature; source: ProbeFeature };

/**
 * A layer drawn with a `*-pattern` shows its sprite image, not its colour: it counts as drawing the
 * feature, but its colour is not read, and the colour comes from the topmost layer that shows one.
 */
type Drawn = { layer: Layer; feature: EvalFeature; color?: RGBA; width?: number };

function readFill(probe: Probe, zoom: number, matches: Match[]): ProbeReading | undefined {
	const drawn: Drawn[] = [];
	for (const { layer, feature } of matches) {
		const prefix = layer.type === 'fill' ? 'fill' : layer.type === 'fill-extrusion' ? 'fill-extrusion' : undefined;
		if (!prefix) continue;
		const opacity = evaluateProperty(layer, 'paint', `${prefix}-opacity`, zoom, feature);
		if (layer.paint?.[`${prefix}-pattern`] !== undefined) {
			if (typeof opacity !== 'number' || opacity > 0.01) drawn.push({ layer, feature });
			continue;
		}
		const color = toRGBA(evaluateProperty(layer, 'paint', `${prefix}-color`, zoom, feature), opacity);
		if (color && color[3] > 0.01) drawn.push({ layer, color, feature });
	}
	if (drawn.length === 0) return undefined;

	const colored = drawn.filter((d) => d.color);
	const top = colored.at(-1);
	if (!top) return { probe, zoom, layers: [drawn.at(-1)!.layer.id], colors: {} };

	const colors: ProbeReading['colors'] = { color: top.color };
	const below = colored.at(-2);
	if (below) {
		colors.outline = below.color;
	} else if (top.layer.type === 'fill' && top.layer.paint?.['fill-outline-color'] !== undefined) {
		const outline = toRGBA(
			evaluateProperty(top.layer, 'paint', 'fill-outline-color', zoom, top.feature),
			evaluateProperty(top.layer, 'paint', 'fill-opacity', zoom, top.feature)
		);
		if (outline) colors.outline = outline;
	}
	return {
		probe,
		zoom,
		layers: colored
			.slice(-2)
			.reverse()
			.map((d) => d.layer.id),
		colors,
		extruded: top.layer.type === 'fill-extrusion',
	};
}

function readLine(probe: Probe, zoom: number, matches: Match[]): ProbeReading | undefined {
	const drawn: Drawn[] = [];
	for (const { layer, feature } of matches) {
		if (layer.type !== 'line') continue;
		const width = evaluateProperty(layer, 'paint', 'line-width', zoom, feature);
		if (typeof width !== 'number' || width <= 0) continue;
		const opacity = evaluateProperty(layer, 'paint', 'line-opacity', zoom, feature);
		if (layer.paint?.['line-pattern'] !== undefined) {
			if (typeof opacity !== 'number' || opacity > 0.01) drawn.push({ layer, feature, width });
			continue;
		}
		const color = toRGBA(evaluateProperty(layer, 'paint', 'line-color', zoom, feature), opacity);
		if (color && color[3] > 0.01) drawn.push({ layer, feature, color, width });
	}
	if (drawn.length === 0) return undefined;

	const colored = drawn.filter((d) => d.color);
	const top = colored.at(-1);
	if (!top) return { probe, zoom, layers: [drawn.at(-1)!.layer.id], colors: {} };

	const colors: ProbeReading['colors'] = { color: top.color };
	const layerIds = [top.layer.id];
	// The casing is the topmost line drawn beneath the top one that is wider than it.
	const casing = colored
		.slice(0, -1)
		.filter((d) => d.width! > top.width!)
		.at(-1);
	if (casing) {
		colors.casing = casing.color;
		layerIds.push(casing.layer.id);
	}
	return { probe, zoom, layers: layerIds, colors, lineWidth: top.width };
}

function readSymbol(probe: Probe, zoom: number, matches: Match[]): ProbeReading | undefined {
	for (let i = matches.length - 1; i >= 0; i--) {
		const { layer, feature, source } = matches[i];
		if (layer.type !== 'symbol') continue;
		const text = labelText(layer, zoom, probe, source);
		const hasIcon = layer.layout?.['icon-image'] !== undefined;
		if (!text && !hasIcon) continue;

		const colors: ProbeReading['colors'] = {};
		let textSize: number | undefined;
		let textFont: readonly string[] | undefined;
		let textHaloWidth: number | undefined;
		let textHaloBlur: number | undefined;
		if (text) {
			const opacity = evaluateProperty(layer, 'paint', 'text-opacity', zoom, feature);
			if (typeof opacity === 'number' && opacity <= 0.01) continue;
			const color = toRGBA(evaluateProperty(layer, 'paint', 'text-color', zoom, feature), opacity);
			// a fully transparent colour says nothing about hue: no text colour, or no halo, was set
			if (color && color[3] > 0.01) colors.text = color;

			// A halo needs both a width and a colour to be visible, so the two are read together.
			// `propertyExpression` substitutes the spec default for an unset property — width 0, colour
			// transparent black — so a style that sets neither reads as a label with no halo, which is
			// what it looks like. That zero is recorded rather than dropped: the target draws a 2px halo
			// on every label, so "no halo" only survives the migration if it is stated.
			const haloWidth = evaluateProperty(layer, 'paint', 'text-halo-width', zoom, feature);
			const haloColor = toRGBA(evaluateProperty(layer, 'paint', 'text-halo-color', zoom, feature), opacity);
			const haloDrawn = typeof haloWidth === 'number' && haloWidth > 0 && !!haloColor && haloColor[3] > 0.01;
			if (haloDrawn) {
				colors.halo = haloColor;
				const blur = evaluateProperty(layer, 'paint', 'text-halo-blur', zoom, feature);
				if (typeof blur === 'number') textHaloBlur = blur;
			}
			textHaloWidth = haloDrawn ? (haloWidth as number) : 0;

			const size = evaluateProperty(layer, 'layout', 'text-size', zoom, feature);
			if (typeof size === 'number') textSize = size;
			const font = evaluateProperty(layer, 'layout', 'text-font', zoom, feature);
			if (Array.isArray(font)) textFont = font as string[];
		}
		return {
			probe,
			zoom,
			layers: [layer.id],
			colors,
			textSize,
			textFont,
			textHaloWidth,
			textHaloBlur,
			...(text && { label: { layer, feature: source } }),
		};
	}
	return undefined;
}

/** The marker every `name…` field reads as, so the text shows which field a label picked. */
export const NAME_MARKER = '‹';

/**
 * The text a symbol layer shows for a probe feature, with every `name…` field — `name`, `name_en`,
 * `name:de`, whatever the style asks for — reading as its own field name behind `NAME_MARKER`.
 * `without` hides fields, to see what a label falls back to.
 */
export function labelText(
	layer: StyleLayer,
	zoom: number,
	probe: Probe,
	source: ProbeFeature,
	without: ReadonlySet<string> = new Set()
): string {
	const base = toEvalFeature(probe, source);
	const isName = (key: string) => key.startsWith('name') && !without.has(key);
	const properties = new Proxy(base.properties, {
		get: (target, key) => (typeof key === 'string' && isName(key) ? NAME_MARKER + key : target[key as string]),
		has: (target, key) => (typeof key === 'string' && isName(key)) || key in target,
	});
	const feature = { ...base, properties };
	const value = quietly(() => evaluateProperty(layer, 'layout', 'text-field', zoom, feature));
	let text = value == null ? '' : String(value);
	// Legacy `{token}` strings are resolved by MapLibre at layout time, not by the expression.
	text = text.replace(/\{([^}]+)\}/g, (_, key: string) => {
		const resolved = properties[key];
		return resolved == null ? '' : String(resolved);
	});
	return text.trim();
}

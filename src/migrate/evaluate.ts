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

/**
 * The `LabelStyle` properties that carry over as they are read, named as the options name them.
 *
 * Every one is read through the spec's own default, so an unset property reads as what MapLibre would
 * draw rather than as "not stated" — which is the honest answer for a migration, and necessary for the
 * ones the target does not leave at the MapLibre default (it haloes most labels 2px and uppercases
 * country, state, hamlet and district names).
 *
 * `font` and `scale` are not here: they have derivations of their own, against the glyph server's font
 * list and against the target's own sizes.
 */
export type LabelStyleReading = {
	/** 0 where the label draws no halo — an unset width, or one painted in a transparent colour. */
	haloWidth: number;
	/** Only set where a halo is actually drawn; a blur with no halo behind it says nothing. */
	haloBlur?: number;
	maxWidth: number;
	lineHeight: number;
	letterSpacing: number;
	transform: string;
};

/** A colour a layer drew for a probe that the reading did not keep, and the layers that drew it. */
export type DiscardedColor = { color: RGBA; layers: string[] };

/** A feature the source schema tells apart, which the target draws through the same setting. */
export type CollapsedFeature = { feature: string; color: RGBA; layers: string[] };

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
	/** Symbol probes: the label style the layer draws with. */
	readonly labelStyle?: LabelStyleReading;
	/** Symbol probes: `symbol-spacing` in px, for line-placed labels only — MapLibre ignores it at a
	 *  point. `text.spacing` multiplies the target's own value, so this means something only next to the
	 *  same probe read off the target. */
	readonly symbolSpacing?: number;
	/** Symbol probes that draw an icon: `icon-size`. Only set where the layer has an `icon-image` — the
	 *  spec default of 1 says nothing about a layer that draws no icon at all. `icon.scale` multiplies
	 *  it, so like `symbolSpacing` it only means something against the same probe read off the target. */
	readonly iconSize?: number;
	/** Symbol probes that draw a point icon: the first side of `icon-padding`, in px. `icon.spacing`
	 *  adds to it rather than multiplying (see `PADDING_PER_SPACING`). */
	readonly iconPadding?: number;
	/** Symbol probes: the `text-field` layer and feature, for reading which name field it shows. */
	readonly label?: { layer: StyleLayer; feature: ProbeFeature };
	/** Fill probes: drawn as `fill-extrusion`. */
	readonly extruded?: boolean;
	/** Fill probes drawn as `fill-extrusion`: `fill-extrusion-opacity`. Held apart from the colour —
	 *  on the target this is `layers.buildings`, not part of the building colour. */
	readonly extrusionOpacity?: number;
	/** Line probes: the line width in px. */
	readonly lineWidth?: number;
	/**
	 * Per channel, the colours that other layers drew for this probe and that the reading passed over.
	 *
	 * The readers keep the topmost layer (and, for fills and lines, the one beneath it), because that is
	 * what the map shows. Everything below used to be forgotten, which made an OpenMapTiles style with a
	 * dozen POI layers in four colours indistinguishable from one with a single POI layer — the other
	 * eleven surfaced as `unread`, as if nothing had looked at them. Kept so the choice can be reported
	 * and offered back.
	 */
	readonly discarded?: Readonly<Partial<Record<Channel, DiscardedColor[]>>>;
	/**
	 * What the source drew for features it distinguishes and the target does not — see `Probe.variants`.
	 *
	 * Distinct from `discarded`, which is other layers drawing the *same* feature and losing on z-order.
	 * These are different features entirely: nothing overpaints anything, and they would each be drawn,
	 * in their own colours, on the source map. The target has one setting for all of them.
	 */
	readonly collapsed?: readonly CollapsedFeature[];
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

/**
 * The first side of an evaluated padding, in px.
 *
 * The expression engine resolves a `padding` property to a `Padding` instance — `{ values: [t, r, b, l] }`
 * — however the style spelled it, so neither a bare number nor a plain array comes back. Both are
 * accepted anyway, in case a style is read without going through the engine. One side is enough:
 * `padForSpacing` shifts all four by the same amount.
 */
function firstSide(value: unknown): number | undefined {
	if (typeof value === 'number') return value;
	if (Array.isArray(value)) return typeof value[0] === 'number' ? value[0] : undefined;
	if (value && typeof value === 'object' && 'values' in value) {
		const values = (value as { values: unknown }).values;
		if (Array.isArray(values) && typeof values[0] === 'number') return values[0];
	}
	return undefined;
}

/**
 * Group colours by the colour they are, dropping any that match `kept`.
 *
 * Grouped rather than listed flat because a consumer offering these back wants one swatch per colour
 * with the layers behind it, not one entry per layer. Compared on rounded components: two layers that
 * differ in the last bit of a channel are the same colour to anyone looking at the map.
 */
function groupDiscarded(drawn: readonly { layer: Layer; color?: RGBA }[], kept: RGBA | undefined): DiscardedColor[] {
	const key = (c: RGBA) => c.map((v) => Math.round(v * 255)).join(',');
	const keptKey = kept && key(kept);
	const groups = new Map<string, DiscardedColor>();
	for (const { layer, color } of drawn) {
		if (!color) continue;
		const id = key(color);
		if (id === keptKey) continue;
		const group = groups.get(id) ?? groups.set(id, { color, layers: [] }).get(id)!;
		group.layers.push(layer.id);
	}
	return [...groups.values()];
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

	/**
	 * The layers that draw one of `features`, bottom to top, each with the feature it matched.
	 *
	 * `features` are alternative spellings of one thing, so the first that a layer accepts wins and the
	 * rest are not tried — a layer is counted once however many ways it could have been selected.
	 */
	const matching = (features: readonly ProbeFeature[]): Match[] => {
		const matches: Match[] = [];
		for (const layer of layers) {
			if (!isVisibleAtZoom(layer, zoom) || layer.source === undefined) continue;
			if (!schemas.has(layer.source)) continue;
			for (const source of features) {
				if (layer['source-layer'] !== source.sourceLayer) continue;
				const feature = toEvalFeature(probe, source);
				if (!passesFilter(layer, zoom, feature)) continue;
				matches.push({ layer, feature, source });
				break;
			}
		}
		return matches;
	};

	const schemasUsed = new Set([...schemas.values()]);
	const featuresFor = (per: Readonly<Partial<Record<SchemaName, readonly ProbeFeature[]>>> | undefined) =>
		[...schemasUsed].flatMap((schema) => [...(per?.[schema] ?? [])]);

	const reading = byKind(probe, zoom, matching(featuresFor(probe.features)));
	if (!reading) return undefined;

	// Each variant read on its own and compared: these are things the source tells apart and the target
	// does not, so they are never in the same `matches` and can never overpaint one another.
	const variants = featuresFor(probe.variants);
	const collapsed: CollapsedFeature[] = [];
	if (variants.length > 0) {
		const name = namer([...featuresFor(probe.features), ...variants]);
		for (const variant of variants) {
			const other = byKind(probe, zoom, matching([variant]));
			const color = other && (other.colors.text ?? other.colors.color);
			if (!color || color[3] <= 0.01) continue;
			collapsed.push({ feature: name(variant), color, layers: other.layers });
		}
	}
	return collapsed.length > 0 ? { ...reading, collapsed } : reading;
}

/**
 * Names features by what tells them apart, and nothing else.
 *
 * Every probe feature carries the props real tiles put on everything of a source-layer — a POI's
 * `rank` and `level` — which say nothing about which variant this is. So the naming is relative to the
 * group: only keys whose value is not the same across all of them are worth printing, leaving
 * `class=shop subclass=supermarket` rather than that plus two constants.
 */
function namer(group: readonly ProbeFeature[]): (feature: ProbeFeature) => string {
	const varies = new Set<string>();
	for (const key of new Set(group.flatMap((feature) => Object.keys(feature.props)))) {
		if (new Set(group.map((feature) => JSON.stringify(feature.props[key]))).size > 1) varies.add(key);
	}
	return (feature) =>
		[...varies]
			.filter((key) => feature.props[key] !== undefined)
			.map((key) => `${key}=${String(feature.props[key])}`)
			.join(' ') || feature.sourceLayer;
}

function byKind(probe: Probe, zoom: number, matches: Match[]): ProbeReading | undefined {
	switch (probe.kind) {
		case 'fill':
			return readFill(probe, zoom, matches);
		case 'line':
			return readLine(probe, zoom, matches);
		case 'symbol':
			return readSymbol(probe, zoom, matches);
		case 'background':
			return undefined;
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
	let extrusionOpacity: number | undefined;
	for (const { layer, feature } of matches) {
		const prefix = layer.type === 'fill' ? 'fill' : layer.type === 'fill-extrusion' ? 'fill-extrusion' : undefined;
		if (!prefix) continue;
		const opacity = evaluateProperty(layer, 'paint', `${prefix}-opacity`, zoom, feature);

		// An extrusion's opacity is an option of its own on the target — `layers.buildings` — so it is
		// kept apart from the colour rather than folded into its alpha like a flat fill's. The colour
		// model is calibrated against the target's *flat* default, so an extrusion opacity folded in had
		// nowhere to land but the building colour, which the rebuilt style then multiplied by the layer
		// opacity a second time: the target's own extruded style came back at 0.49 instead of 0.7.
		const extruded = layer.type === 'fill-extrusion';
		const invisible = typeof opacity === 'number' && opacity <= 0.01;
		if (extruded && typeof opacity === 'number') extrusionOpacity = opacity;

		if (layer.paint?.[`${prefix}-pattern`] !== undefined) {
			if (!invisible) drawn.push({ layer, feature });
			continue;
		}
		const color = toRGBA(evaluateProperty(layer, 'paint', `${prefix}-color`, zoom, feature), extruded ? 1 : opacity);
		if (color && color[3] > 0.01 && !invisible) drawn.push({ layer, color, feature });
	}
	if (drawn.length === 0) return undefined;

	const colored = drawn.filter((d) => d.color);
	const top = colored.at(-1);
	if (!top) return { probe, zoom, layers: [drawn.at(-1)!.layer.id], colors: {} };

	const colors: ProbeReading['colors'] = { color: top.color };
	const passedOver = groupDiscarded(colored.slice(0, -2), top.color);
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
		extrusionOpacity,
		...(passedOver.length > 0 && { discarded: { color: passedOver } }),
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
	const passedOver = groupDiscarded(
		colored.filter((d) => d !== top && d !== casing),
		top.color
	);
	return {
		probe,
		zoom,
		layers: layerIds,
		colors,
		lineWidth: top.width,
		...(passedOver.length > 0 && { discarded: { color: passedOver } }),
	};
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
		let labelStyle: LabelStyleReading | undefined;
		let symbolSpacing: number | undefined;
		let iconSize: number | undefined;
		let iconPadding: number | undefined;
		if (hasIcon) {
			const size = evaluateProperty(layer, 'layout', 'icon-size', zoom, feature);
			if (typeof size === 'number') iconSize = size;
			// `icon-padding` is the point-placement exclusion; along a line MapLibre uses `symbol-spacing`
			// instead. The spec default is a one-sided `[2]`, and `padForSpacing` shifts every side by the
			// same amount, so the first side is enough to recover what was added.
			const placement = evaluateProperty(layer, 'layout', 'symbol-placement', zoom, feature);
			if (placement !== 'line' && placement !== 'line-center') {
				iconPadding = firstSide(evaluateProperty(layer, 'layout', 'icon-padding', zoom, feature));
			}
		}
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
			let haloBlur: number | undefined;
			if (haloDrawn) {
				colors.halo = haloColor;
				const blur = evaluateProperty(layer, 'paint', 'text-halo-blur', zoom, feature);
				if (typeof blur === 'number') haloBlur = blur;
			}

			const num = (name: string, fallback: number): number => {
				const value = evaluateProperty(layer, 'layout', name, zoom, feature);
				return typeof value === 'number' ? value : fallback;
			};
			const transform = evaluateProperty(layer, 'layout', 'text-transform', zoom, feature);
			labelStyle = {
				haloWidth: haloDrawn ? (haloWidth as number) : 0,
				...(haloBlur !== undefined && { haloBlur }),
				maxWidth: num('text-max-width', 10),
				lineHeight: num('text-line-height', 1.2),
				letterSpacing: num('text-letter-spacing', 0),
				transform: typeof transform === 'string' ? transform : 'none',
			};

			// Only where the label follows a line: MapLibre ignores `symbol-spacing` at a point, so
			// reading it there would compare a number nothing draws with.
			const placement = evaluateProperty(layer, 'layout', 'symbol-placement', zoom, feature);
			if (placement === 'line' || placement === 'line-center') {
				const spacing = evaluateProperty(layer, 'layout', 'symbol-spacing', zoom, feature);
				if (typeof spacing === 'number' && spacing > 0) symbolSpacing = spacing;
			}

			const size = evaluateProperty(layer, 'layout', 'text-size', zoom, feature);
			if (typeof size === 'number') textSize = size;
			const font = evaluateProperty(layer, 'layout', 'text-font', zoom, feature);
			if (Array.isArray(font)) textFont = font as string[];
		}
		// What the layers below would have drawn. The loop above stops at the first that draws anything,
		// which is what the map shows; these are the ones an OpenMapTiles style stacks underneath, and
		// without them a dozen POI layers in four colours read as a single uncontested colour.
		const passedOver = groupDiscarded(
			// `labelText` takes the `ProbeFeature` and builds its own eval feature from `.props`;
			// `evaluateProperty` takes the already-built `EvalFeature`. A `Match` carries both, and this
			// passed the latter to the former behind an `as never`: `toEvalFeature` then spread a `props`
			// that does not exist on an `EvalFeature`, so every below-layer label was evaluated against an
			// empty property bag. A `text-field` of `['get', 'amenity']` came back empty, the layer looked
			// like it drew nothing, and its colour was dropped from `discarded` — which is what feeds the
			// `color.conflict` diagnostic, so the alternative colour was never offered back.
			matches.slice(0, i).map(({ layer: below, feature: belowFeature, source: belowSource }) => ({
				layer: below,
				color:
					below.type === 'symbol' && labelText(below, zoom, probe, belowSource)
						? toRGBA(
								evaluateProperty(below, 'paint', 'text-color', zoom, belowFeature),
								evaluateProperty(below, 'paint', 'text-opacity', zoom, belowFeature)
							)
						: undefined,
			})),
			colors.text
		).filter((group) => group.color[3] > 0.01);

		return {
			probe,
			zoom,
			layers: [layer.id],
			colors,
			textSize,
			textFont,
			labelStyle,
			symbolSpacing,
			iconSize,
			iconPadding,
			...(text && { label: { layer, feature: source } }),
			...(passedOver.length > 0 && { discarded: { text: passedOver } }),
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

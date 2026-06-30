import { featureFilter, normalizePropertyExpression, latest } from '@maplibre/maplibre-gl-style-spec';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { Rep, Geom } from './types.js';

// Evaluate a style for a single feature representation at a given zoom, returning the
// ordered list of layers that would paint it, each with its fully-resolved visual props.
//
// Uses the style-spec's own `featureFilter` (for filter matching) and
// `normalizePropertyExpression` (which uniformly handles constants, legacy `{base,stops}`
// functions AND modern `interpolate` expressions) — so OMT and our generated style are
// evaluated by exactly the same engine MapLibre uses.

const GEOM_NUM: Record<Geom, number> = { Point: 1, LineString: 2, Polygon: 3 };

export interface Draw {
	id: string;
	type: string;
	props: Record<string, unknown>;
}

// The comparable visual properties we resolve per layer type. Anything else is ignored.
const KEYS: Record<string, string[]> = {
	fill: ['fill-color', 'fill-opacity', 'fill-outline-color', 'fill-pattern', 'fill-antialias', 'fill-translate'],
	line: [
		'line-color',
		'line-width',
		'line-opacity',
		'line-dasharray',
		'line-pattern',
		'line-cap',
		'line-join',
		'line-blur',
		'line-gap-width',
	],
	symbol: [
		'text-color',
		'text-halo-color',
		'text-halo-width',
		'text-halo-blur',
		'text-opacity',
		'icon-color',
		'icon-opacity',
		'text-size',
		'text-font',
		'text-transform',
		'icon-image',
		'icon-size',
		'symbol-placement',
		'text-field',
	],
};

// Keys we keep as the raw style value (resolving them needs image/glyph context we don't have);
// for comparison we only care about their presence / identity, not a rendered value.
const RAW_KEYS = new Set(['icon-image', 'text-field', 'fill-pattern', 'line-pattern']);

const SPEC = latest as unknown as Record<string, Record<string, unknown>>;

interface EvalFeature {
	type: number;
	properties: Record<string, unknown>;
	id: number;
}

function resolve(layerType: string, key: string, value: unknown, zoom: number, feature: EvalFeature): unknown {
	for (const parent of ['paint', 'layout']) {
		const spec = SPEC[`${parent}_${layerType}`]?.[key];
		if (!spec) continue;
		try {
			return normalizePropertyExpression(
				value as Parameters<typeof normalizePropertyExpression>[0],
				spec as Parameters<typeof normalizePropertyExpression>[1]
			).evaluate({ zoom } as never, feature as never);
		} catch {
			return value;
		}
	}
	return value;
}

/** Convert a resolved style-spec Color (premultiplied r/g/b) to its true sRGB `rgba()` string. */
export function colorToString(v: unknown): string | undefined {
	if (v && typeof v === 'object' && 'toString' in v) {
		const s = (v as { toString(): string }).toString();
		if (/^rgba?\(/.test(s)) return s;
	}
	if (typeof v === 'string') return v;
	return undefined;
}

const GEOM_NAME: Record<number, string> = { 1: 'Point', 2: 'LineString', 3: 'Polygon' };

// Minimal interpreter for OMT-style legacy filters. The current style-spec `featureFilter`
// rejects legacy filters that mix `$type`/`has` with other clauses, so we evaluate those
// ourselves. The OMT styles use only this fixed operator set.
function evalLegacy(f: unknown, feature: EvalFeature): boolean {
	if (!Array.isArray(f)) return true;
	const [op, ...args] = f as [string, ...unknown[]];
	const get = (k: unknown): unknown =>
		k === '$type' ? GEOM_NAME[feature.type] : k === '$id' ? feature.id : feature.properties[k as string];
	switch (op) {
		case 'all':
			return args.every((a) => evalLegacy(a, feature));
		case 'any':
			return args.some((a) => evalLegacy(a, feature));
		case 'none':
			return !args.some((a) => evalLegacy(a, feature));
		case '==':
			return get(args[0]) === args[1];
		case '!=':
			return get(args[0]) !== args[1];
		case '>':
			return (get(args[0]) as number) > (args[1] as number);
		case '>=':
			return (get(args[0]) as number) >= (args[1] as number);
		case '<':
			return (get(args[0]) as number) < (args[1] as number);
		case '<=':
			return (get(args[0]) as number) <= (args[1] as number);
		case 'in':
			return args.slice(1).some((v) => v === get(args[0]));
		case '!in':
			return !args.slice(1).some((v) => v === get(args[0]));
		case 'has':
			return get(args[0]) != null;
		case '!has':
			return get(args[0]) == null;
		default:
			return true;
	}
}

// Expression filters (our generated style) go through the real engine; legacy filters that
// the engine rejects fall back to the interpreter above.
function matchFilter(filter: unknown, zoom: number, feature: EvalFeature): boolean {
	try {
		const ff = featureFilter(filter as Parameters<typeof featureFilter>[0]);
		return ff.filter({ zoom } as never, feature as never, null as never);
	} catch {
		return evalLegacy(filter, feature);
	}
}

/** Indices into `style.layers` of every (non-background) layer that paints `rep` at `zoom`.
 *  Draw order is the array order, so the largest index is the topmost layer covering the feature. */
export function matchingLayerIndices(style: StyleSpecification, rep: Rep, zoom: number): number[] {
	const feature: EvalFeature = { type: GEOM_NUM[rep.geom], properties: rep.properties ?? {}, id: 1 };
	const out: number[] = [];
	style.layers.forEach((layer, i) => {
		if (layer.type === 'background') return;
		const lr = layer as unknown as Record<string, unknown>;
		if (lr['source-layer'] !== rep.sourceLayer) return;
		const minz = (lr.minzoom as number) ?? 0;
		const maxz = (lr.maxzoom as number) ?? 24;
		if (zoom < minz || zoom >= maxz) return;
		if (lr.filter && !matchFilter(lr.filter, zoom, feature)) return;
		out.push(i);
	});
	return out;
}

export function evaluateStyle(style: StyleSpecification, rep: Rep, zoom: number): Draw[] {
	const feature: EvalFeature = { type: GEOM_NUM[rep.geom], properties: rep.properties ?? {}, id: 1 };
	const draws: Draw[] = [];

	for (const layer of style.layers) {
		if (layer.type === 'background') continue;
		const lr = layer as unknown as Record<string, unknown>;
		if (lr['source-layer'] !== rep.sourceLayer) continue;

		const minz = (lr.minzoom as number) ?? 0;
		const maxz = (lr.maxzoom as number) ?? 24;
		if (zoom < minz || zoom >= maxz) continue;

		if (lr.filter) {
			if (!matchFilter(lr.filter, zoom, feature)) continue;
		}

		const raw = { ...((lr.paint as object) ?? {}), ...((lr.layout as object) ?? {}) } as Record<string, unknown>;
		const props: Record<string, unknown> = {};
		for (const key of KEYS[layer.type] ?? []) {
			if (!(key in raw)) continue;
			if (RAW_KEYS.has(key)) {
				props[key] = raw[key];
				continue;
			}
			let val = resolve(layer.type, key, raw[key], zoom, feature);
			if (key.endsWith('-color')) val = colorToString(val) ?? val;
			props[key] = val;
		}
		draws.push({ id: layer.id, type: layer.type, props });
	}

	return draws;
}

/** Resolved background color of a style at a zoom (the baseline fills are composited over). */
export function backgroundColor(style: StyleSpecification, zoom: number): string {
	const bg = style.layers.find((l) => l.type === 'background');
	const v = bg ? ((bg as Record<string, unknown>).paint as Record<string, unknown>)?.['background-color'] : undefined;
	const c = resolve('background', 'background-color', v ?? '#ffffff', zoom, { type: 3, properties: {}, id: 1 });
	return colorToString(c) ?? 'rgba(255,255,255,1)';
}

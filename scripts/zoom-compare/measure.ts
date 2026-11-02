import type { StyleSpecification } from '../../src/types/index.js';

/**
 * Style variants and static checks for `compare.ts`. Pure: styles in, styles or lists out.
 */

type Layer = StyleSpecification['layers'][number];
type Readable = {
	id: string;
	type: string;
	minzoom?: number;
	maxzoom?: number;
	paint?: Record<string, unknown>;
	layout?: Record<string, unknown>;
};

/** `style` without its symbol layers, so that labels and icons, and their placement, are out of the picture. */
export function withoutSymbols(style: StyleSpecification): StyleSpecification {
	return { ...style, layers: style.layers.filter((layer) => layer.type !== 'symbol') };
}

/**
 * `style` with every vector source ending at `zoom − 1`, so that MapLibre overzooms the same tiles on both
 * sides of the boundary at `zoom` and the tile data cannot change across it. A layer whose data only starts
 * at `zoom` has none in those tiles, and draws nothing on either side.
 */
export function withSameTiles(style: StyleSpecification, zoom: number): StyleSpecification {
	const sources = Object.fromEntries(
		Object.entries(style.sources).map(([id, source]) => {
			if (source.type !== 'vector') return [id, source];
			return [id, { ...source, maxzoom: Math.min(source.maxzoom ?? Infinity, zoom - 1) }];
		})
	);
	return { ...style, sources };
}

/**
 * `style` without the layers drawn with a dash or a pattern. MapLibre redraws those at each integer zoom, and
 * crossfades them over time while a user zooms, which a frame on either side of a boundary doesn't show.
 */
export function withoutPatterns(style: StyleSpecification): StyleSpecification {
	const layers = style.layers.filter((layer) => {
		const paint = (layer as unknown as Readable).paint ?? {};
		return !paint['line-dasharray'] && !paint['line-pattern'] && !paint['fill-pattern'];
	});
	return { ...style, layers };
}

/** `style` with only its background and the fills `features.landcover` adds. */
export function landcoverAlone(style: StyleSpecification): StyleSpecification {
	const layers = style.layers.filter((layer) => layer.type === 'background' || layer.id.startsWith('landcover-'));
	return { ...style, layers };
}

/** `style` with only its background and one layer, in its own colours. */
export function isolateLayer(style: StyleSpecification, id: string): StyleSpecification {
	return { ...style, layers: style.layers.filter((layer) => layer.type === 'background' || layer.id === id) };
}

/**
 * The paint and layout properties that make a layer of a type fade away towards 0. Not `line-width`: a line draws
 * nothing at exactly 0, but at nearly full strength at any width above it, so it pops in all the same.
 */
const VANISHING: Record<string, readonly string[]> = {
	fill: ['fill-opacity'],
	line: ['line-opacity'],
	symbol: ['text-opacity', 'icon-opacity', 'text-size', 'icon-size'],
	'fill-extrusion': ['fill-extrusion-opacity', 'fill-extrusion-height'],
	circle: ['circle-opacity', 'circle-radius'],
};

/** The `[zoom, value]` stops of a top-level zoom ramp, or `undefined` for anything else. */
function zoomStops(value: unknown): [number, unknown][] | undefined {
	if (!Array.isArray(value) || typeof value[0] !== 'string' || !value[0].startsWith('interpolate')) return undefined;
	if (JSON.stringify(value[2]) !== '["zoom"]') return undefined;
	const stops: [number, unknown][] = [];
	for (let i = 3; i + 1 < value.length; i += 2) stops.push([value[i] as number, value[i + 1]]);
	return stops;
}

function ramps(layer: Readable): [number, unknown][][] {
	return (VANISHING[layer.type] ?? [])
		.map((prop) => zoomStops(layer.paint?.[prop] ?? layer.layout?.[prop]))
		.filter((stops) => stops !== undefined);
}

/** A zoom bound of a layer where it is still visible: it appears, or disappears, all at once. */
export type HardBound = { id: string; type: string; bound: 'minzoom' | 'maxzoom'; zoom: number };

/**
 * The bounds no ramp leads to. At a `minzoom`, a ramp from 0 has to start there or later: starting earlier,
 * it is past 0 by the time the layer appears. At a `maxzoom`, a ramp to 0 has to end there or earlier.
 */
export function hardBounds(style: StyleSpecification): HardBound[] {
	return (style.layers as Layer[] as unknown as Readable[]).flatMap((layer) => {
		const found: HardBound[] = [];
		const { id, type, minzoom, maxzoom } = layer;
		if (minzoom !== undefined && minzoom > 0) {
			const eased = ramps(layer).some(([first]) => first[1] === 0 && first[0] >= minzoom);
			if (!eased) found.push({ id, type, bound: 'minzoom', zoom: minzoom });
		}
		if (maxzoom !== undefined) {
			const eased = ramps(layer).some((stops) => {
				const last = stops[stops.length - 1];
				return last[1] === 0 && last[0] <= maxzoom;
			});
			if (!eased) found.push({ id, type, bound: 'maxzoom', zoom: maxzoom });
		}
		return found;
	});
}

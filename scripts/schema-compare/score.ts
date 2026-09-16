import { colorOptionsKeys, type ResolvedColors } from '../../src/options/';
import { evaluateProperty } from '../../src/migrate/evaluate.js';
import { toLab } from '../../src/migrate/math.js';
import type { StyleSpecification } from '../../src/types/index.js';

/**
 * Scoring two renders of the same view.
 *
 * A plain pixel diff is useless here: the three tilesets simplify geometry differently, so every edge
 * moves by a pixel or two and the diff lights up along every road even when the mapping is perfect.
 * Two measures that see past that:
 *
 *  - `diff` — the share of pixels that still differ after both images are blurred, so a line that
 *    moved by a pixel no longer counts and a road that is missing still does.
 *  - `classShares` — with a *sentinel palette*, where every colour key is a distinct saturated colour,
 *    each pixel is attributed to the layers that paint that colour. Comparing how much of the picture
 *    each class covers ("rock: 12 % in Shortbread, 0 % in OpenMapTiles") ignores geometry entirely and
 *    names the layer group that is wrong, rather than just saying the pictures differ.
 */

/** Pixels whose colour differs by more than this ΔE after blurring count as different. */
export const DIFF_THRESHOLD = 10;

/** Box blur of an RGBA buffer, per channel, separable, clamping at the edges. Returns RGB floats. */
export function blur(pixels: Uint8Array, width: number, height: number, radius: number): Float32Array {
	const channels = 3;
	const tmp = new Float32Array(width * height * channels);
	const out = new Float32Array(width * height * channels);
	const size = radius * 2 + 1;
	for (let y = 0; y < height; y++) {
		for (let c = 0; c < channels; c++) {
			let sum = 0;
			for (let k = -radius; k <= radius; k++) sum += pixels[(y * width + clampIndex(k, width)) * 4 + c];
			for (let x = 0; x < width; x++) {
				tmp[(y * width + x) * channels + c] = sum / size;
				sum += pixels[(y * width + clampIndex(x + radius + 1, width)) * 4 + c];
				sum -= pixels[(y * width + clampIndex(x - radius, width)) * 4 + c];
			}
		}
	}
	for (let x = 0; x < width; x++) {
		for (let c = 0; c < channels; c++) {
			let sum = 0;
			for (let k = -radius; k <= radius; k++) sum += tmp[(clampIndex(k, height) * width + x) * channels + c];
			for (let y = 0; y < height; y++) {
				out[(y * width + x) * channels + c] = sum / size;
				sum += tmp[(clampIndex(y + radius + 1, height) * width + x) * channels + c];
				sum -= tmp[(clampIndex(y - radius, height) * width + x) * channels + c];
			}
		}
	}
	return out;
}

const clampIndex = (i: number, n: number) => (i < 0 ? 0 : i >= n ? n - 1 : i);

export type Diff = {
	/** Share of pixels that differ, 0–1. */
	share: number;
	/** Per pixel, whether it differs — for the heatmap. */
	mask: Uint8Array;
};

/** The pixels of two same-sized renders that differ visibly once small shifts are blurred away. */
export function diff(a: Uint8Array, b: Uint8Array, width: number, height: number, radius = 2): Diff {
	const ba = blur(a, width, height, radius);
	const bb = blur(b, width, height, radius);
	const mask = new Uint8Array(width * height);
	let count = 0;
	for (let i = 0; i < width * height; i++) {
		const la = toLab([ba[i * 3] / 255, ba[i * 3 + 1] / 255, ba[i * 3 + 2] / 255, 1]);
		const lb = toLab([bb[i * 3] / 255, bb[i * 3 + 1] / 255, bb[i * 3 + 2] / 255, 1]);
		if (Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]) > DIFF_THRESHOLD) {
			mask[i] = 1;
			count++;
		}
	}
	return { share: count / (width * height), mask };
}

/** A heatmap: `base` faded to grey, with the differing pixels in red. Raw RGBA. */
export function heatmap(base: Uint8Array, mask: Uint8Array): Uint8Array {
	const out = new Uint8Array(base.length);
	for (let i = 0; i < mask.length; i++) {
		const grey = 0.3 * base[i * 4] + 0.59 * base[i * 4 + 1] + 0.11 * base[i * 4 + 2];
		const faded = 160 + grey * 0.35;
		out[i * 4] = mask[i] ? 230 : faded;
		out[i * 4 + 1] = mask[i] ? 30 : faded;
		out[i * 4 + 2] = mask[i] ? 30 : faded;
		out[i * 4 + 3] = 255;
	}
	return out;
}

// ── sentinel palette ───────────────────────────────────────────────────────────

/**
 * A palette in which every key is its own opaque colour, as far from every other as possible: picked
 * greedily from a 6×6×6 RGB grid, each next colour the one furthest (in ΔE) from all picked so far.
 * Deterministic, so a class keeps its colour from run to run.
 */
export function sentinelPalette(): ResolvedColors {
	const steps = [0, 51, 102, 153, 204, 255];
	const candidates = steps.flatMap((r) => steps.flatMap((g) => steps.map((b) => [r, g, b])));
	const lab = candidates.map(([r, g, b]) => toLab([r / 255, g / 255, b / 255, 1]));
	const distance = (i: number, j: number) =>
		Math.hypot(lab[i][0] - lab[j][0], lab[i][1] - lab[j][1], lab[i][2] - lab[j][2]);

	const picked: number[] = [candidates.findIndex(([r, g, b]) => r === 255 && g === 0 && b === 0)];
	const nearest = candidates.map((_, i) => distance(i, picked[0]));
	while (picked.length < colorOptionsKeys.length) {
		let best = 0;
		for (let i = 1; i < candidates.length; i++) if (nearest[i] > nearest[best]) best = i;
		picked.push(best);
		for (let i = 0; i < candidates.length; i++) nearest[i] = Math.min(nearest[i], distance(i, best));
	}
	const hex = (rgb: number[]) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
	return Object.fromEntries(colorOptionsKeys.map((key, i) => [key, hex(candidates[picked[i]])])) as ResolvedColors;
}

/** A colour the style paints opaquely at a zoom, and what paints it. */
export type ColorClass = { rgb: [number, number, number]; name: string };

const PAINT_COLOR: Record<string, [string, string]> = {
	background: ['background-color', 'background-opacity'],
	fill: ['fill-color', 'fill-opacity'],
	line: ['line-color', 'line-opacity'],
	'fill-extrusion': ['fill-extrusion-color', 'fill-extrusion-opacity'],
};

/**
 * The opaque colours `style` paints at `zoom`, each named after the layer groups whose layers paint it.
 *
 * Translucent paint is left out: blended with whatever is beneath, it matches no colour in the table
 * and its pixels are counted as unclassified. `groupOf` maps a layer id to its group; layers of the
 * three builders share ids, so one map serves every schema.
 */
export function colorClasses(
	style: StyleSpecification,
	zoom: number,
	groupOf: (layerId: string) => string | undefined
): ColorClass[] {
	const byColor = new Map<string, { rgb: [number, number, number]; groups: Set<string> }>();
	const feature = { type: 3 as const, id: 1, properties: {} };
	for (const layer of style.layers) {
		const properties = PAINT_COLOR[layer.type];
		if (!properties || layer.layout?.visibility === 'none') continue;
		if (layer.minzoom !== undefined && zoom < layer.minzoom) continue;
		if (layer.maxzoom !== undefined && zoom >= layer.maxzoom) continue;
		const color = evaluateProperty(layer, 'paint', properties[0], zoom, feature) as
			{ rgb: [number, number, number, number] } | undefined;
		const opacity = evaluateProperty(layer, 'paint', properties[1], zoom, feature);
		if (!color?.rgb) continue;
		const [r, g, b, a] = color.rgb;
		if (a * (typeof opacity === 'number' ? opacity : 1) < 0.95) continue;
		const rgb: [number, number, number] = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
		const key = rgb.join(',');
		const entry = byColor.get(key) ?? byColor.set(key, { rgb, groups: new Set() }).get(key)!;
		entry.groups.add(groupOf(layer.id) ?? (layer.type === 'background' ? 'background' : layer.id));
	}
	return [...byColor.values()].map(({ rgb, groups }) => ({ rgb, name: [...groups].sort().join(' + ') }));
}

/** A pixel further than this (0–255 RGB distance) from every class is an edge or a blend: unclassified. */
export const CLASS_TOLERANCE = 12;

/**
 * Share of the picture each class covers, 0–1, by nearest colour. Classes are merged by name, and the
 * pixels that match none are reported as `unclassified`.
 */
export function classShares(pixels: Uint8Array, classes: readonly ColorClass[]): Record<string, number> {
	const counts = new Map<string, number>();
	const memo = new Map<number, string>();
	const total = pixels.length / 4;
	const limit = CLASS_TOLERANCE ** 2;
	for (let i = 0; i < total; i++) {
		const r = pixels[i * 4];
		const g = pixels[i * 4 + 1];
		const b = pixels[i * 4 + 2];
		const packed = (r << 16) | (g << 8) | b;
		let name = memo.get(packed);
		if (name === undefined) {
			let best = limit;
			name = 'unclassified';
			for (const cls of classes) {
				const d = (cls.rgb[0] - r) ** 2 + (cls.rgb[1] - g) ** 2 + (cls.rgb[2] - b) ** 2;
				if (d <= best) [best, name] = [d, cls.name];
			}
			memo.set(packed, name);
		}
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	return Object.fromEntries([...counts].map(([name, count]) => [name, count / total]));
}

/** Classes whose share differs between two renders by at least `min`, largest difference first. */
export function shareDifferences(
	a: Record<string, number>,
	b: Record<string, number>,
	min = 0.01
): { name: string; a: number; b: number; delta: number }[] {
	const names = new Set([...Object.keys(a), ...Object.keys(b)]);
	return [...names]
		.map((name) => ({ name, a: a[name] ?? 0, b: b[name] ?? 0, delta: Math.abs((a[name] ?? 0) - (b[name] ?? 0)) }))
		.filter((d) => d.delta >= min && d.name !== 'unclassified')
		.sort((x, y) => y.delta - x.delta);
}

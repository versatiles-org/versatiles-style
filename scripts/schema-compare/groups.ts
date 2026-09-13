import type { LayerGroupOptions } from '../../src/options/index.js';
import type { LayerGroupMap } from '../../src/shortbread/layer-groups-map.js';

/**
 * Isolating one layer group at a time, for `--by-group`.
 *
 * The colour classes say *that* a class covers less in one schema; drawing each group alone and
 * comparing where it draws says *where*, and catches the case colours cannot: two groups painted in the
 * same colour. It costs one render per group, schema and view, so it is for diagnosing views that the
 * regular run flagged, not for every run.
 */

/** Every leaf group path of a layer group tree, e.g. `roads.streets.residential`. `icons` is an alias. */
export function leafGroups(tree: LayerGroupMap, path: string[] = []): string[] {
	return Object.entries(tree).flatMap(([key, child]) => {
		if (path.length === 0 && key === 'icons') return [];
		return Array.isArray(child) ? [[...path, key].join('.')] : leafGroups(child, [...path, key]);
	});
}

/** `layers` options that show only the group at `path`: every other branch on the way is hidden. */
export function isolateGroup(tree: LayerGroupMap, path: string): LayerGroupOptions {
	const build = (node: LayerGroupMap, parts: string[]): Record<string, unknown> => {
		const out: Record<string, unknown> = {};
		for (const [key, child] of Object.entries(node)) {
			if (key === 'icons' && node === tree) continue;
			if (key !== parts[0]) out[key] = false;
			else out[key] = parts.length === 1 || Array.isArray(child) ? true : build(child, parts.slice(1));
		}
		return out;
	};
	return build(tree, path.split('.')) as LayerGroupOptions;
}

/** Per pixel, whether `pixels` differs from `empty` — what the isolated group drew. */
export function coverage(pixels: Uint8Array, empty: Uint8Array, tolerance = 8): Uint8Array {
	const mask = new Uint8Array(pixels.length / 4);
	for (let i = 0; i < mask.length; i++) {
		const o = i * 4;
		mask[i] =
			Math.abs(pixels[o] - empty[o]) > tolerance ||
			Math.abs(pixels[o + 1] - empty[o + 1]) > tolerance ||
			Math.abs(pixels[o + 2] - empty[o + 2]) > tolerance
				? 1
				: 0;
	}
	return mask;
}

export type Overlap = {
	/** Share of the picture each side covers, 0–1. */
	a: number;
	b: number;
	/** Intersection over union, 0–1; 1 when neither draws anything. */
	iou: number;
};

export function overlap(a: Uint8Array, b: Uint8Array): Overlap {
	let countA = 0;
	let countB = 0;
	let both = 0;
	for (let i = 0; i < a.length; i++) {
		countA += a[i];
		countB += b[i];
		both += a[i] & b[i];
	}
	const union = countA + countB - both;
	return { a: countA / a.length, b: countB / b.length, iou: union === 0 ? 1 : both / union };
}

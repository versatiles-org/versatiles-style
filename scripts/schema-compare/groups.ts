import type { LayerGroupOptions } from '../../src/options/';
import type { LayerGroupMap } from '../../src/shortbread/layer-groups-map.js';
import { SCHEMAS, pairId, type PairId, type Schema } from './baseline.js';

/**
 * Isolating one layer group at a time, for `--by-group`.
 *
 * The colour classes say *that* a class covers less in one schema; drawing each group alone and
 * comparing where it draws says *where*, and catches the case colours cannot: two groups painted in the
 * same colour. It costs one render per group, schema and view, so it is for diagnosing views that the
 * regular run flagged, not for every run. Every group that differs gets an overlay picture in the report.
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

// ── what differs, and the picture of it ─────────────────────────────────────────

/** A group counts as differing when two schemas overlap less than this… */
export const DIFFERING_IOU = 0.9;
/** …and it covers at least this share of the picture in some schema. */
export const DIFFERING_AREA = 0.005;

type PairOverlaps = Partial<Record<PairId, Overlap>>;

/** The group's area per schema, 0–1. */
export function groupArea(pairs: PairOverlaps): Record<Schema, number> | undefined {
	const sbOmt = pairs['shortbread~omt'];
	const sbPm = pairs['shortbread~protomaps'];
	if (!sbOmt || !sbPm) return undefined;
	return { shortbread: sbOmt.a, omt: sbOmt.b, protomaps: sbPm.b };
}

/** The lowest overlap of the three pairs. */
export const worstIou = (pairs: PairOverlaps) => Math.min(1, ...Object.values(pairs).map((o) => o!.iou));

/** The groups of a view that differ between schemas, worst overlap first. */
export function differingGroups(groups: Record<string, PairOverlaps> | undefined): string[] {
	return Object.entries(groups ?? {})
		.filter(([, pairs]) => {
			const area = groupArea(pairs);
			return (
				area !== undefined && worstIou(pairs) < DIFFERING_IOU && Math.max(...Object.values(area)) >= DIFFERING_AREA
			);
		})
		.sort(([, a], [, b]) => worstIou(a) - worstIou(b))
		.map(([group]) => group);
}

/** The schema that overlaps least with the other two: the one an overlay is drawn from. */
export function oddOneOut(pairs: PairOverlaps): Schema {
	const iou = (a: Schema, b: Schema) => pairs[pairId([a, b])]?.iou ?? pairs[pairId([b, a])]?.iou ?? 1;
	let odd: Schema = SCHEMAS[0];
	let lowest = Infinity;
	for (const schema of SCHEMAS) {
		const others = SCHEMAS.filter((s) => s !== schema);
		const mean = (iou(schema, others[0]) + iou(schema, others[1])) / 2;
		if (mean < lowest) [lowest, odd] = [mean, schema];
	}
	return odd;
}

/** Overlay colours, fixed in the image. */
export const OVERLAY_COLORS = {
	/** Drawn by all three schemas. */
	shared: [63, 75, 70],
	/** Drawn by the other two, missing in the odd one. */
	missing: [35, 88, 216],
	/** Drawn only by the odd one. */
	only: [224, 98, 31],
	/** Drawn by just one of the other two. */
	partial: [167, 176, 171],
} as const satisfies Record<string, readonly [number, number, number]>;

/**
 * One layer group drawn alone in all three schemas, as a single RGBA picture seen from `odd`: each
 * covered pixel coloured by who draws it (see `OVERLAY_COLORS`), every other pixel a faded grey of
 * `base`, so the picture keeps its bearings.
 */
export function overlayPixels(masks: Readonly<Record<Schema, Uint8Array>>, odd: Schema, base: Uint8Array): Uint8Array {
	const [a, b] = SCHEMAS.filter((s) => s !== odd).map((s) => masks[s]);
	const self = masks[odd];
	const out = new Uint8Array(self.length * 4);
	for (let i = 0; i < self.length; i++) {
		const o = i * 4;
		let rgb: readonly number[];
		if (self[i] && a[i] && b[i]) rgb = OVERLAY_COLORS.shared;
		else if (!self[i] && a[i] && b[i]) rgb = OVERLAY_COLORS.missing;
		else if (self[i] && !a[i] && !b[i]) rgb = OVERLAY_COLORS.only;
		else if (self[i] || a[i] || b[i]) rgb = OVERLAY_COLORS.partial;
		else {
			const grey = 0.3 * base[o] + 0.59 * base[o + 1] + 0.11 * base[o + 2];
			const shade = Math.round(250 - (255 - grey) * 0.3);
			rgb = [shade - 2, shade, shade - 2];
		}
		out[o] = rgb[0];
		out[o + 1] = rgb[1];
		out[o + 2] = rgb[2];
		out[o + 3] = 255;
	}
	return out;
}

import type { StyleSpecification } from '../../src/types/index.js';

/**
 * Measurements on rendered frames, for `compare.ts`. Pure: pixels in, numbers out.
 *
 * The overlap measurements read *isolated* renders — the layers in question alone, recoloured white
 * over black — where a pixel's brightness is exactly how much of the line covers it: one pass at
 * opacity `a` gives `255·a`, two overlapping passes give `255·(1 − (1 − a)²)`, and so on. That is what
 * makes "brighter than one pass" a count of overlap rather than of colour.
 */

/** `style` with only the line layers `ids` kept, drawn white over a black background. */
export function isolate(style: StyleSpecification, ids: readonly string[]): StyleSpecification {
	const layers = style.layers
		.filter((layer) => layer.type === 'line' && ids.includes(layer.id))
		.map((layer) => ({
			...layer,
			paint: { ...(layer as { paint?: Record<string, unknown> }).paint, 'line-color': '#ffffff' },
		}));
	return {
		...style,
		layers: [
			{ id: 'background', type: 'background', paint: { 'background-color': '#000000' } },
			...layers,
		] as StyleSpecification['layers'],
	};
}

/** Sum of the red channel: in an isolated render, the total amount of line drawn. */
export function brightness(pixels: Uint8Array): number {
	let sum = 0;
	for (let i = 0; i < pixels.length; i += 4) sum += pixels[i];
	return sum;
}

/** A pixel counts as covered above this value, which keeps antialiasing fringes out of the count. */
export const COVERED = 4;
/** Slack on the single-pass ceiling, for rounding in the blend. */
export const SLACK = 3;

export type Overlap = {
	/** Covered pixels. */
	covered: number;
	/** Covered pixels brighter than `ceiling` + {@link SLACK}: drawn more than once. */
	over: number;
	/** The brightest pixel. */
	max: number;
};

/**
 * Overlap in an isolated render: how many covered pixels are brighter than `ceiling`, the brightest a
 * pixel gets from one pass. (`compare.ts` takes it from the same view composited with
 * `line-layer-opacity`, which cannot exceed one pass.)
 */
export function overlap(pixels: Uint8Array, ceiling: number): Overlap {
	let covered = 0;
	let over = 0;
	let max = 0;
	for (let i = 0; i < pixels.length; i += 4) {
		const value = pixels[i];
		if (value <= COVERED) continue;
		covered++;
		if (value > max) max = value;
		if (value > ceiling + SLACK) over++;
	}
	return { covered, over, max };
}

/** The brightest red value in a frame. */
export function maxValue(pixels: Uint8Array): number {
	let max = 0;
	for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > max) max = pixels[i];
	return max;
}

/** A pixel counts as changed when a channel moves by more than this. */
export const CHANGED = 8;

export type Diff = {
	/** Share of pixels changed by more than {@link CHANGED} in any channel. */
	share: number;
	/** Largest channel difference. */
	max: number;
	/** RGBA heatmap: changed pixels magenta, the rest a faded copy of `a`. */
	heat: Uint8Array;
};

export function diff(a: Uint8Array, b: Uint8Array): Diff {
	if (a.length !== b.length) throw new Error(`diff: ${a.length} bytes against ${b.length}`);
	const heat = new Uint8Array(a.length);
	let changed = 0;
	let max = 0;
	for (let i = 0; i < a.length; i += 4) {
		const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
		if (d > max) max = d;
		if (d > CHANGED) {
			changed++;
			heat.set([255, 0, 255, 255], i);
		} else {
			const grey = Math.round((a[i] + a[i + 1] + a[i + 2]) / 9 + 170);
			heat.set([grey, grey, grey, 255], i);
		}
	}
	return { share: changed / (a.length / 4), max, heat };
}

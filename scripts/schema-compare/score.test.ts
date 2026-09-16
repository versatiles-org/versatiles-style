import { describe, expect, it } from 'vitest';
import { osm } from '../../src/api/osm.js';
import { colorOptionsKeys } from '../../src/options/';
import { colorDistance } from '../../src/migrate/math.js';
import { parseRGBA } from '../../src/migrate/calibrate.js';
import {
	blur,
	classShares,
	colorClasses,
	diff,
	heatmap,
	sentinelPalette,
	shareDifferences,
	type ColorClass,
} from './score.js';

/** A width × height RGBA image filled with one colour, with an optional rectangle in another. */
function image(
	width: number,
	height: number,
	fill: number[],
	rect?: { x: number; y: number; w: number; h: number; color: number[] }
): Uint8Array {
	const pixels = new Uint8Array(width * height * 4);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const inside = rect && x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
			pixels.set([...(inside ? rect.color : fill), 255], (y * width + x) * 4);
		}
	}
	return pixels;
}

describe('blur', () => {
	it('keeps a flat image flat and spreads an edge', () => {
		const flat = blur(image(8, 8, [100, 150, 200]), 8, 8, 2);
		expect([...flat.slice(0, 3)]).toEqual([100, 150, 200]);

		const half = blur(image(8, 1, [0, 0, 0], { x: 4, y: 0, w: 4, h: 1, color: [250, 250, 250] }), 8, 1, 1);
		expect(half[3 * 3]).toBeCloseTo(250 / 3, 3); // x=3 sees one bright neighbour of three
		expect(half[0]).toBe(0);
	});
});

describe('diff', () => {
	it('ignores a one-pixel shift of a thin line but not a missing block', () => {
		const W = 40;
		const line = (x: number) => image(W, W, [240, 240, 240], { x, y: 0, w: 1, h: W, color: [200, 200, 200] });
		expect(diff(line(20), line(21), W, W).share).toBe(0);

		const block = image(W, W, [240, 240, 240], { x: 10, y: 10, w: 20, h: 20, color: [30, 90, 200] });
		const result = diff(block, image(W, W, [240, 240, 240]), W, W);
		expect(result.share).toBeGreaterThan(0.15);
		expect(result.mask[20 * W + 20]).toBe(1);
		expect(result.mask[0]).toBe(0);
	});

	it('draws a heatmap with differing pixels in red', () => {
		const out = heatmap(image(2, 1, [0, 0, 0]), new Uint8Array([1, 0]));
		expect([...out.slice(0, 4)]).toEqual([230, 30, 30, 255]);
		expect(out[4]).toBe(out[5]);
	});
});

describe('sentinel palette', () => {
	it('gives every key an opaque colour clearly apart from every other', () => {
		const palette = sentinelPalette();
		const colors = colorOptionsKeys.map((key) => parseRGBA(palette[key]));
		expect(colors.every((c) => c[3] === 1)).toBe(true);
		let closest = Infinity;
		for (let i = 0; i < colors.length; i++)
			for (let j = i + 1; j < colors.length; j++) closest = Math.min(closest, colorDistance(colors[i], colors[j]));
		expect(closest).toBeGreaterThan(15);
	});
});

describe('classes', () => {
	it('names the opaque colours a style paints after the groups that paint them', () => {
		const style = osm({ colors: sentinelPalette() });
		const groups = (id: string) => (id.startsWith('water') ? 'water' : undefined);
		const classes = colorClasses(style, 14, groups);
		const water = classes.find((c) => c.name.includes('water'));
		expect(water).toBeDefined();
		expect(classes.some((c) => c.name.includes('background'))).toBe(true);
	});

	it('shares pixels by nearest colour, leaving blends unclassified', () => {
		const classes: ColorClass[] = [
			{ rgb: [255, 0, 0], name: 'red' },
			{ rgb: [0, 0, 255], name: 'blue' },
		];
		const pixels = image(10, 10, [250, 5, 5], { x: 0, y: 0, w: 5, h: 10, color: [128, 0, 128] });
		expect(classShares(pixels, classes)).toEqual({ unclassified: 0.5, red: 0.5 });
	});

	it('lists the classes whose shares differ, largest first', () => {
		expect(shareDifferences({ rock: 0.12, forest: 0.3, unclassified: 0.2 }, { rock: 0, forest: 0.29 })).toEqual([
			{ name: 'rock', a: 0.12, b: 0, delta: 0.12 },
			{ name: 'forest', a: 0.3, b: 0.29, delta: expect.closeTo(0.01, 5) },
		]);
	});
});

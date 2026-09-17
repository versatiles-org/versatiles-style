import { describe, expect, it } from 'vitest';
import { osm } from '../../src/api/index.js';
import { getLayerGroupMap } from '../../src/shortbread/index.js';
import {
	OVERLAY_COLORS,
	coverage,
	differingGroups,
	groupArea,
	isolateGroup,
	leafGroups,
	oddOneOut,
	overlap,
	overlayPixels,
	worstIou,
} from './groups.js';

describe('leafGroups and isolateGroup', () => {
	const tree = getLayerGroupMap();

	it('lists leaf paths without the icons alias', () => {
		const leaves = leafGroups(tree);
		expect(leaves).toContain('roads.streets.residential');
		expect(leaves).toContain('buildings');
		expect(leaves.some((l) => l.startsWith('icons'))).toBe(false);
	});

	it('shows only the isolated group', () => {
		const layers = isolateGroup(tree, 'roads.streets.residential');
		expect(layers).toMatchObject({
			buildings: false,
			water: false,
			roads: { motorways: false, streets: { residential: true, service: false } },
		});

		const ids = osm({ layers }).layers.map((l) => l.id);
		expect(ids).toContain('street-minor');
		expect(ids).not.toContain('street-motorway');
		expect(ids).not.toContain('building');
	});
});

describe('coverage and overlap', () => {
	const px = (...values: number[][]) => new Uint8Array(values.flatMap((v) => [...v, 255]));

	it('marks the pixels that differ from the empty render', () => {
		const empty = px([240, 240, 240], [240, 240, 240], [240, 240, 240]);
		expect([...coverage(px([240, 240, 245], [100, 100, 100], [240, 240, 240]), empty)]).toEqual([0, 1, 0]);
	});

	it('computes intersection over union', () => {
		expect(overlap(new Uint8Array([1, 1, 0, 0]), new Uint8Array([1, 0, 1, 0]))).toEqual({ a: 0.5, b: 0.5, iou: 1 / 3 });
		expect(overlap(new Uint8Array([0, 0]), new Uint8Array([0, 0])).iou).toBe(1);
	});
});

describe('differing groups and overlays', () => {
	const pairs = (sbOmt: number, sbPm: number, omtPm: number, area = 0.1) => ({
		'shortbread~omt': { a: area, b: area, iou: sbOmt },
		'shortbread~protomaps': { a: area, b: area / 2, iou: sbPm },
		'omt~protomaps': { a: area, b: area / 2, iou: omtPm },
	});

	it('lists groups with poor overlap and visible area, worst first', () => {
		const groups = {
			good: pairs(0.95, 0.95, 0.95),
			bad: pairs(0.9, 0.2, 0.25),
			worse: pairs(0.1, 0.9, 0.1),
			invisible: pairs(0, 0, 0, 0.001),
		};
		expect(differingGroups(groups)).toEqual(['worse', 'bad']);
		expect(differingGroups(undefined)).toEqual([]);
		expect(groupArea(groups.bad)).toEqual({ shortbread: 0.1, omt: 0.1, protomaps: 0.05 });
		expect(worstIou(groups.bad)).toBe(0.2);
	});

	it('picks the schema that overlaps least with the other two', () => {
		expect(oddOneOut(pairs(0.9, 0.2, 0.25))).toBe('protomaps');
		expect(oddOneOut(pairs(0.1, 0.1, 0.9))).toBe('shortbread');
		expect(oddOneOut(pairs(0.1, 0.9, 0.1))).toBe('omt');
	});

	it('colours an overlay by who draws each pixel, fading the rest', () => {
		const masks = {
			shortbread: new Uint8Array([1, 0, 1, 0, 0]),
			omt: new Uint8Array([1, 1, 0, 1, 0]),
			protomaps: new Uint8Array([1, 1, 0, 0, 0]),
		};
		const out = overlayPixels(masks, 'shortbread', new Uint8Array(20).fill(255));
		const pixel = (i: number) => [...out.slice(i * 4, i * 4 + 3)];
		expect(pixel(0)).toEqual([...OVERLAY_COLORS.shared]);
		expect(pixel(1)).toEqual([...OVERLAY_COLORS.missing]);
		expect(pixel(2)).toEqual([...OVERLAY_COLORS.only]);
		expect(pixel(3)).toEqual([...OVERLAY_COLORS.partial]);
		expect(pixel(4)).toEqual([248, 250, 248]);
	});
});

import { describe, expect, it } from 'vitest';
import { osm } from '../../src/api/osm.js';
import { getLayerGroupMap } from '../../src/shortbread/layer-groups-map.js';
import { coverage, isolateGroup, leafGroups, overlap } from './groups.js';

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

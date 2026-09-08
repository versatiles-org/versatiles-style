import { describe, expect, it } from 'vitest';
import { getLayerGroupMap, type LayerGroupMap } from './layer-groups-map.js';
import { osm } from '../api/osm.js';

const ids = (node: LayerGroupMap | string[] | undefined): string[] =>
	Array.isArray(node) ? node : Object.values(node ?? {}).flatMap(ids);

describe('layerGroups', () => {
	it('is exposed as osm.layerGroups and memoized', () => {
		expect(osm.layerGroups).toBe(getLayerGroupMap());
	});

	it('covers every documented LayerGroupOptions key', () => {
		expect(Object.keys(getLayerGroupMap()).sort()).toEqual(
			[
				'airport',
				'boundaries',
				'buildings',
				'icons',
				'labels',
				'land',
				'markings',
				'pois',
				'roads',
				'sites',
				'transit',
				'water',
			].sort()
		);
	});

	it('nests sub-groups and lists layer IDs at the leaves', () => {
		const map = getLayerGroupMap();
		expect((map.land as LayerGroupMap).glacier).toEqual(['land-glacier']);
		expect(Object.keys((map.roads as LayerGroupMap).streets as LayerGroupMap).sort()).toEqual([
			'bus',
			'pedestrian',
			'residential',
			'service',
			'track',
		]);
	});

	it('unions both building modes, which are mutually exclusive per build', () => {
		// `flat` emits footprints, `extruded` replaces them with building-3d; the group controls all.
		expect(getLayerGroupMap().buildings).toEqual(expect.arrayContaining(['building', 'building-3d']));
	});

	it('lists `icons` as the union of the groups it aliases', () => {
		const map = getLayerGroupMap();
		const expected = [
			...(map.pois as string[]),
			...(map.markings as string[]),
			...((map.transit as LayerGroupMap).stops as string[]),
		];
		expect(map.icons).toEqual(expected);
	});

	it('every listed ID actually appears in a generated style', () => {
		const present = new Set(osm({ features: { buildings: 'extruded' } }).layers.map((l) => l.id));
		const flat = new Set(osm().layers.map((l) => l.id));
		for (const id of ids(getLayerGroupMap())) {
			expect(present.has(id) || flat.has(id), `${id} is listed but never generated`).toBe(true);
		}
	});

	it('hiding a group removes exactly the layers it lists', () => {
		const before = new Set(osm().layers.map((l) => l.id));
		const after = new Set(osm({ layers: { pois: false } }).layers.map((l) => l.id));
		const removed = [...before].filter((id) => !after.has(id));
		expect(removed.sort()).toEqual([...(getLayerGroupMap().pois as string[])].sort());
	});
});

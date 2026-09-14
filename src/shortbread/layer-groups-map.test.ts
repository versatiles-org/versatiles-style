import { describe, expect, it } from 'vitest';
import { getLayerGroupMap, getOverlayLayerGroupMap, type LayerGroupMap } from './layer-groups-map.js';
import { osm } from '../api/osm.js';
import { satellite } from '../api/satellite.js';

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

	it('files every label layer under its topic', () => {
		const labels = getLayerGroupMap().labels as LayerGroupMap;
		const sorted = (node: LayerGroupMap | string[]): unknown =>
			Array.isArray(node)
				? [...node].sort()
				: Object.fromEntries(Object.entries(node).map(([key, child]) => [key, sorted(child)]));
		expect(sorted(labels)).toStrictEqual({
			addresses: ['label-address-housenumber'],
			boundaries: {
				countries: ['label-boundary-country-large', 'label-boundary-country-medium', 'label-boundary-country-small'],
				states: ['label-boundary-state'],
			},
			places: {
				cities: ['label-place-capital', 'label-place-city', 'label-place-statecapital', 'label-place-town'],
				villages: ['label-place-hamlet', 'label-place-village'],
				districts: ['label-place-neighbourhood', 'label-place-quarter', 'label-place-suburb'],
			},
			streets: {
				names: [
					'label-street-livingstreet',
					'label-street-pedestrian',
					'label-street-pedestrian-zone',
					'label-street-primary',
					'label-street-residential',
					'label-street-secondary',
					'label-street-tertiary',
					'label-street-track',
					'label-street-trunk',
					'label-street-unclassified',
				],
				refs: ['label-motorway-shield'],
				exits: ['label-motorway-exit'],
			},
			water: {
				lakes: [
					'label-water-area-large',
					'label-water-area-major',
					'label-water-area-medium',
					'label-water-area-small',
				],
				rivers: ['label-water-river', 'label-water-stream'],
			},
		});
	});

	describe('satellite.layerGroups', () => {
		const overlay = getOverlayLayerGroupMap();
		const paths = (node: LayerGroupMap, prefix = ''): string[] =>
			Object.entries(node).flatMap(([key, child]) =>
				Array.isArray(child) ? [`${prefix}${key}`] : paths(child, `${prefix}${key}.`)
			);

		it('is exposed as satellite.layerGroups and memoized', () => {
			expect(satellite.layerGroups).toBe(overlay);
		});

		it("is osm's map without the groups the overlay drops", () => {
			const dropped = paths(getLayerGroupMap()).filter((path) => !paths(overlay).includes(path));
			expect(
				dropped.every((path) => /^(land|water)\.|^(sites|airport|buildings)$/.test(path)),
				dropped.join()
			).toBe(true);
			expect(Object.keys(overlay)).not.toContain('land');
			expect(Object.keys(overlay)).not.toContain('buildings');
		});

		it('lists no tunnels and no empty group', () => {
			for (const path of paths(overlay)) {
				const listed = path.split('.').reduce<LayerGroupMap | string[]>((n, k) => (n as LayerGroupMap)[k], overlay);
				expect(listed.length, path).toBeGreaterThan(0);
			}
			expect(ids(overlay).filter((id) => id.startsWith('tunnel-'))).toEqual([]);
			expect(ids(getLayerGroupMap()).some((id) => id.startsWith('tunnel-'))).toBe(true);
		});

		it('lists exactly the grouped layers a satellite style draws', () => {
			const drawn = new Set(satellite().layers.map((l) => l.id));
			const osmGrouped = new Set(ids(getLayerGroupMap()));
			const expected = [...drawn].filter((id) => osmGrouped.has(id));
			expect([...new Set(ids(overlay))].sort()).toEqual(expected.sort());
		});
	});

	it('hiding a label leaf removes exactly the layers it lists', () => {
		const labels = getLayerGroupMap().labels as LayerGroupMap;
		const before = new Set(osm().layers.map((l) => l.id));
		for (const [group, node] of Object.entries(labels)) {
			const leaves = Array.isArray(node) ? { [group]: node } : (node as Record<string, string[]>);
			for (const [leaf, listed] of Object.entries(leaves)) {
				const option = Array.isArray(node) ? { [group]: false } : { [group]: { [leaf]: false } };
				const after = new Set(osm({ layers: { labels: option } }).layers.map((l) => l.id));
				const removed = [...before].filter((id) => !after.has(id));
				expect(removed.sort(), `labels.${group}.${leaf}`).toEqual([...listed].sort());
			}
		}
	});
});

import { describe, expect, it } from 'vitest';
import { getShortbreadLayers } from './layers.js';
import { layerGroups, SLOT_IDS } from './groups.js';

describe('layerGroups', () => {
	// Build the full set of real layer IDs once for cross-checks.
	const realLayerIds = new Set(getShortbreadLayers({ language: 'local' }).map((l) => l.id));

	function collectLeafIds(node: unknown): string[] {
		if (Array.isArray(node)) return node as string[];
		if (typeof node === 'object' && node !== null) return Object.values(node).flatMap(collectLeafIds);
		return [];
	}

	it('every group ID should exist in the generated layer list', () => {
		// icons is a convenience alias; its entries already appear in pois/stops/markings.
		const { icons: _, ...coreGroups } = layerGroups;
		const allGroupIds = collectLeafIds(coreGroups);

		const missing = allGroupIds.filter((id) => !realLayerIds.has(id));
		expect(missing).toEqual([]);
	});

	it('icons should be the union of pois, transit.stops, and markings', () => {
		const expected = new Set([...layerGroups.pois, ...layerGroups.transit.stops, ...layerGroups.markings]);
		const actual = new Set(layerGroups.icons);
		expect(actual).toEqual(expected);
	});

	it('SLOT_IDS should reference valid slot layer IDs', () => {
		for (const id of Object.values(SLOT_IDS)) {
			expect(realLayerIds.has(id)).toBe(true);
		}
	});

	it('no group should contain duplicate IDs (excluding icons alias)', () => {
		const { icons: _, ...coreGroups } = layerGroups;
		const allGroupIds = collectLeafIds(coreGroups);
		expect(allGroupIds.length).toBe(new Set(allGroupIds).size);
	});

	it('land sub-groups should cover expected layer IDs', () => {
		expect(layerGroups.land.forest).toContain('land-forest');
		expect(layerGroups.land.glacier).toContain('land-glacier');
		expect(layerGroups.land.urban).toContain('land-residential');
		expect(layerGroups.land.urban).toContain('land-commercial');
	});

	it('water sub-groups should cover expected layer IDs', () => {
		expect(layerGroups.water.ocean).toContain('water-ocean');
		expect(layerGroups.water.rivers).toContain('water-river');
		expect(layerGroups.water.lakes).toContain('water-area');
		expect(layerGroups.water.piers).toContain('water-pier');
	});

	it('roads.motorways should include tunnel and bridge variants', () => {
		const ids = layerGroups.roads.motorways;
		expect(ids).toContain('street-motorway');
		expect(ids).toContain('tunnel-street-motorway');
		expect(ids).toContain('bridge-street-motorway');
		expect(ids).toContain('street-motorway:outline');
		expect(ids).toContain('bridge-street-motorway:bridge');
		expect(ids).toContain('street-motorway-link');
	});

	it('roads.streets.pedestrian should include zone fill layers', () => {
		const ids = layerGroups.roads.streets.pedestrian;
		expect(ids).toContain('street-pedestrian-zone');
		expect(ids).toContain('tunnel-street-pedestrian-zone');
		expect(ids).toContain('bridge-street-pedestrian-zone');
		expect(ids).toContain('street-pedestrian');
	});

	it('transit.rail should include service variants for main rail types', () => {
		const ids = layerGroups.transit.rail;
		expect(ids).toContain('transport-rail');
		expect(ids).toContain('transport-rail-service');
		expect(ids).toContain('transport-subway');
		expect(ids).toContain('transport-subway-service');
		expect(ids).toContain('tunnel-transport-rail');
	});

	it('transit.rail should include funicular/monorail without service variants', () => {
		const ids = layerGroups.transit.rail;
		expect(ids).toContain('transport-funicular');
		expect(ids).toContain('transport-monorail');
		expect(ids).not.toContain('transport-funicular-service');
		expect(ids).not.toContain('transport-monorail-service');
	});

	it('transit.aerialways should include cablecar and gondola', () => {
		expect(layerGroups.transit.aerialways).toContain('aerialway-cablecar');
		expect(layerGroups.transit.aerialways).toContain('aerialway-gondola');
		expect(layerGroups.transit.aerialways).toContain('aerialway-cablecar:outline');
	});
});

import { beforeAll, describe, expect, it } from 'vitest';
import { osm } from '../api/osm.js';
import { layerGroups, SLOT_IDS } from './groups.js';

// Typed view of the (runtime-derived) registry for convenient assertions.
type Groups = {
	land: Record<string, string[]>;
	water: Record<string, string[]>;
	roads: { motorways: string[]; highways: string[]; streets: Record<string, string[]>; paths: string[] };
	transit: { rail: string[]; aerialways: string[]; ferries: string[]; stops: string[] };
	buildings: string[];
	sites: string[];
	airport: string[];
	pois: string[];
	boundaries: Record<string, string[]>;
	markings: string[];
	labels: Record<string, string[]>;
	icons: string[];
};
const G = layerGroups as unknown as Groups;

describe('layerGroups', () => {
	// Build the full set of real layer IDs once for cross-checks.
	let realLayerIds: Set<string>;
	beforeAll(async () => {
		realLayerIds = new Set((await osm({ text: { language: 'local' } })).layers.map((l) => l.id));
	});

	function collectLeafIds(node: unknown): string[] {
		if (Array.isArray(node)) return node as string[];
		if (typeof node === 'object' && node !== null) return Object.values(node).flatMap(collectLeafIds);
		return [];
	}

	it('every group ID should exist in the generated layer list', () => {
		const { icons: _icons, ...coreGroups } = layerGroups;
		const missing = collectLeafIds(coreGroups).filter((id) => !realLayerIds.has(id));
		expect(missing).toEqual([]);
	});

	it('icons should be the union of pois, transit.stops, and markings', () => {
		const expected = new Set([...G.pois, ...G.transit.stops, ...G.markings]);
		expect(new Set(G.icons)).toEqual(expected);
	});

	it('SLOT_IDS should reference valid slot layer IDs', () => {
		for (const id of Object.values(SLOT_IDS)) {
			expect(realLayerIds.has(id)).toBe(true);
		}
	});

	it('no group should contain duplicate IDs (excluding icons alias)', () => {
		const { icons: _icons, ...coreGroups } = layerGroups;
		const allGroupIds = collectLeafIds(coreGroups);
		expect(allGroupIds.length).toBe(new Set(allGroupIds).size);
	});

	it('land sub-groups should cover expected layer IDs', () => {
		expect(G.land.forest).toContain('land-forest');
		expect(G.land.glacier).toContain('land-glacier');
		expect(G.land.urban).toContain('land-residential');
		expect(G.land.urban).toContain('land-commercial');
	});

	it('water sub-groups should cover expected layer IDs', () => {
		expect(G.water.ocean).toContain('water-ocean');
		expect(G.water.rivers).toContain('water-river');
		expect(G.water.lakes).toContain('water-area');
		expect(G.water.piers).toContain('water-pier');
	});

	it('roads.motorways should include tunnel and bridge variants', () => {
		const ids = G.roads.motorways;
		expect(ids).toContain('street-motorway');
		expect(ids).toContain('tunnel-street-motorway');
		expect(ids).toContain('bridge-street-motorway');
		expect(ids).toContain('street-motorway:outline');
		expect(ids).toContain('bridge-street-motorway:bridge');
		expect(ids).toContain('street-motorway-link');
	});

	it('roads.streets.pedestrian should include zone fill layers', () => {
		const ids = G.roads.streets.pedestrian;
		expect(ids).toContain('street-pedestrian-zone');
		expect(ids).toContain('tunnel-street-pedestrian-zone');
		expect(ids).toContain('bridge-street-pedestrian-zone');
		expect(ids).toContain('street-pedestrian');
	});

	it('transit.rail should include service variants for main rail types', () => {
		const ids = G.transit.rail;
		expect(ids).toContain('transport-rail');
		expect(ids).toContain('transport-rail-service');
		expect(ids).toContain('transport-subway');
		expect(ids).toContain('transport-subway-service');
		expect(ids).toContain('tunnel-transport-rail');
	});

	it('transit.rail should include funicular/monorail without service variants', () => {
		const ids = G.transit.rail;
		expect(ids).toContain('transport-funicular');
		expect(ids).toContain('transport-monorail');
		expect(ids).not.toContain('transport-funicular-service');
		expect(ids).not.toContain('transport-monorail-service');
	});

	it('transit.aerialways should include cablecar and gondola', () => {
		expect(G.transit.aerialways).toContain('aerialway-cablecar');
		expect(G.transit.aerialways).toContain('aerialway-gondola');
		expect(G.transit.aerialways).toContain('aerialway-cablecar:outline');
	});
});

import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import type { ColorSet } from '../context.js';
import type { Color } from '../../color/index.js';
import * as b from '../build.js';

// Landcover band: the bottom-most fills — ocean, glacier and all `land` polygons.
// Render order is bottom→top exactly as the tiles stack: ocean, glacier, then land kinds.
// (`water-ocean` sits below the land fills, so it lives here rather than in the water module.)

type LandDef = {
	id: string;
	kinds: string[];
	color: (c: ColorSet) => Color;
	opacity?: Record<number, number>;
	group: string;
};

const LAND: LandDef[] = [
	{
		id: 'commercial',
		kinds: ['commercial', 'retail'],
		color: (c) => c.areaCommercial,
		opacity: { 10: 0, 11: 1 },
		group: 'land.urban',
	},
	{
		id: 'industrial',
		kinds: ['industrial', 'quarry', 'railway'],
		color: (c) => c.areaIndustrial,
		opacity: { 10: 0, 11: 1 },
		group: 'land.urban',
	},
	{
		id: 'residential',
		kinds: ['garages', 'residential'],
		color: (c) => c.areaResidential,
		opacity: { 10: 0, 11: 1 },
		group: 'land.urban',
	},
	{
		id: 'agriculture',
		kinds: [
			'brownfield',
			'farmland',
			'farmyard',
			'greenfield',
			'greenhouse_horticulture',
			'orchard',
			'plant_nursery',
			'vineyard',
		],
		color: (c) => c.natureAgriculture,
		opacity: { 10: 0, 11: 1 },
		group: 'land.agriculture',
	},
	{ id: 'waste', kinds: ['landfill'], color: (c) => c.areaWaste, opacity: { 10: 0, 11: 1 }, group: 'land.urban' },
	{
		id: 'park',
		kinds: ['park', 'village_green', 'recreation_ground'],
		color: (c) => c.naturePark,
		opacity: { 11: 0, 12: 1 },
		group: 'land.urban',
	},
	{
		id: 'garden',
		kinds: ['allotments', 'garden'],
		color: (c) => c.naturePark,
		opacity: { 11: 0, 12: 1 },
		group: 'land.urban',
	},
	{
		id: 'burial',
		kinds: ['cemetery', 'grave_yard'],
		color: (c) => c.areaBurial,
		opacity: { 13: 0, 14: 1 },
		group: 'land.urban',
	},
	{
		id: 'leisure',
		kinds: ['miniature_golf', 'playground', 'golf_course'],
		color: (c) => c.natureLeisure,
		group: 'land.urban',
	},
	{ id: 'rock', kinds: ['bare_rock', 'scree', 'shingle'], color: (c) => c.natureRock, group: 'land.rock' },
	{ id: 'forest', kinds: ['forest'], color: (c) => c.natureWood, opacity: { 7: 0, 8: 0.1 }, group: 'land.forest' },
	{
		id: 'grass',
		kinds: ['grass', 'grassland', 'meadow', 'wet_meadow'],
		color: (c) => c.natureGrass,
		opacity: { 11: 0, 12: 1 },
		group: 'land.vegetation',
	},
	{
		id: 'vegetation',
		kinds: ['heath', 'scrub'],
		color: (c) => c.naturePark,
		opacity: { 11: 0, 12: 1 },
		group: 'land.vegetation',
	},
	{ id: 'sand', kinds: ['beach', 'sand'], color: (c) => c.natureSand, group: 'land.sand' },
	{
		id: 'wetland',
		kinds: ['bog', 'marsh', 'string_bog', 'swamp'],
		color: (c) => c.natureWetland,
		group: 'land.wetland',
	},
];

export function* landcover(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	// ocean
	yield b.fill('water-ocean', { sourceLayer: 'ocean', color: c.water, group: 'water.ocean' });

	// glacier
	yield b.fill('land-glacier', {
		sourceLayer: 'water_polygons',
		filter: ['==', ['get', 'kind'], 'glacier'],
		color: c.glacier,
		group: 'land.glacier',
	});

	// land kinds
	for (const def of LAND) {
		yield b.fill('land-' + def.id, {
			sourceLayer: 'land',
			filter: ['in', ['get', 'kind'], ['literal', [...def.kinds]]] as FilterSpecification,
			color: def.color(c),
			opacity: def.opacity,
			group: def.group,
		});
	}
}

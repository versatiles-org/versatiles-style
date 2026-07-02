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
	/** Shortbread schema zoom at which this kind appears; the fill fades in over appear→appear+1. */
	appear: number;
	group: string;
};

// Render order (bottom → top) mirrors OSM Bright's land stacking: developed `landuse` fills first,
// then natural `landcover` on top (so parks/greens read over the urban fill), then beach/sand last.
const LAND: LandDef[] = [
	// Developed / modified land — OSM Bright's `landuse` fills, drawn lowest.
	{
		id: 'residential',
		kinds: ['garages', 'residential'],
		color: (c) => c.land.over(c.areaResidential),
		appear: 10,
		group: 'land.urban',
	},
	{
		id: 'commercial',
		kinds: ['commercial', 'retail'],
		color: (c) => c.land.over(c.areaCommercial),
		appear: 10,
		group: 'land.urban',
	},
	{
		id: 'industrial',
		kinds: ['industrial', 'quarry', 'railway'],
		color: (c) => c.land.over(c.areaIndustrial),
		appear: 10,
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
		color: (c) => c.land.over(c.natureAgriculture),
		appear: 10,
		group: 'land.agriculture',
	},
	{ id: 'waste', kinds: ['landfill'], color: (c) => c.land.over(c.areaWaste), appear: 10, group: 'land.urban' },
	{
		id: 'burial',
		kinds: ['cemetery', 'grave_yard'],
		color: (c) => c.land.over(c.areaBurial),
		appear: 13,
		group: 'land.urban',
	},
	// Natural land cover — OSM Bright's `landcover` fills, drawn over the developed land.
	{
		id: 'rock',
		kinds: ['bare_rock', 'scree', 'shingle'],
		color: (c) => c.land.over(c.natureRock),
		appear: 11,
		group: 'land.rock',
	},
	{ id: 'forest', kinds: ['forest'], color: (c) => c.land.over(c.natureWood), appear: 7, group: 'land.forest' },
	{
		id: 'grass',
		kinds: ['grass', 'grassland', 'meadow', 'wet_meadow'],
		color: (c) => c.land.over(c.natureGrass),
		appear: 11,
		group: 'land.vegetation',
	},
	{
		id: 'vegetation',
		kinds: ['heath', 'scrub'],
		color: (c) => c.land.over(c.naturePark),
		appear: 11,
		group: 'land.vegetation',
	},
	{
		id: 'wetland',
		kinds: ['bog', 'marsh', 'string_bog', 'swamp'],
		color: (c) => c.land.over(c.natureWetland),
		appear: 11,
		group: 'land.wetland',
	},
	// Managed green space reads highest among the land fills (parks on top), then beach/sand.
	{
		id: 'leisure',
		kinds: ['miniature_golf', 'playground', 'golf_course'],
		// Opaque land tinted with the translucent leisure colour, matching the `sports_center` site fill.
		color: (c) => c.land.over(c.natureLeisure),
		appear: 11,
		group: 'land.urban',
	},
	{
		id: 'garden',
		kinds: ['allotments', 'garden'],
		color: (c) => c.land.over(c.naturePark),
		appear: 11,
		group: 'land.urban',
	},
	{
		id: 'park',
		kinds: ['park', 'village_green', 'recreation_ground'],
		color: (c) => c.land.over(c.naturePark),
		appear: 11,
		group: 'land.urban',
	},
	{ id: 'sand', kinds: ['beach', 'sand'], color: (c) => c.land.over(c.natureSand), appear: 10, group: 'land.sand' },
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

	// land kinds — each fades in smoothly at its Shortbread appearance zoom
	for (const def of LAND) {
		yield b.fill('land-' + def.id, {
			sourceLayer: 'land',
			filter: ['in', ['get', 'kind'], ['literal', [...def.kinds]]] as FilterSpecification,
			color: def.color(c),
			appear: def.appear,
			group: def.group,
		});
	}
}

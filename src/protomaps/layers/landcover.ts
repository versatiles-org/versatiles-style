import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext, ColorSet } from '../context.js';
import type { Color } from '../../color/index.js';
import * as b from '../../dsl/index.js';

// Landcover band for Protomaps — the bottom-most fills.
//
// ── A split by zoom, not by meaning ───────────────────────────────────────────
//
// Protomaps has two land layers and they divide differently from OpenMapTiles':
//
//   landcover  z0–7   7 coarse kinds: glacier, farmland, grassland, forest, urban_area, barren, scrub
//   landuse    z2–15  the detailed set, ~30 kinds keyed on `kind`
//
// OpenMapTiles splits `landcover`/`landuse`/`park` semantically; Protomaps splits by **zoom**, coarse
// below and detailed above. That is exactly the job Shortbread's optional low-zoom landcover extension
// does, so the coarse band is drawn under the same option, `features.landcover`, and like Shortbread's
// it is off by default: without it, the three schemas draw the same bare land at low zoom.
//
// With it, the two bands overlap between z2 and z7. Both are drawn, coarse first: where they disagree
// the detailed `landuse` fill paints over the coarse one, and where `landuse` has nothing yet the coarse
// fill still covers the ground.
//
// Every kind below is from `npm run schema-values -- protomaps landcover landuse`.

type LandDef = {
	id: string;
	from: 'landcover' | 'landuse';
	kinds: string[];
	color: (c: ColorSet) => Color;
	/** Carried over from the Shortbread table, not measured — as in the OpenMapTiles port. */
	appear: number;
	group: string;
};

/** The coarse low-zoom band. Drawn first, so the detailed fills paint over it where they exist. */
const LOW_ZOOM: LandDef[] = [
	{
		id: 'lowzoom-forest',
		from: 'landcover',
		kinds: ['forest'],
		color: (c) => c.natureWood,
		appear: 0,
		group: 'land.forest',
	},
	{
		id: 'lowzoom-grass',
		from: 'landcover',
		kinds: ['grassland'],
		color: (c) => c.natureGrass,
		appear: 0,
		group: 'land.vegetation',
	},
	{
		id: 'lowzoom-scrub',
		from: 'landcover',
		kinds: ['scrub'],
		color: (c) => c.natureWood.blend(0.7, c.natureSand),
		appear: 0,
		group: 'land.vegetation',
	},
	{
		id: 'lowzoom-farmland',
		from: 'landcover',
		kinds: ['farmland'],
		color: (c) => c.natureAgriculture,
		appear: 0,
		group: 'land.agriculture',
	},
	{
		id: 'lowzoom-barren',
		from: 'landcover',
		kinds: ['barren'],
		color: (c) => c.natureRock,
		appear: 0,
		group: 'land.rock',
	},
	{
		id: 'lowzoom-urban',
		from: 'landcover',
		kinds: ['urban_area'],
		color: (c) => c.areaResidential,
		appear: 0,
		group: 'land.urban',
	},
];

// Render order (bottom → top) as in the other ports: developed land and managed green lowest, then
// natural cover, then sand and wetland.
const LAND: LandDef[] = [
	{
		id: 'commercial',
		from: 'landuse',
		kinds: ['commercial', 'retail'],
		color: (c) => c.areaCommercial,
		appear: 10,
		group: 'land.urban',
	},
	{
		id: 'industrial',
		from: 'landuse',
		kinds: ['industrial', 'quarry', 'railway'],
		color: (c) => c.areaIndustrial,
		appear: 10,
		group: 'land.urban',
	},
	{
		id: 'residential',
		from: 'landuse',
		kinds: ['residential', 'garages'],
		color: (c) => c.areaResidential,
		appear: 10,
		group: 'land.urban',
	},
	{
		id: 'agriculture',
		from: 'landuse',
		kinds: ['farmland', 'orchard', 'vineyard'],
		color: (c) => c.natureAgriculture,
		appear: 10,
		group: 'land.agriculture',
	},
	{
		id: 'park',
		from: 'landuse',
		kinds: ['park', 'village_green', 'recreation_ground', 'nature_reserve'],
		color: (c) => c.naturePark.fade(0.5),
		appear: 11,
		group: 'land.urban',
	},
	{
		id: 'garden',
		from: 'landuse',
		kinds: ['garden', 'allotments'],
		color: (c) => c.naturePark,
		appear: 11,
		group: 'land.urban',
	},
	{ id: 'burial', from: 'landuse', kinds: ['cemetery'], color: (c) => c.areaBurial, appear: 13, group: 'land.urban' },
	{
		id: 'leisure',
		from: 'landuse',
		kinds: ['playground', 'golf_course'],
		color: (c) => c.natureLeisure,
		appear: 11,
		group: 'land.urban',
	},
	{
		id: 'rock',
		from: 'landuse',
		kinds: ['bare_rock', 'scree'],
		color: (c) => c.natureRock,
		appear: 11,
		group: 'land.rock',
	},
	{
		id: 'forest',
		from: 'landuse',
		kinds: ['forest', 'wood'],
		color: (c) => c.natureWood,
		appear: 7,
		group: 'land.forest',
	},
	{
		id: 'grass',
		from: 'landuse',
		kinds: ['grass', 'grassland', 'meadow'],
		color: (c) => c.natureGrass,
		appear: 11,
		group: 'land.vegetation',
	},
	{
		id: 'vegetation',
		from: 'landuse',
		kinds: ['scrub', 'heath'],
		color: (c) => c.natureWood.blend(0.7, c.natureSand),
		appear: 11,
		group: 'land.vegetation',
	},
	{ id: 'sand', from: 'landuse', kinds: ['sand', 'beach'], color: (c) => c.natureSand, appear: 10, group: 'land.sand' },
	{
		id: 'wetland',
		from: 'landuse',
		kinds: ['wetland'],
		color: (c) => c.natureWetland,
		appear: 11,
		group: 'land.wetland',
	},
];

export function* landcover(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	// Glacier, from both bands: `landcover` covers it at world zoom, `landuse` in detail above.
	yield b.fill('land-glacier', {
		sourceLayer: 'landuse',
		filter: ['==', ['get', 'kind'], 'glacier'],
		color: c.glacier,
		group: 'land.glacier',
	});

	for (const def of ctx.features.landcover ? [...LOW_ZOOM, ...LAND] : LAND) {
		yield b.fill('land-' + def.id, {
			sourceLayer: def.from,
			filter:
				def.kinds.length === 1
					? ['==', ['get', 'kind'], def.kinds[0]]
					: (['in', ['get', 'kind'], ['literal', [...def.kinds]]] as FilterSpecification),
			color: def.color(c),
			...(def.appear > 0 ? { appear: def.appear } : {}),
			group: def.group,
		});
	}
}

import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext, ColorSet } from '../context.js';
import type { Color } from '../../color/index.js';
import * as b from '../../dsl/index.js';

// Landcover band for OpenMapTiles: the bottom-most fills. The port of
// `src/shortbread/layers/landcover.ts`, and the module where the two schemas disagree most.
//
// ── What the tiles say, and why it matters ────────────────────────────────────
//
// Every filter here was written from `npm run schema-values -- omt landcover landuse park`, which
// samples real tiles and reports observed values. Three findings changed the port:
//
//  1. **Fidelity lives in `subclass`, not `class`.** `landcover.class` has only seven values (grass,
//     rock, wood, ice, sand, wetland, farmland) — far coarser than Shortbread's ~40 `kind` values. But
//     `subclass` carries the original OSM tag (park, garden, allotments, scrub, meadow, scree, glacier,
//     …), so most of Shortbread's distinctions survive after all. The gate's "coarser classes" note was
//     too pessimistic.
//  2. **`class: grass` is a superset, so the render order cannot be copied blindly.** Parks, gardens,
//     flowerbeds and meadows are all `class: grass`. Shortbread draws its natural `land-grass` *above*
//     `land-park`, which is safe there because the kinds are disjoint; here it would repaint every park
//     as plain grass. So the green layers filter on `subclass` instead, keeping Shortbread's order with
//     no overlap — at the cost that a green `subclass` not listed below does not render, which is the
//     same way Shortbread treats a `kind` it does not list.
//  3. **The `park` layer is not for urban parks, and its `class` is not a vocabulary.** Urban parks are
//     `landcover` (`subclass: park`). OpenMapTiles' `park` layer is protected areas, and the sample
//     found 56+ distinct `class` values, many of them raw localised titles —
//     "Natura 2000-gebied", "Biosphärenreservat", "Ruhezone I/5". Nothing here filters on it, which is
//     why `park` stays in the conformance test's unrendered list rather than being quietly half-used.

type LandDef = {
	id: string;
	/** Source-layer this kind comes from — the band spans two, unlike Shortbread's single `land`. */
	from: 'landcover' | 'landuse';
	/** Field to test: `subclass` where fidelity is needed, `class` where the bucket is already right. */
	field: 'class' | 'subclass';
	values: string[];
	color: (c: ColorSet) => Color;
	/**
	 * Zoom the fill fades in at. **Carried over from the Shortbread module, not measured here** — those
	 * numbers describe when Shortbread tiles a kind, and the equivalent measurement for OpenMapTiles
	 * needs a zoom sweep the twelve-tile sample cannot provide. `landuse` starts at z4 and `landcover`
	 * at z0, so the data floor in `buildLayers` is the only part of this that is evidence-based.
	 */
	appear: number;
	group: string;
};

// Render order (bottom → top) as in the Shortbread module: developed land and managed green space
// lowest, then natural cover, then sand and wetland.
const LAND: LandDef[] = [
	// ── Developed / modified land, from `landuse` ───────────────────────────────
	{
		id: 'commercial',
		from: 'landuse',
		field: 'class',
		values: ['commercial', 'retail'],
		color: (c) => c.areaCommercial,
		appear: 10,
		group: 'land.urban',
	},
	{
		id: 'industrial',
		from: 'landuse',
		field: 'class',
		values: ['industrial', 'quarry', 'railway'],
		color: (c) => c.areaIndustrial,
		appear: 10,
		group: 'land.urban',
	},
	{
		id: 'residential',
		from: 'landuse',
		field: 'class',
		values: ['residential', 'garages'],
		color: (c) => c.areaResidential,
		appear: 10,
		group: 'land.urban',
	},
	{
		id: 'agriculture',
		from: 'landcover',
		field: 'class',
		// `farmland` is the whole agricultural bucket here, where Shortbread distinguishes eight kinds.
		// `plant_nursery` shows up as a `subclass` of it, so the coarse class is the right test.
		values: ['farmland'],
		color: (c) => c.natureAgriculture,
		appear: 10,
		group: 'land.agriculture',
	},
	// `land-waste` has no counterpart: Shortbread draws `landfill`, and no sampled tile carried a
	// landfill class in either layer. Folding it into `industrial` would tint a different feature than
	// the palette's `areaWaste` names, so it is dropped rather than approximated.
	{
		id: 'park',
		from: 'landcover',
		field: 'subclass',
		// `village_green` was not observed in the sample; kept because absence in twelve tiles is weak
		// evidence and a stray non-matching value costs nothing.
		values: ['park', 'village_green', 'recreation_ground'],
		color: (c) => c.naturePark.fade(0.5),
		appear: 11,
		group: 'land.urban',
	},
	{
		id: 'garden',
		from: 'landcover',
		field: 'subclass',
		// `flowerbed` and `shrubbery` are OpenMapTiles subclasses with no Shortbread kind; they belong
		// with `garden` both visually and by OSM tagging.
		values: ['allotments', 'garden', 'flowerbed', 'shrubbery'],
		color: (c) => c.naturePark,
		appear: 11,
		group: 'land.urban',
	},
	{
		id: 'burial',
		from: 'landuse',
		field: 'class',
		values: ['cemetery'],
		color: (c) => c.areaBurial,
		appear: 13,
		group: 'land.urban',
	},
	{
		id: 'leisure',
		from: 'landuse',
		field: 'class',
		values: ['playground'],
		color: (c) => c.natureLeisure,
		appear: 11,
		group: 'land.urban',
	},
	{
		// Shortbread draws golf courses in the same layer as playgrounds; OpenMapTiles files them in a
		// different source-layer, so one Shortbread layer becomes two here. Same group, same colour.
		id: 'leisure-golf',
		from: 'landcover',
		field: 'subclass',
		values: ['golf_course'],
		color: (c) => c.natureLeisure,
		appear: 11,
		group: 'land.urban',
	},
	// ── Natural cover, from `landcover` ────────────────────────────────────────
	{
		id: 'rock',
		from: 'landcover',
		field: 'class',
		// class `rock` was exactly `bare_rock` + `scree` in the sample, which is Shortbread's kind list
		// minus `shingle` — so the coarse class is both simpler and no less precise.
		values: ['rock'],
		color: (c) => c.natureRock,
		appear: 11,
		group: 'land.rock',
	},
	{
		id: 'forest',
		from: 'landcover',
		field: 'class',
		// class `wood` was exactly `forest` + `wood`.
		values: ['wood'],
		color: (c) => c.natureWood,
		appear: 7,
		group: 'land.forest',
	},
	{
		id: 'grass',
		from: 'landcover',
		field: 'subclass',
		// Deliberately `subclass`, not `class: grass` — see finding 2 in the header. `fell` is an
		// OpenMapTiles subclass with no Shortbread kind and belongs with the open grassland.
		values: ['grass', 'grassland', 'meadow', 'fell'],
		color: (c) => c.natureGrass,
		appear: 11,
		group: 'land.vegetation',
	},
	{
		id: 'vegetation',
		from: 'landcover',
		field: 'subclass',
		values: ['scrub', 'heath'],
		color: (c) => c.natureWood.blend(0.7, c.natureSand),
		appear: 11,
		group: 'land.vegetation',
	},
	{
		id: 'sand',
		from: 'landcover',
		field: 'class',
		// class `sand` covered both `sand` and `beach`, which is Shortbread's kind list exactly.
		values: ['sand'],
		color: (c) => c.natureSand,
		appear: 10,
		group: 'land.sand',
	},
	{
		id: 'wetland',
		from: 'landcover',
		field: 'class',
		// class `wetland` covered `wetland` and `saltmarsh`; Shortbread splits bog/marsh/swamp, which
		// OpenMapTiles does not carry separately.
		values: ['wetland'],
		color: (c) => c.natureWetland,
		appear: 11,
		group: 'land.wetland',
	},
];

export function* landcover(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	// Glacier. Shortbread serves this as a `water_polygons` kind (hence its z4 fade); OpenMapTiles has
	// it as `landcover` `class: ice` / `subclass: glacier` from z0, so no appearance ramp is needed.
	// The ocean fill is NOT here: OpenMapTiles has no `ocean` source-layer, so it is a `water` class and
	// lives in the water module — the one place this band's contents differ structurally.
	yield b.fill('land-glacier', {
		sourceLayer: 'landcover',
		filter: ['==', ['get', 'class'], 'ice'],
		color: c.glacier,
		group: 'land.glacier',
	});

	for (const def of LAND) {
		yield b.fill('land-' + def.id, {
			sourceLayer: def.from,
			filter:
				def.values.length === 1
					? ['==', ['get', def.field], def.values[0]]
					: (['in', ['get', def.field], ['literal', [...def.values]]] as FilterSpecification),
			color: def.color(c),
			appear: def.appear,
			group: def.group,
		});
	}
}

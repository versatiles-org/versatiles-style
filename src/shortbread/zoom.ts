/**
 * Zoom levels at which the `land` and `water_polygons` layers start carrying each `kind`,
 * and the fade-in zoom derived from them.
 *
 * A fill must not be painted before its data exists, otherwise it pops in (or, worse, shows
 * whatever a tileset happens to deliver early). The zooms below are the single source of truth
 * for that: every land/water-polygon rule in the styles derives its fade from them instead of
 * hard-coding zoom stops.
 */

/**
 * Zoom at which each `kind` first appears, grouped exactly as the Shortbread schema lists them.
 * See https://shortbread-tiles.org/schema/1.0/
 */
const KIND_ZOOM: Record<string, number> = Object.fromEntries([
	// water_polygons
	...['glacier', 'water', 'river', 'reservoir', 'basin'].map((kind) => [kind, 4]),
	...['dock', 'canal'].map((kind) => [kind, 10]),

	// land
	...['forest'].map((kind) => [kind, 7]),
	...[
		'beach',
		'brownfield',
		'commercial',
		'farmland',
		'farmyard',
		'garages',
		'greenfield',
		'industrial',
		'landfill',
		'railway',
		'residential',
		'retail',
		'sand',
	].map((kind) => [kind, 10]),
	...[
		'allotments',
		'bare_rock',
		'bog',
		'garden',
		'golf_course',
		'grass',
		'grassland',
		'greenhouse_horticulture',
		'heath',
		'marsh',
		'meadow',
		'miniature_golf',
		'orchard',
		'park',
		'plant_nursery',
		'playground',
		'quarry',
		'recreation_ground',
		'scree',
		'scrub',
		'shingle',
		'string_bog',
		'swamp',
		'vineyard',
		'village_green',
		'wet_meadow',
	].map((kind) => [kind, 11]),
	...['cemetery', 'grave_yard'].map((kind) => [kind, 13]),
]);

/**
 * Kinds that the optional low-zoom land cover extension delivers from z0 onwards, up to the zoom
 * where the OpenStreetMap data takes over. Enabling `experimental.landcover` pulls the fade-in of
 * every layer rendering one of these kinds down to z0.
 * See https://docs.versatiles.org/compendium/specification_shortbread_landcover.html
 */
const LANDCOVER_KINDS = new Set([
	// land
	'bare_rock',
	'farmland',
	'forest',
	'grassland',
	'heath',
	'marsh',
	'residential',
	'scrub',
	'swamp',
	// water_polygons
	'glacier',
	'water',
]);

/** The `land` layers, in render order: layer id (without the `land-` prefix) → the kinds it renders. */
export const LAND_KIND_GROUPS = [
	{ id: 'commercial', kinds: ['commercial', 'retail'] },
	{ id: 'industrial', kinds: ['industrial', 'quarry', 'railway'] },
	{ id: 'residential', kinds: ['garages', 'residential'] },
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
	},
	{ id: 'waste', kinds: ['landfill'] },
	{ id: 'park', kinds: ['park', 'village_green', 'recreation_ground'] },
	{ id: 'garden', kinds: ['allotments', 'garden'] },
	{ id: 'burial', kinds: ['cemetery', 'grave_yard'] },
	{ id: 'leisure', kinds: ['miniature_golf', 'playground', 'golf_course'] },
	{ id: 'rock', kinds: ['bare_rock', 'scree', 'shingle'] },
	{ id: 'forest', kinds: ['forest'] },
	{ id: 'grass', kinds: ['grass', 'grassland', 'meadow', 'wet_meadow'] },
	{ id: 'vegetation', kinds: ['heath', 'scrub'] },
	{ id: 'sand', kinds: ['beach', 'sand'] },
	{ id: 'wetland', kinds: ['bog', 'marsh', 'string_bog', 'swamp'] },
] as const;

/** The `water_polygons` layers: full layer id → the kinds it renders. */
export const WATER_POLYGON_KIND_GROUPS: Record<string, readonly string[]> = {
	'land-glacier': ['glacier'],
	'water-area': ['water'],
	'water-area-river': ['river'],
	'water-area-small': ['reservoir', 'basin', 'dock'],
};

/** Layer id → the kinds it renders, for every layer whose fade-in zoom is schema-derived. */
const LAYER_KINDS = new Map<string, readonly string[]>([
	...LAND_KIND_GROUPS.map(({ id, kinds }): [string, readonly string[]] => ['land-' + id, kinds]),
	...Object.entries(WATER_POLYGON_KIND_GROUPS),
]);

/**
 * The zoom at which a layer's first feature appears, i.e. the lowest appearance zoom of all the
 * kinds it renders. With `landcover` enabled, kinds covered by the land cover extension count as
 * present from z0, so a layer rendering any of them starts at z0.
 */
export function getFadeInZoom(layerIds: string | readonly string[], landcover = false): number {
	const ids = typeof layerIds === 'string' ? [layerIds] : layerIds;
	const zooms = ids.map((layerId) => {
		const kinds = LAYER_KINDS.get(layerId);
		if (!kinds) throw new Error(`shortbread/zoom: no kinds known for layer "${layerId}"`);
		return Math.min(
			...kinds.map((kind) => {
				if (landcover && LANDCOVER_KINDS.has(kind)) return 0;
				const zoom = KIND_ZOOM[kind];
				if (zoom == null) throw new Error(`shortbread/zoom: no appearance zoom known for kind "${kind}"`);
				return zoom;
			})
		);
	});
	return Math.min(...zooms);
}

/** Options for a single fade-in. */
export interface FadeInOptions {
	/** Opacity the fade ends at. @default 1 */
	target?: number;
	/** Number of zoom levels the fade spans. @default 1 */
	span?: number;
}

/** An opacity value: fully faded in from the start, or zoom stops ramping 0 → target. */
export type FadeIn = number | Record<number, number> | undefined;

/**
 * Build the `opacity` helper for a set of style rules. The returned function turns one or more
 * layer ids into the opacity that fades those layers in exactly when their data appears — a plain
 * value (no ramp) once the data reaches z0, where there is nothing left to fade in from.
 *
 * Pass several ids when one rule styles several layers (e.g. `'land-{park,garden}'`); the fade
 * then starts at the earliest of them. Only group layers that share an appearance zoom in *both*
 * modes — a landcover-backed layer grouped with a plain one would drag the plain one down to z0.
 */
export function createFadeIn(
	landcover: boolean
): (layerIds: string | readonly string[], options?: FadeInOptions) => FadeIn {
	return function fadeIn(layerIds: string | readonly string[], options: FadeInOptions = {}): FadeIn {
		const { target = 1, span = 1 } = options;
		const zoom = getFadeInZoom(layerIds, landcover);
		// Visible from the first zoom level: no ramp, and no property at all when fully opaque.
		if (zoom <= 0) return target === 1 ? undefined : target;
		return { [zoom]: 0, [zoom + span]: target };
	};
}

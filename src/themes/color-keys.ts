/**
 * The colour slots a palette fills: their names, their order, and the option type that mirrors them.
 *
 * A leaf on purpose — it imports nothing — so anything may read the key list without dragging the
 * resolver, and its `checkKeys` dependency, along with it. `options/parts/v5-hints.ts` is why: it needs
 * the list to map v5 colour names onto v6 ones, and while the list lived beside `resolveColors` that
 * single import closed a cycle (`keys → v5-hints → colors → keys`), survived only because `v5-hints`
 * built its tables lazily.
 *
 * It sits in `themes/` rather than `options/` because the order is load-bearing here: `tables.ts` stores
 * each derived palette as bare values in exactly this sequence, and `getPaletteColors` zips them back
 * together against this array. `options` re-exports both names from `parts/colors.ts`, so callers still
 * import them from the options surface; the dependency runs options → themes, never back.
 */

export type ColorsOptions = {
	// base
	background?: string;
	land?: string;
	water?: string;
	glacier?: string;

	// natural land cover
	natureWood?: string;
	natureGrass?: string;
	naturePark?: string;
	natureAgriculture?: string;
	natureSand?: string;
	natureRock?: string;
	natureWetland?: string;
	natureLeisure?: string;

	// urban land use
	areaResidential?: string;
	areaCommercial?: string;
	areaIndustrial?: string;
	areaWaste?: string;
	areaBurial?: string;

	// sites
	siteConstruction?: string;
	siteEducation?: string;
	siteHospital?: string;
	siteDanger?: string;
	sitePrison?: string;
	siteParking?: string;
	siteSports?: string;

	// buildings
	building?: string;
	buildingBg?: string;

	// roads
	roadStreet?: string;
	roadStreetBg?: string;
	roadMotorway?: string;
	roadMotorwayBg?: string;
	roadTrunk?: string;
	roadTrunkBg?: string;

	// transit
	transitRail?: string;
	transitSubway?: string;
	transitCycle?: string;
	transitFoot?: string;

	// boundaries
	boundary?: string;
	boundaryDisputed?: string;

	// labels & symbols
	label?: string;
	labelHalo?: string;
	labelShield?: string;
	labelSymbol?: string;
	labelPoi?: string;
	labelHousenumber?: string;
	/** Lake, sea and river names — a darkened water tone, so they read as water, not as places. */
	labelWater?: string;
};

// Frozen for the same reason as `PALETTES`: it is public API as `osm.colorKeys` and it drives colour
// validation, so an in-place edit by a caller would change what the library accepts.
export const colorOptionsKeys: ReadonlyArray<keyof ColorsOptions> = Object.freeze([
	'background',
	'land',
	'water',
	'glacier',
	'natureWood',
	'natureGrass',
	'naturePark',
	'natureAgriculture',
	'natureSand',
	'natureRock',
	'natureWetland',
	'natureLeisure',
	'areaResidential',
	'areaCommercial',
	'areaIndustrial',
	'areaWaste',
	'areaBurial',
	'siteConstruction',
	'siteEducation',
	'siteHospital',
	'siteDanger',
	'sitePrison',
	'siteParking',
	'siteSports',
	'building',
	'buildingBg',
	'roadStreet',
	'roadStreetBg',
	'roadMotorway',
	'roadMotorwayBg',
	'roadTrunk',
	'roadTrunkBg',
	'transitRail',
	'transitSubway',
	'transitCycle',
	'transitFoot',
	'boundary',
	'boundaryDisputed',
	'label',
	'labelHalo',
	'labelShield',
	'labelSymbol',
	'labelPoi',
	'labelHousenumber',
	'labelWater',
] as const);

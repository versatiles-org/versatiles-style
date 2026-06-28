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
};

export const colorOptionsKeys: ReadonlyArray<keyof ColorsOptions> = [
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
] as const;

export type RecolorOptions = {
	// mode-independent (same visual effect on light and dark palettes)
	invertBrightness?: boolean;
	rotateHue?: number;
	saturate?: number;
	tint?: { color: string; amount?: number };
	// mode-dependent (absolute operations; effect differs on light vs dark)
	gamma?: number;
	contrast?: number;
	brightness?: number;
	blend?: { color: string; amount?: number };
};

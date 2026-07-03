import { calculateDarkModeColors } from '../color/index.js';
import type { ResolvedColors } from '../options/colors.js';
import type { PaletteDefinition } from './types.js';

const light: ResolvedColors = {
	// Light mode mirrors the OpenMapTiles "OSM Bright" palette exactly (see style.osm-bright.json).
	background: '#F8F4F0',
	land: '#F8F4F0',
	water: '#BFD9F2',
	glacier: '#FFFFFF',
	natureWood: '#66AA4420',
	natureGrass: '#D8E8C8',
	naturePark: '#D9D9A5',
	natureAgriculture: '#F0E7D1',
	natureSand: '#FAFAED',
	natureRock: '#E0E4E5',
	natureWetland: '#D3E6DB',
	natureLeisure: '#E7EDDE',
	areaResidential: '#F5F1ED',
	areaCommercial: '#F8EEEF',
	areaIndustrial: '#FAF4E1',
	areaWaste: '#DBD6BD',
	areaBurial: '#E0E4DD',
	siteConstruction: '#A9A9A91A',
	siteEducation: '#FFFF8020',
	siteHospital: '#FF66661A',
	siteDanger: '#FF00004D',
	sitePrison: '#FDF2FC1A',
	siteParking: '#EBE8E6',
	siteSports: '#F6F3EE26',
	building: '#F2EAE2',
	buildingBg: '#DFDBD7',
	roadStreet: '#FFFFFF',
	roadStreetBg: '#CFCDCA',
	roadMotorway: '#FFCC88',
	roadMotorwayBg: '#E9AC77',
	roadTrunk: '#FFEEAA',
	roadTrunkBg: '#E9AC77',
	transitRail: '#B1BBC4',
	transitSubway: '#A6B8C7',
	transitCycle: '#EFF9FF',
	transitFoot: '#FBEBFF',
	boundary: '#A6A6C8',
	boundaryDisputed: '#BEBCCF',
	label: '#333344',
	labelHalo: '#ffffffcc',
	labelShield: '#FFFFFF',
	labelSymbol: '#66626A',
	labelPoi: '#66666666',
	labelHousenumber: '#0F0B074D',
};

// Light colors are taken directly from the v5 Colorful palette.
// Dark colors are derived by inverting HSL lightness (L → 100 – L), matching Eclipse.
export const colorful: PaletteDefinition = {
	light,
	get dark() {
		return calculateDarkModeColors(light);
	},
};

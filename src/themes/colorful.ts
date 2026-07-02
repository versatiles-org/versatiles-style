import { calculateDarkModeColors } from '../color/index.js';
import type { ResolvedColors } from '../options/colors.js';
import type { PaletteDefinition } from './types.js';

const light: ResolvedColors = {
	// Light mode mirrors the OpenMapTiles "OSM Bright" palette exactly (see style.osm-bright.json).
	background: '#F8F4F0',
	land: '#F8F4F0',
	water: '#BFD9F2',
	glacier: '#FFFFFF',
	natureWood: '#66AA441A',
	natureGrass: '#D8E8C8',
	naturePark: '#D8E8C8',
	natureAgriculture: '#F0E7D1',
	natureSand: '#F5EEBC',
	natureRock: '#E0E4E5',
	natureWetland: '#D3E6DB',
	natureLeisure: '#E7EDDE1A',
	areaResidential: '#EAE6E133',
	areaCommercial: '#F7DEED40',
	areaIndustrial: '#FFF4C255',
	areaWaste: '#DBD6BD',
	areaBurial: '#E0E4DD',
	siteConstruction: '#A9A9A91A',
	siteEducation: '#F0E8F8',
	siteHospital: '#FFDDEE',
	siteDanger: '#FF00004D',
	sitePrison: '#FDF2FC1A',
	siteParking: '#EBE8E6',
	building: '#F2EAE2',
	buildingBg: '#DFDBD7',
	roadStreet: '#FFFFFF',
	roadStreetBg: '#CFCFCF',
	roadMotorway: '#FFCC88',
	roadMotorwayBg: '#E9AC77',
	roadTrunk: '#FFEEAA',
	roadTrunkBg: '#E9AC77',
	transitRail: '#BBBBBB',
	transitSubway: '#BABABAB3',
	transitCycle: '#EFF9FF',
	transitFoot: '#FBEBFF80',
	boundary: '#9E9CAB',
	boundaryDisputed: '#AFADB8',
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

import { calculateDarkModeColors } from '../color/index.js';
import type { ResolvedColors } from '../options/colors.js';
import type { PaletteDefinition } from './types.js';

// Fully desaturated palette — water keeps a hint of blue; everything else is gray.
const light: ResolvedColors = {
	background: '#F0F0F0',
	land: '#F0F0F0',
	water: '#C0D0E0',
	glacier: '#F8F8F8',
	natureWood: '#B0B8B0',
	natureGrass: '#E0E8E0',
	naturePark: '#DCDCD8',
	natureAgriculture: '#E8E8E0',
	natureSand: '#F8F8F0',
	natureRock: '#D8D8D8',
	natureWetland: '#D4DCD8',
	natureLeisure: '#E0E8DC',
	areaResidential: '#ECECEC33',
	areaCommercial: '#EEEEEE40',
	areaIndustrial: '#F0F0E855',
	areaWaste: '#E0E0D8',
	areaBurial: '#E4E4E0',
	siteConstruction: '#C8C8C8',
	siteEducation: '#F0F0D8',
	siteHospital: '#F0E0E0',
	siteDanger: '#E84040',
	sitePrison: '#EEEEEC',
	siteParking: '#E8E8E8',
	building: '#EBEBEB',
	buildingBg: '#D8D8D8',
	roadStreet: '#FFFFFF',
	roadStreetBg: '#D0D0D0',
	roadMotorway: '#E8D0A0',
	roadMotorwayBg: '#D0B880',
	roadTrunk: '#ECE4B8',
	roadTrunkBg: '#D0B880',
	transitRail: '#B8BCC0',
	transitSubway: '#B0B8C0',
	transitCycle: '#E8F4F8',
	transitFoot: '#F0ECF8',
	boundary: '#B4B4C8',
	boundaryDisputed: '#C8C8D4',
	label: '#404040',
	labelHalo: '#ffffff99',
	labelShield: '#FFFFFF',
	labelSymbol: '#707070',
	labelPoi: '#606060',
	labelHousenumber: '#0F0F0F4D',
};

export const gray: PaletteDefinition = {
	light,
	get dark() {
		return calculateDarkModeColors(light);
	},
};

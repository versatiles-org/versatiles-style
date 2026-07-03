import { calculateDarkModeColors } from '../color/index.js';
import type { ResolvedColors } from '../options/colors.js';
import type { PaletteDefinition } from './types.js';

// Desaturated palette — subtle hues, professional feel, suitable for data overlays.
const light: ResolvedColors = {
	background: '#F4F0EE',
	land: '#F4F0EE',
	water: '#C4D8E8',
	glacier: '#F4F8FC',
	natureWood: '#88AA78',
	natureGrass: '#DCE8D4',
	naturePark: '#DCE4C4',
	natureAgriculture: '#ECE8DC',
	natureSand: '#F8F8F0',
	natureRock: '#E4E4E4',
	natureWetland: '#D8E4DC',
	natureLeisure: '#E4E8DC',
	areaResidential: '#ECE8E433',
	areaCommercial: '#F0E8EC40',
	areaIndustrial: '#F8F4E055',
	areaWaste: '#E0DCD0',
	areaBurial: '#E0DCD4',
	siteConstruction: '#C4C4C4',
	siteEducation: '#F8F8C0',
	siteHospital: '#F8C8C8',
	siteDanger: '#F44040',
	sitePrison: '#F4ECF8',
	siteParking: '#ECE8E4',
	siteSports: '#E4E8DC',
	building: '#F0ECE8',
	buildingBg: '#E4E0DC',
	roadStreet: '#FFFFFF',
	roadStreetBg: '#D4D0CC',
	roadMotorway: '#F4D8A8',
	roadMotorwayBg: '#E0C490',
	roadTrunk: '#F4ECC4',
	roadTrunkBg: '#E0C490',
	transitRail: '#C0C8D0',
	transitSubway: '#B8C8D4',
	transitCycle: '#F0F8FC',
	transitFoot: '#F8F0FC',
	boundary: '#B8B8CC',
	boundaryDisputed: '#CCCCD8',
	label: '#444454',
	labelHalo: '#ffffffcc',
	labelShield: '#FFFFFF',
	labelSymbol: '#787880',
	labelPoi: '#686868',
	labelHousenumber: '#110D0B4D',
};

export const muted: PaletteDefinition = {
	light,
	get dark() {
		return calculateDarkModeColors(light);
	},
};

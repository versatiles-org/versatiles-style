import { calculateDarkModeColors } from '../color/index.js';
import type { ResolvedColors } from '../options/colors.js';
import type { PaletteDefinition } from './types.js';

// High-contrast black-and-white palette — ideal for print and strong data overlays.
const light: ResolvedColors = {
	background: '#FFFFFF',
	land: '#FFFFFF',
	water: '#9EC8EA',
	glacier: '#F8FCFF',
	natureWood: '#D4E4D0',
	natureGrass: '#ECF4EC',
	naturePark: '#E8ECD0',
	natureAgriculture: '#F4F0E0',
	natureSand: '#F8F8F0',
	natureRock: '#E0E0E0',
	natureWetland: '#D0E4DA',
	natureLeisure: '#E0EAD4',
	areaResidential: '#F4F4F433',
	areaCommercial: '#F8F0F440',
	areaIndustrial: '#F8F8EC55',
	areaWaste: '#ECE8E0',
	areaBurial: '#ECE8E4',
	siteConstruction: '#E0E0E0',
	siteEducation: '#FCFCD4',
	siteHospital: '#FCE0E0',
	siteDanger: '#F04040',
	sitePrison: '#F4F4F4',
	siteParking: '#F4F4F4',
	building: '#F0EEEC',
	buildingBg: '#D0D0D0',
	roadStreet: '#FFFFFF',
	roadStreetBg: '#B0B0B0',
	roadMotorway: '#E8B040',
	roadMotorwayBg: '#C09020',
	roadTrunk: '#F0DC78',
	roadTrunkBg: '#C09020',
	transitRail: '#909090',
	transitSubway: '#808888',
	transitCycle: '#E8F8F4',
	transitFoot: '#F0E8FC',
	boundary: '#888888',
	boundaryDisputed: '#A8A8A8',
	label: '#000000',
	labelHalo: '#ffffffaa',
	labelShield: '#FFFFFF',
	labelSymbol: '#404040',
	labelPoi: '#404040',
};

export const toner: PaletteDefinition = {
	light,
	get dark() {
		return calculateDarkModeColors(light);
	},
};

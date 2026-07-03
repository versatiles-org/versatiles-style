import { calculateDarkModeColors } from '../color/index.js';
import type { ResolvedColors } from '../options/colors.js';
import type { PaletteDefinition } from './types.js';

// Earthy, organic palette — richer greens for nature, warm browns for land, less saturated roads.
const light: ResolvedColors = {
	background: '#F2EDDE',
	land: '#F2EDDE',
	water: '#B0D4EE',
	glacier: '#F0F8FF',
	natureWood: '#4A9828',
	natureGrass: '#C4E0A8',
	naturePark: '#C8D460',
	natureAgriculture: '#E8DCC0',
	natureSand: '#F8F4D4',
	natureRock: '#D8DCE0',
	natureWetland: '#B8D8C8',
	natureLeisure: '#D8ECCC',
	areaResidential: '#E8E0D033',
	areaCommercial: '#F0DCE440',
	areaIndustrial: '#F8ECC055',
	areaWaste: '#D4CDB0',
	areaBurial: '#D8D2BC',
	siteConstruction: '#BCB090',
	siteEducation: '#F8F480',
	siteHospital: '#F8A0A0',
	siteDanger: '#F04040',
	sitePrison: '#ECDCF4',
	siteParking: '#E4E0D8',
	siteSports: '#D8ECCC',
	building: '#ECE4D8',
	buildingBg: '#D8D0C4',
	roadStreet: '#FFFFFF',
	roadStreetBg: '#C8C0B8',
	roadMotorway: '#F4C860',
	roadMotorwayBg: '#D4A844',
	roadTrunk: '#F4E888',
	roadTrunkBg: '#D4A844',
	transitRail: '#A8B8C0',
	transitSubway: '#9CB4C4',
	transitCycle: '#E4F8EC',
	transitFoot: '#F4E8FC',
	boundary: '#A0A0C0',
	boundaryDisputed: '#B8B4C8',
	label: '#2C2C44',
	labelHalo: '#ffffffcc',
	labelShield: '#FFFFFF',
	labelSymbol: '#606068',
	labelPoi: '#505050',
	labelHousenumber: '#211C0D4D',
};

export const natural: PaletteDefinition = {
	light,
	get dark() {
		return calculateDarkModeColors(light);
	},
};

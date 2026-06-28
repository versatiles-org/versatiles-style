import { Color } from '../color/index.js';
import type { ColorsOptions } from '../types/index.js';
import type { ThemeRules } from './types.js';

// Builds the full set of layer-override rules from resolved colors and font names.
// Returns a ThemeRules record whose keys are brace-expansion patterns (same format as
// the v5 decorator); applyTheme expands them and applies overrides to each matching layer.
export function buildThemeRules(
	colorStrings: Required<ColorsOptions>,
	fonts: { normal: string; bold: string }
): ThemeRules {
	const c = {
		background: Color.parse(colorStrings.background),
		land: Color.parse(colorStrings.land),
		water: Color.parse(colorStrings.water),
		glacier: Color.parse(colorStrings.glacier),
		natureWood: Color.parse(colorStrings.natureWood),
		natureGrass: Color.parse(colorStrings.natureGrass),
		naturePark: Color.parse(colorStrings.naturePark),
		natureAgriculture: Color.parse(colorStrings.natureAgriculture),
		natureSand: Color.parse(colorStrings.natureSand),
		natureRock: Color.parse(colorStrings.natureRock),
		natureWetland: Color.parse(colorStrings.natureWetland),
		natureLeisure: Color.parse(colorStrings.natureLeisure),
		areaResidential: Color.parse(colorStrings.areaResidential),
		areaCommercial: Color.parse(colorStrings.areaCommercial),
		areaIndustrial: Color.parse(colorStrings.areaIndustrial),
		areaWaste: Color.parse(colorStrings.areaWaste),
		areaBurial: Color.parse(colorStrings.areaBurial),
		siteConstruction: Color.parse(colorStrings.siteConstruction),
		siteEducation: Color.parse(colorStrings.siteEducation),
		siteHospital: Color.parse(colorStrings.siteHospital),
		siteDanger: Color.parse(colorStrings.siteDanger),
		sitePrison: Color.parse(colorStrings.sitePrison),
		siteParking: Color.parse(colorStrings.siteParking),
		building: Color.parse(colorStrings.building),
		buildingBg: Color.parse(colorStrings.buildingBg),
		roadStreet: Color.parse(colorStrings.roadStreet),
		roadStreetBg: Color.parse(colorStrings.roadStreetBg),
		roadMotorway: Color.parse(colorStrings.roadMotorway),
		roadMotorwayBg: Color.parse(colorStrings.roadMotorwayBg),
		roadTrunk: Color.parse(colorStrings.roadTrunk),
		roadTrunkBg: Color.parse(colorStrings.roadTrunkBg),
		transitRail: Color.parse(colorStrings.transitRail),
		transitSubway: Color.parse(colorStrings.transitSubway),
		transitCycle: Color.parse(colorStrings.transitCycle),
		transitFoot: Color.parse(colorStrings.transitFoot),
		boundary: Color.parse(colorStrings.boundary),
		boundaryDisputed: Color.parse(colorStrings.boundaryDisputed),
		label: Color.parse(colorStrings.label),
		labelHalo: Color.parse(colorStrings.labelHalo),
		labelShield: Color.parse(colorStrings.labelShield),
		labelSymbol: Color.parse(colorStrings.labelSymbol),
		labelPoi: Color.parse(colorStrings.labelPoi),
	};

	// Reference colors for tunnel/bridge effects: bg ≈ white in light mode, black in dark mode.
	const bg = c.land.saturate(-1).contrast(100);
	const fg = bg.invertLuminosity();

	return {
		// background
		background: {
			color: c.background,
		},

		// ── Boundaries ──────────────────────────────────────────────────────────

		'boundary-{country,state}:outline': {
			color: c.land.blend(0.1, bg),
			lineBlur: 1,
			lineCap: 'round',
			lineJoin: 'round',
		},
		'boundary-{country,state}': {
			color: c.boundary,
			lineCap: 'round',
			lineJoin: 'round',
		},
		'boundary-country{-disputed,}:outline': {
			size: { 2: 0, 3: 2, 10: 8 },
			opacity: 0.75,
			color: c.land.blend(0.05, bg),
		},
		'boundary-country{-disputed,}': {
			size: { 2: 0, 3: 1, 10: 4 },
		},
		'boundary-country-disputed': {
			color: c.boundaryDisputed,
			lineDasharray: [2, 1],
			lineCap: 'square',
		},
		'boundary-state:outline': {
			size: { 7: 0, 8: 2, 10: 4 },
			opacity: 0.75,
		},
		'boundary-state': {
			size: { 7: 0, 8: 1, 10: 2 },
		},

		// ── Water ────────────────────────────────────────────────────────────────

		'water-*': {
			color: c.water,
			lineCap: 'round',
			lineJoin: 'round',
		},
		'water-area': {
			opacity: { 4: 0, 6: 1 },
		},
		'water-area-*': {
			opacity: { 4: 0, 6: 1 },
		},
		'water-{pier,dam}-area': {
			color: c.land,
			opacity: { 12: 0, 13: 1 },
		},
		'water-pier': {
			color: c.land,
		},
		'water-river': {
			size: { 9: 0, 10: 3, 15: 5, 17: 9, 18: 20, 20: 60 },
		},
		'water-canal': {
			size: { 9: 0, 10: 2, 15: 4, 17: 8, 18: 17, 20: 50 },
		},
		'water-stream': {
			size: { 13: 0, 14: 1, 15: 2, 17: 6, 18: 12, 20: 30 },
		},
		'water-ditch': {
			size: { 14: 0, 15: 1, 17: 4, 18: 8, 20: 20 },
		},

		// ── Land ─────────────────────────────────────────────────────────────────

		'land-*': {
			color: c.land,
		},
		'land-glacier': {
			color: c.glacier,
		},
		'land-forest': {
			color: c.natureWood,
			opacity: { 7: 0, 8: 0.1 },
		},
		'land-grass': {
			color: c.natureGrass,
			opacity: { 11: 0, 12: 1 },
		},
		'land-{park,garden,vegetation}': {
			color: c.naturePark,
			opacity: { 11: 0, 12: 1 },
		},
		'land-agriculture': {
			color: c.natureAgriculture,
			opacity: { 10: 0, 11: 1 },
		},
		'land-residential': {
			color: c.areaResidential,
			opacity: { 10: 0, 11: 1 },
		},
		'land-commercial': {
			color: c.areaCommercial,
			opacity: { 10: 0, 11: 1 },
		},
		'land-industrial': {
			color: c.areaIndustrial,
			opacity: { 10: 0, 11: 1 },
		},
		'land-waste': {
			color: c.areaWaste,
			opacity: { 10: 0, 11: 1 },
		},
		'land-burial': {
			color: c.areaBurial,
			opacity: { 13: 0, 14: 1 },
		},
		'land-leisure': {
			color: c.natureLeisure,
		},
		'land-rock': {
			color: c.natureRock,
		},
		'land-sand': {
			color: c.natureSand,
		},
		'land-wetland': {
			color: c.natureWetland,
		},

		// ── Sites ────────────────────────────────────────────────────────────────

		'site-dangerarea': {
			color: c.siteDanger,
			fillOutlineColor: c.siteDanger,
			opacity: 0.3,
			image: 'basics:pattern-warning',
		},
		'site-hospital': {
			color: c.siteHospital,
			opacity: 0.1,
		},
		'site-prison': {
			color: c.sitePrison,
			image: 'basics:pattern-striped',
			opacity: 0.1,
		},
		'site-construction': {
			color: c.siteConstruction,
			image: 'basics:pattern-hatched_thin',
			opacity: 0.1,
		},
		'site-{university,college,school}': {
			color: c.siteEducation,
			opacity: 0.1,
		},
		'site-{bicycleparking,parking}': {
			color: c.siteParking,
		},

		// ── Buildings ────────────────────────────────────────────────────────────

		'building:outline': {
			color: c.buildingBg,
			opacity: { 14: 0, 15: 1 },
		},
		building: {
			color: c.building,
			opacity: { 14: 0, 15: 1 },
			fillTranslate: [-2, -2],
		},
		'building-3d': {
			color: c.building,
			opacity: { 14: 0, 15: 0.7 },
			fillExtrusionHeight: ['coalesce', ['get', 'height'], 5],
			fillExtrusionBase: ['coalesce', ['get', 'min_height'], 0],
		},

		// ── Airport ──────────────────────────────────────────────────────────────

		'airport-area': {
			color: c.roadStreet,
			opacity: 0.5,
		},
		'airport-{runway,taxiway}:outline': {
			color: c.roadStreetBg,
			lineJoin: 'round',
		},
		'airport-{runway,taxiway}': {
			color: c.roadStreet,
			lineJoin: 'round',
		},
		'airport-runway:outline': {
			size: { 11: 0, 12: 6, 13: 9, 14: 16, 15: 24, 16: 40, 17: 100, 18: 160, 20: 300 },
		},
		'airport-runway': {
			size: { 11: 0, 12: 5, 13: 8, 14: 14, 15: 22, 16: 38, 17: 98, 18: 158, 20: 298 },
			opacity: { 11: 0, 12: 1 },
		},
		'airport-taxiway:outline': {
			size: { 13: 0, 14: 2, 15: 10, 16: 14, 18: 20, 20: 40 },
		},
		'airport-taxiway': {
			size: { 13: 0, 14: 1, 15: 8, 16: 12, 18: 18, 20: 36 },
			opacity: { 13: 0, 14: 1 },
		},

		// ── Bridge polygon ───────────────────────────────────────────────────────

		bridge: {
			color: c.land.blend(0.02, fg),
			fillAntialias: true,
			opacity: 0.8,
		},

		// ── Streets — colors and joins ───────────────────────────────────────────

		'{tunnel-,bridge-,}street-*:outline': {
			color: c.roadStreetBg,
			lineJoin: 'round',
		},
		'{tunnel-,bridge-,}street-*': {
			color: c.roadStreet,
			lineJoin: 'round',
		},
		'tunnel-street-*:outline': {
			color: c.roadStreet.blend(0.13, fg),
		},
		'tunnel-street-*': {
			color: c.roadStreet.blend(0.03, fg),
		},
		'bridge-street-*:outline': {
			color: c.roadStreet.blend(0.15, fg),
		},

		// ── Streets and ways — line caps ─────────────────────────────────────────

		'{tunnel-,}{street,way}-*': {
			lineCap: 'round',
		},
		'{tunnel-,}{street,way}-*:outline': {
			lineCap: 'round',
		},
		'bridge-{street,way}-*': {
			lineCap: 'butt',
		},
		'bridge-{street,way}-*:outline': {
			lineCap: 'butt',
		},

		// ── Bridge deck fills ────────────────────────────────────────────────────

		'bridge-{street,way}-*:bridge': {
			lineCap: 'butt',
			lineJoin: 'round',
			color: c.land.blend(0.02, fg),
			fillAntialias: true,
			opacity: 0.5,
		},
		'bridge-street-motorway:bridge': {
			size: { 5: 0, 6: 3, 10: 7, 14: 7, 16: 20, 18: 53, 19: 118, 20: 235 },
		},
		'bridge-street-trunk:bridge': {
			size: { 7: 0, 8: 3, 10: 6, 14: 8, 16: 17, 18: 50, 19: 104, 20: 202 },
		},
		'bridge-street-primary:bridge': {
			size: { 8: 0, 9: 1, 10: 6, 14: 8, 16: 17, 18: 50, 19: 104, 20: 202 },
		},
		'bridge-street-secondary:bridge': {
			size: { 11: 3, 14: 7, 16: 11, 18: 42, 19: 95, 20: 193 },
			opacity: { 11: 0, 12: 1 },
		},
		'bridge-street-motorway-link:bridge': {
			minzoom: 12,
			size: { 12: 3, 14: 4, 16: 10, 18: 20, 20: 56 },
		},
		'bridge-street-{trunk,primary,secondary}-link:bridge': {
			minzoom: 13,
			size: { 12: 3, 14: 4, 16: 10, 18: 20, 20: 56 },
		},
		'bridge-street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*:bridge': {
			size: { 12: 3, 14: 4, 16: 8, 18: 36, 19: 90, 20: 179 },
			opacity: { 12: 0, 13: 1 },
		},
		'bridge-street-{service,track}:bridge': {
			size: { 14: 3, 16: 6, 18: 25, 19: 67, 20: 134 },
			opacity: { 14: 0, 15: 1 },
		},
		'bridge-way-*:bridge': {
			size: { 15: 0, 16: 7, 18: 10, 19: 17, 20: 31 },
			minzoom: 15,
		},

		// ── Motorway / trunk colors ───────────────────────────────────────────────

		'{bridge-,}street-motorway{-link,}:outline': {
			color: c.roadMotorwayBg,
		},
		'{bridge-,}street-motorway{-link,}': {
			color: c.roadMotorway,
		},
		'{bridge-,}street-{trunk,primary,secondary}{-link,}:outline': {
			color: c.roadTrunkBg,
		},
		'{bridge-,}street-{trunk,primary,secondary}{-link,}': {
			color: c.roadTrunk,
		},
		'tunnel-street-motorway{-link,}:outline': {
			color: c.roadMotorwayBg.blend(0.05, bg),
			lineDasharray: [1, 0.3],
		},
		'tunnel-street-motorway{-link,}': {
			color: c.roadMotorway.blend(0.1, bg),
			lineCap: 'butt',
		},
		'tunnel-street-{trunk,primary,secondary}{-link,}:outline': {
			color: c.roadTrunkBg.blend(0.05, bg),
			lineDasharray: [1, 0.3],
		},
		'tunnel-street-{trunk,primary,secondary}{-link,}': {
			color: c.roadTrunk.blend(0.1, bg),
			lineCap: 'butt',
		},

		// ── Road widths ───────────────────────────────────────────────────────────

		'{bridge-,tunnel-,}street-motorway:outline': {
			size: { 5: 0, 6: 2, 10: 5, 14: 5, 16: 14, 18: 38, 19: 84, 20: 168 },
		},
		'{bridge-,tunnel-,}street-motorway': {
			size: { 5: 0, 6: 1, 10: 4, 14: 4, 16: 12, 18: 36, 19: 80, 20: 160 },
			opacity: { 5: 0, 6: 1 },
		},
		'{bridge-,tunnel-,}street-trunk:outline': {
			size: { 6: 0, 7: 2, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
		},
		'{bridge-,tunnel-,}street-trunk': {
			size: { 6: 0, 7: 1, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
			opacity: { 6: 0, 7: 1 },
		},
		'{bridge-,tunnel-,}street-primary:outline': {
			size: { 8: 0, 9: 1, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 },
		},
		'{bridge-,tunnel-,}street-primary': {
			size: { 8: 0, 9: 2, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 },
			opacity: { 8: 0, 9: 1 },
		},
		'{bridge-,tunnel-,}street-secondary:outline': {
			size: { 11: 2, 14: 5, 16: 8, 18: 30, 19: 68, 20: 138 },
			opacity: { 11: 0, 12: 1 },
		},
		'{bridge-,tunnel-,}street-secondary': {
			size: { 11: 1, 14: 4, 16: 6, 18: 28, 19: 64, 20: 130 },
			opacity: { 11: 0, 12: 1 },
		},

		// ── Road links ────────────────────────────────────────────────────────────

		'{bridge-,tunnel-,}street-motorway-link:outline': {
			minzoom: 12,
			size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
		},
		'{bridge-,tunnel-,}street-motorway-link': {
			minzoom: 12,
			size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
		},
		'{bridge-,tunnel-,}street-{trunk,primary,secondary}-link:outline': {
			minzoom: 13,
			size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 },
		},
		'{bridge-,tunnel-,}street-{trunk,primary,secondary}-link': {
			minzoom: 13,
			size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 },
		},

		// ── Minor streets ─────────────────────────────────────────────────────────

		'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*:outline': {
			size: { 12: 2, 14: 3, 16: 6, 18: 26, 19: 64, 20: 128 },
			opacity: { 12: 0, 13: 1 },
		},
		'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}*': {
			size: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
			opacity: { 12: 0, 13: 1 },
		},

		// ── Tracks ────────────────────────────────────────────────────────────────

		'{bridge-,tunnel-,}street-track:outline': {
			size: { 14: 2, 16: 4, 18: 18, 19: 48, 20: 96 },
			opacity: { 14: 0, 15: 1 },
		},
		'{bridge-,tunnel-,}street-track': {
			size: { 14: 1, 16: 3, 18: 16, 19: 44, 20: 88 },
			opacity: { 14: 0, 15: 1 },
		},

		// ── Service / bus roads ───────────────────────────────────────────────────

		'{bridge-,tunnel-,}street-{service,busway,busguideway}:outline': {
			size: { 14: 1, 16: 3, 18: 12, 19: 32, 20: 48 },
			opacity: { 15: 0, 16: 1 },
			color: c.roadStreetBg.blend(0.3, bg),
		},
		'{bridge-,tunnel-,}street-{service,busway,busguideway}': {
			size: { 14: 1, 16: 2, 18: 10, 19: 28, 20: 40 },
			opacity: { 15: 0, 16: 1 },
			color: c.roadStreet.blend(0.03, fg),
		},

		// ── Ways (footways, paths, cycleways) ────────────────────────────────────

		'{bridge-,tunnel-,}way-*:outline': {
			size: { 15: 0, 16: 5, 18: 7, 19: 12, 20: 22 },
			minzoom: 15,
		},
		'{bridge-,tunnel-,}way-*': {
			size: { 15: 0, 16: 4, 18: 6, 19: 10, 20: 20 },
			minzoom: 15,
		},
		'{bridge-,}way-{footway,path,steps}:outline': {
			color: c.transitFoot.blend(0.1, fg),
		},
		'{bridge-,}way-{footway,path,steps}': {
			color: c.transitFoot.blend(0.02, bg),
		},
		'tunnel-way-{footway,path,steps}:outline': {
			color: c.transitFoot.blend(0.1, fg).saturate(-0.5),
		},
		'tunnel-way-{footway,path,steps}': {
			color: c.transitFoot.blend(0.02, fg).saturate(-0.5),
			lineDasharray: [1, 0.2],
		},
		'{bridge-,}way-cycleway:outline': {
			color: c.transitCycle.blend(0.1, fg),
		},
		'{bridge-,}way-cycleway': {
			color: c.transitCycle,
		},
		'tunnel-way-cycleway:outline': {
			color: c.transitCycle.blend(0.1, fg).saturate(-0.5),
		},
		'tunnel-way-cycleway': {
			color: c.transitCycle.blend(0.02, fg).saturate(-0.5),
			lineDasharray: [1, 0.2],
		},

		// ── Cycle overlay on streets ──────────────────────────────────────────────

		'{bridge-,tunnel-,}street-{tertiary,tertiary-link,unclassified,residential,livingstreet,pedestrian}-bicycle': {
			lineJoin: 'round',
			lineCap: 'round',
			color: c.transitCycle,
		},

		// ── Pedestrian streets ────────────────────────────────────────────────────

		'street-pedestrian': {
			size: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
			opacity: { 13: 0, 14: 1 },
			color: c.transitFoot,
		},
		'street-pedestrian-zone': {
			color: c.transitFoot.blend(0.02, bg).fade(0.75),
			opacity: { 14: 0, 15: 1 },
		},

		// ── Rail ──────────────────────────────────────────────────────────────────

		'{tunnel-,bridge-,}transport-{rail,lightrail}:outline': {
			color: c.transitRail,
			minzoom: 8,
			size: { 8: 1, 13: 1, 15: 1, 20: 14 },
		},
		'{tunnel-,bridge-,}transport-{rail,lightrail}': {
			color: c.transitRail.blend(0.25, bg),
			minzoom: 14,
			size: { 14: 0, 15: 1, 20: 10 },
			lineDasharray: [2, 2],
		},
		'{tunnel-,bridge-,}transport-{rail,lightrail}-service:outline': {
			color: c.transitRail,
			minzoom: 14,
			size: { 14: 0, 15: 1, 16: 1, 20: 14 },
		},
		'{tunnel-,bridge-,}transport-{rail,lightrail}-service': {
			color: c.transitRail.blend(0.25, bg),
			minzoom: 15,
			size: { 15: 0, 16: 1, 20: 10 },
			lineDasharray: [2, 2],
		},

		// ── Subway ────────────────────────────────────────────────────────────────

		'{tunnel-,bridge-,}transport-subway:outline': {
			color: c.transitSubway,
			size: { 11: 0, 12: 1, 15: 3, 16: 3, 18: 6, 19: 8, 20: 10 },
		},
		'{tunnel-,bridge-,}transport-subway': {
			color: c.transitSubway.blend(0.25, bg),
			size: { 11: 0, 12: 1, 15: 2, 16: 2, 18: 5, 19: 6, 20: 8 },
			lineDasharray: [2, 2],
		},

		// ── Tram / narrow gauge / funicular / monorail ───────────────────────────

		'{tunnel-,bridge-,}transport-{tram,narrowgauge,funicular,monorail}:outline': {
			minzoom: 15,
			color: c.transitRail,
			size: { 15: 0, 16: 5, 18: 7, 20: 20 },
			lineDasharray: [0.1, 0.5],
		},
		'{tunnel-,bridge-,}transport-{tram,narrowgauge,funicular,monorail}': {
			minzoom: 13,
			size: { 13: 0, 16: 1, 17: 2, 18: 3, 20: 5 },
			color: c.transitRail,
		},

		// ── Rail opacity (surface / bridge) ──────────────────────────────────────

		'{bridge-,}transport-rail:outline': {
			opacity: { 8: 0, 9: 1 },
		},
		'{bridge-,}transport-rail': {
			opacity: { 14: 0, 15: 1 },
		},
		'{bridge-,}transport-{lightrail,subway}:outline': {
			opacity: { 11: 0, 12: 1 },
		},
		'{bridge-,}transport-{lightrail,subway}': {
			opacity: { 14: 0, 15: 1 },
		},

		// ── Rail opacity (tunnel) ─────────────────────────────────────────────────

		'tunnel-transport-rail:outline': {
			opacity: { 8: 0, 9: 0.3 },
		},
		'tunnel-transport-rail': {
			opacity: { 14: 0, 15: 0.3 },
		},
		'tunnel-transport-{lightrail,subway}:outline': {
			opacity: { 11: 0, 12: 0.5 },
		},
		'tunnel-transport-{lightrail,subway}': {
			opacity: { 14: 0, 15: 1 },
		},

		// ── Ferry ─────────────────────────────────────────────────────────────────

		'transport-ferry': {
			minzoom: 10,
			color: c.water.blend(0.1, fg),
			size: { 10: 1, 13: 2, 14: 3, 16: 4, 17: 6 },
			opacity: { 10: 0, 11: 1 },
			lineDasharray: [1, 1],
		},

		// ── Country / state labels ────────────────────────────────────────────────

		'label-boundary-*': {
			color: c.label,
			font: fonts.normal,
			textTransform: 'uppercase',
			textHaloColor: c.labelHalo,
			textHaloWidth: 2,
			textHaloBlur: 1,
			textAnchor: 'top',
			textOffset: [0, 0.2],
			textPadding: 0,
			textOptional: true,
		},
		'label-boundary-country-large': {
			minzoom: 2,
			size: { 2: 8, 5: 13 },
		},
		'label-boundary-country-medium': {
			minzoom: 3,
			size: { 3: 8, 5: 12 },
		},
		'label-boundary-country-small': {
			minzoom: 4,
			size: { 4: 8, 5: 11 },
		},
		'label-boundary-state': {
			minzoom: 5,
			color: c.label.blend(0.05, bg),
			size: { 5: 8, 8: 12 },
		},

		// ── Place labels ──────────────────────────────────────────────────────────

		'label-place-*': {
			color: c.label.rotateHue(-15).saturate(1).blend(0.05, fg),
			font: fonts.normal,
			textHaloColor: c.labelHalo,
			textHaloWidth: 2,
			textHaloBlur: 1,
		},
		'label-place-capital': {
			minzoom: 5,
			size: { 5: 12, 10: 16 },
		},
		'label-place-statecapital': {
			minzoom: 6,
			size: { 6: 11, 10: 15 },
		},
		'label-place-city': {
			minzoom: 7,
			size: { 7: 11, 10: 14 },
		},
		'label-place-town': {
			minzoom: 9,
			size: { 8: 11, 12: 14 },
		},
		'label-place-village': {
			minzoom: 11,
			size: { 9: 11, 12: 14 },
		},
		'label-place-hamlet': {
			minzoom: 13,
			size: { 10: 11, 12: 14 },
		},
		'label-place-suburb': {
			minzoom: 11,
			size: { 11: 11, 13: 14 },
			textTransform: 'uppercase',
			color: c.label.rotateHue(-30).saturate(1).blend(0.05, fg),
		},
		'label-place-quarter': {
			minzoom: 13,
			size: { 13: 13 },
			textTransform: 'uppercase',
			color: c.label.rotateHue(-40).saturate(1).blend(0.05, fg),
		},
		'label-place-neighbourhood': {
			minzoom: 14,
			size: { 14: 12 },
			textTransform: 'uppercase',
			color: c.label.rotateHue(-50).saturate(1).blend(0.05, fg),
		},

		// ── Motorway shield ───────────────────────────────────────────────────────

		'label-motorway-shield': {
			color: c.labelShield,
			font: fonts.bold,
			textHaloColor: c.roadMotorway,
			textHaloWidth: 0.1,
			textHaloBlur: 1,
			symbolPlacement: 'line',
			textAnchor: 'center',
			minzoom: 14,
			size: { 14: 10, 18: 12, 20: 16 },
		},

		// ── Street labels ─────────────────────────────────────────────────────────

		'label-street-*': {
			color: c.label,
			font: fonts.normal,
			textHaloColor: c.labelHalo,
			textHaloWidth: 2,
			textHaloBlur: 1,
			symbolPlacement: 'line',
			textAnchor: 'center',
			minzoom: 12,
			size: { 12: 10, 15: 13 },
		},

		// ── House numbers ─────────────────────────────────────────────────────────

		'label-address-housenumber': {
			font: fonts.normal,
			color: c.land.invertLuminosity().fade(0.7),
			symbolPlacement: 'point',
			textAnchor: 'center',
			minzoom: 17,
			size: { 17: 8, 19: 10 },
		},

		// ── Road markings ─────────────────────────────────────────────────────────

		'marking-oneway{-reverse,}': {
			minzoom: 16,
			image: 'basics:marking-arrow',
			opacity: { 16: 0, 17: 0.4, 20: 0.4 },
			font: fonts.normal,
		},

		// ── Transit stop symbols ──────────────────────────────────────────────────

		'symbol-*': {
			iconSize: 1,
			symbolPlacement: 'point',
			iconOpacity: 0.7,
			iconKeepUpright: true,
			font: fonts.normal,
			size: 10,
			color: c.labelSymbol,
			iconAnchor: 'bottom',
			textAnchor: 'top',
			textHaloColor: c.labelHalo,
			textHaloWidth: 2,
			textHaloBlur: 1,
		},
		'symbol-transit-airport': {
			minzoom: 12,
			image: 'basics:icon-airport',
			iconSize: { 12: 0.5, 14: 1 },
		},
		'symbol-transit-airfield': {
			minzoom: 13,
			image: 'basics:icon-airfield',
			iconSize: { 13: 0.5, 15: 1 },
		},
		'symbol-transit-station': {
			minzoom: 13,
			image: 'basics:icon-rail',
			iconSize: { 13: 0.5, 15: 1 },
		},
		'symbol-transit-lightrail': {
			minzoom: 14,
			image: 'basics:icon-rail_light',
			iconSize: { 14: 0.5, 16: 1 },
		},
		'symbol-transit-subway': {
			minzoom: 14,
			image: 'basics:icon-rail_metro',
			iconSize: { 14: 0.5, 16: 1 },
		},
		'symbol-transit-tram': {
			minzoom: 15,
			image: 'basics:transport-tram',
			iconSize: { 15: 0.5, 17: 1 },
		},
		'symbol-transit-bus': {
			minzoom: 16,
			image: 'basics:icon-bus',
			iconSize: { 16: 0.5, 18: 1 },
		},

		// ── POIs ─────────────────────────────────────────────────────────────────

		'poi-*': {
			minzoom: 16,
			iconSize: { 16: 0.5, 19: 0.5, 20: 1 },
			opacity: { 16: 0, 17: 0.4 },
			symbolPlacement: 'point',
			iconOptional: true,
			font: fonts.normal,
			color: c.labelPoi,
		},
		'poi-amenity': {
			image: [
				'match',
				['get', 'amenity'],
				'arts_centre',
				'basics:icon-art_gallery',
				'atm',
				'basics:icon-atm',
				'bank',
				'basics:icon-bank',
				'bar',
				'basics:icon-bar',
				'bench',
				'basics:icon-bench',
				'bicycle_rental',
				'basics:icon-bicycle_share',
				'biergarten',
				'basics:icon-beergarden',
				'cafe',
				'basics:icon-cafe',
				'car_rental',
				'basics:icon-car_rental',
				'car_sharing',
				'basics:icon-car_rental',
				'car_wash',
				'basics:icon-car_wash',
				'cinema',
				'basics:icon-cinema',
				'college',
				'basics:icon-college',
				'community_centre',
				'basics:icon-community',
				'dentist',
				'basics:icon-dentist',
				'doctors',
				'basics:icon-doctor',
				'dog_park',
				'basics:icon-dog_park',
				'drinking_water',
				'basics:icon-drinking_water',
				'embassy',
				'basics:icon-embassy',
				'fast_food',
				'basics:icon-fast_food',
				'fire_station',
				'basics:icon-fire_station',
				'fountain',
				'basics:icon-fountain',
				'grave_yard',
				'basics:icon-cemetery',
				'hospital',
				'basics:icon-hospital',
				'hunting_stand',
				'basics:icon-huntingstand',
				'library',
				'basics:icon-library',
				'marketplace',
				'basics:icon-marketplace',
				'nightclub',
				'basics:icon-nightclub',
				'nursing_home',
				'basics:icon-nursinghome',
				'pharmacy',
				'basics:icon-pharmacy',
				'place_of_worship',
				'basics:icon-place_of_worship',
				'playground',
				'basics:icon-playground',
				'police',
				'basics:icon-police',
				'post_box',
				'basics:icon-postbox',
				'post_office',
				'basics:icon-post',
				'prison',
				'basics:icon-prison',
				'pub',
				'basics:icon-beer',
				'recycling',
				'basics:icon-recycling',
				'restaurant',
				'basics:icon-restaurant',
				'school',
				'basics:icon-school',
				'shelter',
				'basics:icon-shelter',
				'telephone',
				'basics:icon-telephone',
				'theatre',
				'basics:icon-theatre',
				'toilets',
				'basics:icon-toilet',
				'townhall',
				'basics:icon-town_hall',
				'vending_machine',
				'basics:icon-vendingmachine',
				'veterinary',
				'basics:icon-veterinary',
				'waste_basket',
				'basics:icon-waste_basket',
				'',
			],
		},
		'poi-leisure': {
			image: [
				'match',
				['get', 'leisure'],
				'golf_course',
				'basics:icon-golf',
				'ice_rink',
				'basics:icon-icerink',
				'pitch',
				'basics:icon-pitch',
				'stadium',
				'basics:icon-stadium',
				'swimming_pool',
				'basics:icon-swimming',
				'water_park',
				'basics:icon-waterpark',
				'basics:icon-sports',
			],
		},
		'poi-tourism': {
			image: [
				'match',
				['get', 'tourism'],
				'chalet',
				'basics:icon-chalet',
				'information',
				'basics:transport-information',
				'picnic_site',
				'basics:icon-picnic_site',
				'viewpoint',
				'basics:icon-viewpoint',
				'zoo',
				'basics:icon-zoo',
				'',
			],
		},
		'poi-shop': {
			image: [
				'match',
				['get', 'shop'],
				'alcohol',
				'basics:icon-alcohol_shop',
				'bakery',
				'basics:icon-bakery',
				'beauty',
				'basics:icon-beauty',
				'beverages',
				'basics:icon-beverages',
				'books',
				'basics:icon-books',
				'butcher',
				'basics:icon-butcher',
				'chemist',
				'basics:icon-chemist',
				'clothes',
				'basics:icon-clothes',
				'doityourself',
				'basics:icon-doityourself',
				'dry_cleaning',
				'basics:icon-drycleaning',
				'florist',
				'basics:icon-florist',
				'furniture',
				'basics:icon-furniture',
				'garden_centre',
				'basics:icon-garden_centre',
				'general',
				'basics:icon-shop',
				'gift',
				'basics:icon-gift',
				'greengrocer',
				'basics:icon-greengrocer',
				'hairdresser',
				'basics:icon-hairdresser',
				'hardware',
				'basics:icon-hardware',
				'jewelry',
				'basics:icon-jewelry_store',
				'kiosk',
				'basics:icon-kiosk',
				'laundry',
				'basics:icon-laundry',
				'newsagent',
				'basics:icon-newsagent',
				'optican',
				'basics:icon-optician',
				'outdoor',
				'basics:icon-outdoor',
				'shoes',
				'basics:icon-shoes',
				'sports',
				'basics:icon-sports',
				'stationery',
				'basics:icon-stationery',
				'toys',
				'basics:icon-toys',
				'travel_agency',
				'basics:icon-travel_agent',
				'video',
				'basics:icon-video',
				'basics:icon-shop',
			],
		},
		'poi-man_made': {
			image: [
				'match',
				['get', 'man_made'],
				'lighthouse',
				'basics:icon-lighthouse',
				'surveillance',
				'basics:icon-surveillance',
				'tower',
				'basics:icon-observation_tower',
				'watermill',
				'basics:icon-watermill',
				'windmill',
				'basics:icon-windmill',
				'',
			],
		},
		'poi-historic': {
			image: [
				'match',
				['get', 'historic'],
				'artwork',
				'basics:icon-artwork',
				'castle',
				'basics:icon-castle',
				'monument',
				'basics:icon-monument',
				'wayside_shrine',
				'basics:icon-shrine',
				'basics:icon-historic',
			],
		},
		'poi-emergency': {
			image: [
				'match',
				['get', 'emergency'],
				'defibrillator',
				'basics:icon-defibrillator',
				'fire_hydrant',
				'basics:icon-hydrant',
				'phone',
				'basics:icon-emergency_phone',
				'',
			],
		},
	};
}

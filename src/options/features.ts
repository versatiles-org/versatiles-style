import { checkKeys } from './keys.js';
import type { HillshadeOptions, ResolvedHillshade } from './features-hillshade.js';
import { resolveHillshade } from './features-hillshade.js';
import { ResolvedTerrain, resolveTerrain, TerrainOptions } from './features-terrain.js';

export type SatelliteFeaturesOptions = {
	terrain?: TerrainOptions;
	hillshade?: HillshadeOptions;
};

export type OsmFeaturesOptions = {
	terrain?: TerrainOptions;
	hillshade?: HillshadeOptions;
	landcover?: boolean;
	buildings?: 'flat' | 'extruded';
};

export type ResolvedSatelliteFeatures = {
	terrain: ResolvedTerrain;
	hillshade: ResolvedHillshade;
};

export type ResolvedOsmFeatures = {
	terrain: ResolvedTerrain;
	hillshade: ResolvedHillshade;
	landcover: boolean;
	buildings: 'flat' | 'extruded';
};

export function resolveOsmFeatures(features?: OsmFeaturesOptions, path = 'features'): ResolvedOsmFeatures {
	checkKeys(features, { terrain: true, hillshade: true, landcover: true, buildings: true }, path);
	return {
		terrain: resolveTerrain(features?.terrain, `${path}.terrain`),
		hillshade: resolveHillshade(features?.hillshade, `${path}.hillshade`),
		landcover: features?.landcover ?? false,
		buildings: features?.buildings ?? 'flat',
	};
}

export function resolveSatelliteFeatures(
	features?: SatelliteFeaturesOptions,
	path = 'features'
): ResolvedSatelliteFeatures {
	checkKeys(features, { terrain: true, hillshade: true }, path);
	return {
		terrain: resolveTerrain(features?.terrain, `${path}.terrain`),
		hillshade: resolveHillshade(features?.hillshade, `${path}.hillshade`),
	};
}

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

export function resolveOsmFeatures(features?: OsmFeaturesOptions): ResolvedOsmFeatures {
	return {
		terrain: resolveTerrain(features?.terrain),
		hillshade: resolveHillshade(features?.hillshade),
		landcover: features?.landcover ?? false,
		buildings: features?.buildings ?? 'flat',
	};
}

export function resolveSatelliteFeatures(features?: SatelliteFeaturesOptions): ResolvedSatelliteFeatures {
	return {
		terrain: resolveTerrain(features?.terrain),
		hillshade: resolveHillshade(features?.hillshade),
	};
}

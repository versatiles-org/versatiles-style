import type { HillshadeOptions, ResolvedHillshade } from './hillshade.js';
import { resolveHillshade } from './hillshade.js';

export type TerrainOption = boolean | { exaggeration?: number };
export type ResolvedTerrain = false | { exaggeration: number };

export type OsmFeaturesOptions = {
	terrain?: TerrainOption;
	hillshade?: HillshadeOptions;
	landcover?: boolean;
	buildings?: 'flat' | 'extruded';
};

export type SatelliteFeaturesOptions = {
	terrain?: TerrainOption;
	hillshade?: HillshadeOptions;
};

export type ResolvedOsmFeatures = {
	terrain: ResolvedTerrain;
	hillshade: ResolvedHillshade;
	landcover: boolean;
	buildings: 'flat' | 'extruded';
};

export type ResolvedSatelliteFeatures = {
	terrain: ResolvedTerrain;
	hillshade: ResolvedHillshade;
};

export function resolveTerrain(terrain?: TerrainOption): ResolvedTerrain {
	if (!terrain) return false;
	return { exaggeration: (typeof terrain === 'object' ? terrain.exaggeration : undefined) ?? 1.0 };
}

export function resolveOsmFeatures(features?: OsmFeaturesOptions): ResolvedOsmFeatures {
	return {
		terrain: resolveTerrain(features?.terrain),
		hillshade: resolveHillshade(features?.hillshade),
		landcover: features?.landcover ?? false,
		buildings: features?.buildings ?? 'flat',
	};
}

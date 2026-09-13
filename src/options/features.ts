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

export type OmtFeaturesOptions = {
	terrain?: TerrainOptions;
	hillshade?: HillshadeOptions;
	buildings?: 'flat' | 'extruded';
};

export type ResolvedOmtFeatures = {
	terrain: ResolvedTerrain;
	hillshade: ResolvedHillshade;
	buildings: 'flat' | 'extruded';
};

/** Identical to the OpenMapTiles set; aliased so each schema names its own option type. */
export type ProtomapsFeaturesOptions = OmtFeaturesOptions;
export type ResolvedProtomapsFeatures = ResolvedOmtFeatures;

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

/**
 * OpenMapTiles features. Identical to the OSM set minus `landcover`: that option exists for the
 * Shortbread low-zoom landcover extension, which is a property of the VersaTiles tileset and has no
 * OpenMapTiles counterpart. Leaving it out means `omt({ features: { landcover: true } })` throws an
 * unknown-key error rather than silently doing nothing (SCHEMA-SUPPORT-PLAN.md §5.3, risk 3).
 */
export function resolveOmtFeatures(features?: OmtFeaturesOptions, path = 'features'): ResolvedOmtFeatures {
	checkKeys(features, { terrain: true, hillshade: true, buildings: true }, path);
	return {
		terrain: resolveTerrain(features?.terrain, `${path}.terrain`),
		hillshade: resolveHillshade(features?.hillshade, `${path}.hillshade`),
		buildings: features?.buildings ?? 'flat',
	};
}

/** Protomaps features — the same set as OpenMapTiles', and for the same reason: no `landcover`. */
export function resolveProtomapsFeatures(
	features?: ProtomapsFeaturesOptions,
	path = 'features'
): ResolvedProtomapsFeatures {
	return resolveOmtFeatures(features, path);
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

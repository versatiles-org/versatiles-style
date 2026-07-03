export type { Palette, ThemeOptions, ResolvedTheme } from './theme.js';
export { isDarkMode, resolveTheme } from './theme.js';

export type { ColorsOptions, ResolvedColors } from './colors.js';
export { colorOptionsKeys, resolveColors } from './colors.js';

export type { RecolorOptions, ResolvedRecolor } from './recolor.js';
export { resolveRecolor } from './recolor.js';

export type { TextOptions, ResolvedText } from './text.js';
export { resolveText } from './text.js';

export type { LayoutOptions, ResolvedLayout } from './layout.js';
export { resolveLayout } from './layout.js';

export type { HillshadeOptions, ResolvedHillshade } from './features-hillshade.js';
export { resolveHillshade } from './features-hillshade.js';

export type { TerrainOptions, ResolvedTerrain } from './features-terrain.js';
export { resolveTerrain } from './features-terrain.js';

export type {
	OsmFeaturesOptions,
	SatelliteFeaturesOptions,
	ResolvedOsmFeatures,
	ResolvedSatelliteFeatures,
} from './features.js';
export { resolveOsmFeatures } from './features.js';

export type { SunOptions, ResolvedSun } from './sun.js';
export { resolveSun } from './sun.js';

export type { SkyOptions, ResolvedSky } from './sky.js';
export { resolveSky } from './sky.js';

export type { SpriteEntries } from './sprite.js';
export { resolveSprite } from './sprite.js';

export type { LayerGroupOptions, ResolvedLayerGroups } from './layer-groups.js';
export { resolveLayerGroups } from './layer-groups.js';

export type {
	FetchLike,
	OsmUrlsOptions,
	SatelliteUrlsOptions,
	ResolvedOsmUrls,
	ResolvedSatelliteUrls,
} from './urls.js';
export { DEFAULT_BASE, resolveBase, resolveOsmUrls, resolveSatelliteUrls } from './urls.js';

export type { OsmOptions, ResolvedOsm } from './osm.js';
export { resolveOsm } from './osm.js';

export type { OsmOverlayOptions, ResolvedOsmOverlay } from './osm-overlay.js';
export { resolveOsmOverlay } from './osm-overlay.js';

export type { SatelliteRasterOptions, ResolvedSatelliteRaster } from './satellite-raster.js';
export { resolveSatelliteRaster } from './satellite-raster.js';

export type { SatelliteOptions, ResolvedSatellite } from './satellite.js';
export { resolveSatellite } from './satellite.js';

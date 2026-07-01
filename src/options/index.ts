export type { Palette, ResolvedTheme } from './theme.js';
export { isDarkMode, resolveTheme } from './theme.js';

export type { ColorsOptions, ResolvedColors } from './colors.js';
export { colorOptionsKeys, resolveColors } from './colors.js';

export type { RecolorOptions, ResolvedRecolorOptions } from './recolor.js';
export { resolveRecolor } from './recolor.js';

export type { TextOptions, ResolvedText } from './text.js';
export { resolveText } from './text.js';

export type { LayoutOptions, ResolvedLayout } from './layout.js';
export { resolveLayout } from './layout.js';

export type { HillshadeOptions, ResolvedHillshade } from './features-hillshade.js';
export { resolveHillshade } from './features-hillshade.js';

export type { TerrainOption, ResolvedTerrain } from './features-terrain.js';
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

export type { SpriteEntry, SpriteInput } from './sprite.js';
export { resolveSprite } from './sprite.js';

export type { LayerGroupOptions } from './layer-groups.js';

export type {
	FetchLike,
	OsmUrlsOptions,
	SatelliteUrlsOptions,
	ResolvedOsmUrls as ResolvedUrls,
	ResolvedSatelliteUrls,
} from './urls.js';
export { DEFAULT_BASE, resolveBase, resolveOsmUrls, resolveSatelliteUrls } from './urls.js';

export type { OsmOptions, ResolvedOsmOptions } from './osm.js';
export { resolveOsmOptions } from './osm.js';

export type { OsmContentOptions, ResolvedOsmContentOptions } from './osm-content.js';
export { resolveOsmContentOptions } from './osm-content.js';

export type { SatelliteRasterOptions, ResolvedSatelliteRasterOptions } from './satellite-raster.js';
export { resolveSatelliteRasterOptions } from './satellite-raster.js';

export type { SatelliteOptions, ResolvedSatelliteOptions } from './satellite.js';
export { resolveSatelliteOptions } from './satellite.js';

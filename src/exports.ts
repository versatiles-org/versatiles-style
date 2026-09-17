/**
 * Everything both entry points expose. `index.ts` (npm) adds the authoring helpers on top;
 * `browser.ts` (the CDN bundle) does not — see the note in each.
 */

// ── v6 API (new) ──────────────────────────────────────────────────────────────

export { guessStyle, guessSchema, inspectorStyle } from './api/index.js';
export type { GuessStyleOptions, InspectorStyleOptions, SchemaGuess, SchemaName, SchemaScore } from './api/index.js';

// ── v6 types ──────────────────────────────────────────────────────────────────

export type {
	// ── Core types ──
	FetchLike,
	Palette,
	SpriteEntries,
	TileSource,

	// ── Input option types ──
	ColorsOptions,
	FontName,
	HillshadeOptions,
	IconOptions,
	LabelStyle,
	LayerGroupOptions,
	OsmFeaturesOptions,
	OsmOptions,
	OsmOverlayOptions,
	OsmUrlsOptions,
	PitchAlignment,
	ProjectionOptions,
	RecolorOptions,
	SatelliteFeaturesOptions,
	SatelliteOptions,
	SatelliteRasterOptions,
	SatelliteUrlsOptions,
	SkyOptions,
	SunOptions,
	TerrainOptions,
	TextOptions,
	TextTopic,
	TextTransform,
	ThemeOptions,

	// ── Resolved option types ──
	ResolvedColors,
	ResolvedHillshade,
	ResolvedIcon,
	ResolvedLabelStyle,
	ResolvedLayerGroups,
	ResolvedOsm,
	ResolvedOsmFeatures,
	ResolvedOsmOverlay,
	ResolvedOsmUrls,
	ResolvedProjection,
	ResolvedRecolor,
	ResolvedSatellite,
	ResolvedSatelliteFeatures,
	ResolvedSatelliteRaster,
	ResolvedSatelliteUrls,
	ResolvedSky,
	ResolvedSun,
	ResolvedTerrain,
	ResolvedText,
	ResolvedTheme,
} from './options/index.js';
export { isDarkMode, labelLanguage } from './options/index.js';

export type {
	StyleSpecification,
	TileJSONSpecification,
	TileJSONSpecificationRaster,
	TileJSONSpecificationVector,
	VectorLayer,
} from './types/index.js';

export type { TextGroupMap, LayerGroupMap } from './shortbread/index.js';
/**
 * The shape a schema function carries so `guessStyle` can recognise its tileset — exported so a caller
 * can inject a schema of their own (`guessStyle(tj, { schemas: [mySchema] })`), not only `omt`.
 */
export type { SchemaBuilder, SchemaDescriptor, SchemaUrls } from './api/index.js';
export { inlineSources, fetchTileJSON } from './lib/index.js';
export { Color, ColorParseError } from './color/index.js';
export type { Channels, Coords, HueMethod, MixOptions, RandomColorOptions, Space } from './color/index.js';

export type { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';

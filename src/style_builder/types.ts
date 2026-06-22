import type { Color } from '../color/index.js';
import type { HillshadeOption, TerrainOption } from '../lib/elevation.js';
import type { RecolorOptions } from './recolor.js';
import { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';

/** Represents language suffixes used in map styles. */
export type Language = string | null;

/**
 * Options for activating experimental features.
 */
export interface ExperimentalOptions {
	/**
	 * Enable rendering of ESA WorldCover land cover data at low zoom levels (z0–z10),
	 * filling the gap before OSM `land` and `water_polygons` features appear.
	 * Requires a tileset that merges ESA WorldCover into those layers.
	 * See: https://github.com/versatiles-org/landcover-vectors
	 * @default false
	 */
	landcover?: boolean;

	/**
	 * Render buildings as true 3D extrusions using `height` and `min_height` attributes
	 * from the `building_heights` / `building_parts` Shortbread extensions.
	 * Replaces the flat fake-2.5D building style with `fill-extrusion` layers.
	 * See: https://docs.versatiles.org/compendium/specification_shortbread_extensions.html
	 * @default false
	 */
	buildingHeights?: boolean;

	/**
	 * Compass bearing of the light source for 3D building extrusions, in degrees clockwise from north.
	 * Only used when `buildingHeights` is enabled.
	 * When `hillshade` is also active and no explicit direction is set, the hillshade illumination
	 * direction is used automatically to keep both in sync.
	 * @default 315
	 */
	lightDirection?: number;

	/**
	 * Altitude of the light source for 3D building extrusions, in degrees above the horizon (0–90).
	 * Only used when `buildingHeights` is enabled.
	 * @default 45
	 */
	lightAltitude?: number;
}

/**
 * Options for configuring the style builder.
 */
export interface StyleBuilderOptions {
	[key: string]: unknown;

	/**
	 * The base URL for loading external resources like tiles, sprites, and fonts.
	 * @default document.location.origin (in the browser), or 'https://tiles.versatiles.org'
	 */
	baseUrl?: string;

	/**
	 * The bounding box for the map, formatted as [sw.lng, sw.lat, ne.lng, ne.lat].
	 * @default [-180, -85.0511287798066, 180, 85.0511287798066]
	 */
	bounds?: [number, number, number, number];

	/**
	 * The URL template for loading font glyphs, formatted with '{fontstack}' and '{range}' placeholders.
	 * @default '/assets/glyphs/{fontstack}/{range}.pbf'
	 */
	glyphs?: string;

	/**
	 * The URL for loading sprite images and metadata.
	 * @default [{ id: 'basics', url: '/assets/sprites/basics/sprites' }]
	 */
	sprite?: SpriteSpecification;

	/**
	 * An array of URL templates for loading map tiles, using '{z}', '{x}', and '{y}' placeholders.
	 * @default ['/tiles/osm/{z}/{x}/{y}']
	 */
	tiles?: string[];

	/**
	 * If set to true, hides all map labels.
	 * @default false
	 */
	hideLabels?: boolean;

	/**
	 * Multiplier applied to every symbol layer's `text-size`.
	 * Halo width, padding, line widths, and other non-text dimensions are not affected.
	 * @default 1
	 */
	textScale?: number;

	/**
	 * Multiplier applied to every symbol layer's `icon-size`.
	 * Symbol layers that have an `icon-image` but no explicit `icon-size` get `icon-size: iconScale`
	 * (MapLibre's spec default is 1).
	 * @default 1
	 */
	iconScale?: number;

	/**
	 * Set the language ('en', 'de', ...) of all map labels.
	 * A null value means that the language of the country in which the label is drawn will be used.
	 * See also: {@link Language}
	 * @default null
	 */
	language?: Language;

	/**
	 * When `true`, labels are shown only in the language set by `language` and left blank
	 * for features that have no translation in that language.
	 * When `false` (default), falls back to the local name and then English.
	 * Has no effect when `language` is null/empty.
	 * @default false
	 */
	languageStrict?: boolean;

	/**
	 * An object specifying overrides for default color values, keyed by the color names.
	 * See also: {@link StyleBuilderColors}
	 */
	colors?: Partial<StyleBuilderColors>;

	/**
	 * An object specifying overrides for default font names, keyed by the font names.
	 * See also: {@link StyleBuilderFonts}
	 */
	fonts?: Partial<StyleBuilderFonts>;

	/**
	 * Options for color adjustments and transformations applied to the entire style.
	 * See also: {@link RecolorOptions}
	 */
	recolor?: RecolorOptions;

	/**
	 * URL to elevation TileJSON used for terrain and hillshade.
	 * Defaults to `/tiles/elevation/tiles.json` (resolved against `baseUrl`) when terrain or hillshade is enabled.
	 * Only consulted if `terrain` or `hillshade` is set.
	 */
	elevationTilejson?: string;

	/**
	 * Enable 3D terrain. Pass `true` for defaults or an object for a custom exaggeration.
	 * When set, the returned style is a Promise because the elevation TileJSON must be fetched.
	 */
	terrain?: TerrainOption;

	/**
	 * Enable a hillshade layer. Pass `true` for defaults or an object for custom paint properties.
	 * When set, the returned style is a Promise because the elevation TileJSON must be fetched.
	 */
	hillshade?: HillshadeOption;

	/**
	 * Options for activating experimental features.
	 * @default {}
	 */
	experimental?: ExperimentalOptions;
}

export const styleBuilderColorKeys = [
	'agriculture',
	'boundary',
	'building',
	'buildingbg',
	'burial',
	'commercial',
	'construction',
	'cycle',
	'danger',
	'disputed',
	'education',
	'foot',
	'glacier',
	'grass',
	'hospital',
	'industrial',
	'label',
	'labelHalo',
	'land',
	'leisure',
	'motorway',
	'motorwaybg',
	'park',
	'parking',
	'poi',
	'prison',
	'rail',
	'residential',
	'rock',
	'sand',
	'shield',
	'street',
	'streetbg',
	'subway',
	'symbol',
	'trunk',
	'trunkbg',
	'waste',
	'water',
	'wetland',
	'wood',
] as const;
export type StyleBuilderColorKey = (typeof styleBuilderColorKeys)[number];

/** Records string values for color properties in a style builder. */
export type StyleBuilderColors<T = Color | string> = Record<StyleBuilderColorKey, T>;

/** Records string values for font properties in a style builder. */
export type StyleBuilderFonts = {
	regular: string;
	bold: string;
};

/** Defines options for style rules in a style builder. */
export interface StyleRulesOptions {
	/**
	 * The set of colors used in the style builder.
	 */
	colors: StyleBuilderColors<Color>;

	/**
	 * The set of fonts used in the style builder.
	 */
	fonts: StyleBuilderFonts;

	/**
	 * The language used for map labels.
	 */
	language: Language;

	/**
	 * Active experimental features.
	 */
	experimental: ExperimentalOptions;
}

/** Defines the value type for a style rule. */
export type StyleRuleValue = boolean | number | object | string;

/** Defines the structure of a style rule, which is a record of properties to style values. */
export type StyleRule = Record<string, StyleRuleValue | undefined>;

/** Defines the structure of style rules, which is a record of selectors to style rules. */
export type StyleRules = Record<string, StyleRule | undefined>;

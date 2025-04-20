import type { Color } from '../color/index.js';
import type { RecolorOptions } from './recolor.js';
import { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';

/** Represents language suffixes used in map styles. */
export type Language = 'de' | 'en' | null;

/** Options for configuring a style builder. */
export interface StyleBuilderOptions {
	/**
	 * The base URL for loading external resources like tiles, sprites, and fonts.
	 * Default: document.location.origin (in the browser), or 'https://tiles.versatiles.org'
	 */
	baseUrl?: string;

	/**
	 * The bounding box for the map, formatted as [sw.lng, sw.lat, ne.lng, ne.lat].
	 * Default: [-180, -85.0511287798066, 180, 85.0511287798066]
	 */
	bounds?: [number, number, number, number];

	/**
	 * The URL template for loading font glyphs, formatted with '{fontstack}' and '{range}' placeholders.
	 * Default: '/assets/glyphs/{fontstack}/{range}.pbf'
	 */
	glyphs?: string;

	/**
	 * The URL for loading sprite images and metadata.
	 * Default: [{ id: 'basics', url: '/assets/sprites/basics/sprites' }]
	 */
	sprite?: SpriteSpecification;

	/**
	 * An array of URL templates for loading map tiles, using '{z}', '{x}', and '{y}' placeholders.
	 * Default: ['/tiles/osm/{z}/{x}/{y}']
	 */
	tiles?: string[];

	/**
	 * If set to true, hides all map labels.
	 * Default: false
	 */
	hideLabels?: boolean;

	/**
	 * Set the language ('en', 'de') of all map labels.
	 * A null value means that the language of the country in which the label is drawn will be used.
	 * Default: null
	 */
	language?: Language;

	/**
	 * An object specifying overrides for default color values, keyed by the color names.
	 */
	colors?: Partial<StyleBuilderColors>;

	/**
	 * An object specifying overrides for default font names, keyed by the font names.
	 */
	fonts?: Partial<StyleBuilderFonts>;

	/**
	 * Options for color adjustments and transformations applied to the entire style.
	 */
	recolor?: RecolorOptions;
}

/** Records string values for color properties in a style builder. */
export interface StyleBuilderColors {
	agriculture: Color | string;
	boundary: Color | string;
	building: Color | string;
	buildingbg: Color | string;
	burial: Color | string;
	commercial: Color | string;
	construction: Color | string;
	cycle: Color | string;
	danger: Color | string;
	disputed: Color | string;
	education: Color | string;
	foot: Color | string;
	glacier: Color | string;
	grass: Color | string;
	hospital: Color | string;
	industrial: Color | string;
	label: Color | string;
	labelHalo: Color | string;
	land: Color | string;
	leisure: Color | string;
	motorway: Color | string;
	motorwaybg: Color | string;
	park: Color | string;
	parking: Color | string;
	poi: Color | string;
	prison: Color | string;
	rail: Color | string;
	residential: Color | string;
	rock: Color | string;
	sand: Color | string;
	shield: Color | string;
	street: Color | string;
	streetbg: Color | string;
	subway: Color | string;
	symbol: Color | string;
	trunk: Color | string;
	trunkbg: Color | string;
	waste: Color | string;
	water: Color | string;
	wetland: Color | string;
	wood: Color | string;
};

export type StyleBuilderColorsEnsured = Record<keyof StyleBuilderColors, Color>;

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
	colors: StyleBuilderColorsEnsured;

	/**
	 * The set of fonts used in the style builder.
	 */
	fonts: StyleBuilderFonts;

	/**
	 * The language used for map labels.
	 */
	language: Language;
}

/** Defines the value type for a style rule. */
export type StyleRuleValue = boolean | number | object | string;

/** Defines the structure of a style rule, which is a record of properties to style values. */
export type StyleRule = Record<string, StyleRuleValue | undefined>;

/** Defines the structure of style rules, which is a record of selectors to style rules. */
export type StyleRules = Record<string, StyleRule | undefined>;

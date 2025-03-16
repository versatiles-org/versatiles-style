import type { Color } from '../color/index.js';
import type { RecolorOptions } from './recolor.js';
import { SpriteSpecification } from '@maplibre/maplibre-gl-style-spec';

/** Represents language suffixes used in map styles. */
export type Language = 'de' | 'en' | null;

/**
 * Options for configuring the style builder.
 */
export interface StyleBuilderOptions {
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
	 * Set the language ('en', 'de') of all map labels.
	 * A null value means that the language of the country in which the label is drawn will be used.
	 * See also: {@link Language}
	 * @default null
	 */
	language?: Language;

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
}

export const styleBuilderColorKeys = ['agriculture', 'boundary', 'building', 'buildingbg', 'burial', 'commercial', 'construction', 'cycle', 'danger', 'disputed', 'education', 'foot', 'glacier', 'grass', 'hospital', 'industrial', 'label', 'labelHalo', 'land', 'leisure', 'motorway', 'motorwaybg', 'park', 'parking', 'poi', 'prison', 'rail', 'residential', 'rock', 'sand', 'shield', 'street', 'streetbg', 'subway', 'symbol', 'trunk', 'trunkbg', 'waste', 'water', 'wetland', 'wood'] as const;

export type StyleBuilderColorKey = typeof styleBuilderColorKeys[number];

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
}

/** Defines the value type for a style rule. */
export type StyleRuleValue = boolean | number | object | string;

/** Defines the structure of a style rule, which is a record of properties to style values. */
export type StyleRule = Record<string, StyleRuleValue | undefined>;

/** Defines the structure of style rules, which is a record of selectors to style rules. */
export type StyleRules = Record<string, StyleRule | undefined>;

import type Color from '../color/index.ts';
import type StyleBuilder from './style_builder.js';
import type { RecolorOptions } from './recolor.js';



/** Represents language suffixes used in map styles. */
export type Language = 'de' | 'en' | null;

export interface StyleBuilderOptions<T extends StyleBuilder<T>> {
	// The base URL for loading external resources like tiles, sprites, and fonts.
	// Default: document.location.origin (in the browser), or 'https://tiles.versatiles.org'
	baseUrl?: string;

	// The URL template for loading font glyphs, formatted with '{fontstack}' and '{range}' placeholders.
	// Default: '/assets/glyphs/{fontstack}/{range}.pbf'
	glyphs?: string;

	// The URL for loading sprite images and metadata.
	// Default: [{ id: 'basics', url: '/assets/sprites/basics/sprites' }]
	sprite?: string | { id: string; url: string }[];

	// An array of URL templates for loading map tiles, using '{z}', '{x}', and '{y}' placeholders.
	// Default: ['/tiles/osm/{z}/{x}/{y}']
	tiles?: string[];

	// If set to true, hides all map labels.
	// Default: false
	hideLabels?: boolean;

	// Set the language ('en', 'de') of all map labels.
	// A null value means that the language of the country in which the label is drawn will be used.
	// Default: null
	language?: Language;

	// An object specifying overrides for default color values, keyed by the color names.
	colors?: Partial<StyleBuilderColorStrings<T>>;

	// An object specifying overrides for default font names, keyed by the font names.
	fonts?: Partial<StyleBuilderFontStrings<T>>;

	// Options for color adjustments and transformations applied to the entire style.
	recolor?: RecolorOptions;
}

/** Defines the keys for color properties in a style builder. */
export type StyleBuilderColorKeys<T extends StyleBuilder<T>> = keyof T['defaultColors'];

/** Defines the keys for font properties in a style builder. */
export type StyleBuilderFontKeys<T extends StyleBuilder<T>> = keyof T['defaultFonts'];

/** Records string values for color properties in a style builder. */
export type StyleBuilderColorStrings<T extends StyleBuilder<T>> = Record<StyleBuilderColorKeys<T>, string>;

/** Records string values for font properties in a style builder. */
export type StyleBuilderFontStrings<T extends StyleBuilder<T>> = Record<StyleBuilderFontKeys<T>, string>;

/** Records Color objects for color properties in a style builder. */
export type StyleBuilderColors<T extends StyleBuilder<T>> = Record<StyleBuilderColorKeys<T>, Color>;

/** Records string values for font properties in a style builder. */
export type StyleBuilderFonts<T extends StyleBuilder<T>> = Record<StyleBuilderFontKeys<T>, string>;

/** Defines options for style rules in a style builder. */
export interface StyleRulesOptions<T extends StyleBuilder<T>> {
	colors: StyleBuilderColors<T>;
	fonts: StyleBuilderFontStrings<T>;
	language: Language;
}

/** Defines the value type for a style rule. */
export type StyleRuleValue = boolean | number | object | string;

/** Defines the structure of a style rule, which is a record of properties to style values. */
export type StyleRule = Record<string, StyleRuleValue | undefined>;

/** Defines the structure of style rules, which is a record of selectors to style rules. */
export type StyleRules = Record<string, StyleRule | undefined>;

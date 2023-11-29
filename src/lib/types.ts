/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import type {
	BackgroundLayerSpecification,
	FillLayerSpecification,
	FilterSpecification,
	LineLayerSpecification,
	StyleSpecification,
	SymbolLayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import type Color from 'color';
import type StyleBuilder from './style_builder.ts';

/** Represents the available tile formats. */
export type TileFormat = 'avif' | 'bin' | 'geojson' | 'jpg' | 'json' | 'pbf' | 'png' | 'svg' | 'topojson' | 'webp';

/** Type for Maplibre layers, including background, fill, line, and symbol specifications. */
export type MaplibreLayer = BackgroundLayerSpecification | FillLayerSpecification | LineLayerSpecification | SymbolLayerSpecification;

/** Defines the structure of Maplibre layer definitions, omitting the 'source' property for fill, line, and symbol specifications. */
export type MaplibreLayerDefinition = BackgroundLayerSpecification | Omit<FillLayerSpecification, 'source'> | Omit<LineLayerSpecification, 'source'> | Omit<SymbolLayerSpecification, 'source'>;

/** Represents a filter specification in Maplibre styles. */
export type MaplibreFilter = FilterSpecification;

/** Represents the structure of a vector layer in a TileJSON specification. */
export interface VectorLayer {
	id: string;
	fields: Record<string, 'Boolean' | 'Number' | 'String'>;
	description?: string;
	minzoom?: number;
	maxzoom?: number;
}

/** Basic structure for TileJSON specification, applicable to both raster and vector types. */
export interface TileJSONSpecificationBasic {
	tilejson?: '3.0.0';
	attribution?: string;
	tiles: string[];
	scheme?: 'tms' | 'xyz';
	bounds?: [number, number, number, number];
	center?: [number, number];
	description?: string;
	fillzoom?: number;
	grids?: string[];
	legend?: string;
	minzoom?: number;
	maxzoom?: number;
	name?: string;
	template?: string;
}

/** Structure for TileJSON specification of raster type, specifying raster-specific properties. */
export interface TileJSONSpecificationRaster extends TileJSONSpecificationBasic {
	type: 'raster';
	format: 'avif' | 'jpg' | 'png' | 'webp';
}

/** Structure for TileJSON specification of vector type, specifying vector-specific properties. */
export interface TileJSONSpecificationVector extends TileJSONSpecificationBasic {
	type: 'vector';
	format: 'pbf';
	// eslint-disable-next-line @typescript-eslint/naming-convention
	vector_layers: VectorLayer[];
}

/** Represents a TileJSON specification, which can be either raster or vector. */
export type TileJSONSpecification = TileJSONSpecificationRaster | TileJSONSpecificationVector;

/** Options for creating TileJSON, extending the basic specification with format and optional vector layers. */
export interface TileJSONOption extends TileJSONSpecificationBasic {
	format: 'avif' | 'jpg' | 'pbf' | 'png' | 'webp';
	vectorLayers?: VectorLayer[];
	baseUrl?: string;
	glyphs?: string;
	sprite?: string;
}

/** Type for Maplibre styles specifically designed for raster sources. */
export type MaplibreStyleRaster = Omit<StyleSpecification, 'sources'> & {
	// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
	'sources': { [_: string]: TileJSONSpecificationRaster };
};

/** Type for Maplibre styles specifically designed for vector sources. */
export type MaplibreStyleVector = Omit<StyleSpecification, 'sources'> & {
	// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
	'sources': { [_: string]: TileJSONSpecificationVector };
};

/** Represents a Maplibre style, which can be either raster or vector. */
export type MaplibreStyle = MaplibreStyleRaster | MaplibreStyleVector;

/** Defines the value type for a style rule. */
export type StyleRuleValue = boolean | number | object | string;

/** Defines the structure of a style rule, which is a record of properties to style values. */
export type StyleRule = Record<string, StyleRuleValue | undefined>;

/** Defines the structure of style rules, which is a record of selectors to style rules. */
export type StyleRules = Record<string, StyleRule | undefined>;

/** Represents language suffixes used in map styles. */
export type LanguageSuffix = '_de' | '_en' | '';

/** Defines the keys for color properties in a style builder. */
export type StylemakerColorKeys<T extends StyleBuilder<T>> = keyof T['defaultColors'];

/** Defines the keys for font properties in a style builder. */
export type StylemakerFontKeys<T extends StyleBuilder<T>> = keyof T['defaultFonts'];

/** Records string values for color properties in a style builder. */
export type StylemakerColorStrings<T extends StyleBuilder<T>> = Record<StylemakerColorKeys<T>, string>;

/** Records string values for font properties in a style builder. */
export type StylemakerFontStrings<T extends StyleBuilder<T>> = Record<StylemakerFontKeys<T>, string>;

/** Records Color objects for color properties in a style builder. */
export type StylemakerColors<T extends StyleBuilder<T>> = Record<StylemakerColorKeys<T>, Color>;

/** Records string values for font properties in a style builder. */
export type StylemakerFonts<T extends StyleBuilder<T>> = Record<StylemakerFontKeys<T>, string>;

/** Defines options for style rules in a style builder. */
export interface StyleRulesOptions<T extends StyleBuilder<T>> {
	colors: StylemakerColors<T>;
	fonts: StylemakerFontStrings<T>;
	languageSuffix: string;
}

export interface RecolorOptions {

	/** If true, inverts the colors. */
	invert?: boolean;

	/** The degree to rotate the hue of the color (in degrees). */
	rotate?: number;

	/** Adjusts the saturation level of the color. Positive values increase saturation, negative values decrease it. */
	saturate?: number;

	/** Adjusts the gamma of the color. Affects the brightness in a non-linear manner. */
	gamma?: number;

	/** Adjusts the contrast of the color. Higher values produce more contrast. */
	contrast?: number;

	/** Adjusts the brightness of the color. Positive values make it brighter, negative values make it darker. */
	brightness?: number;

	/** Specifies the intensity of the tinting effect. Ranges from 0 (no effect) to 1 (full effect). */
	tint?: number;

	/** Specifies the color used for tinting, in a string format (e.g., '#FF0000'). */
	tintColor?: string;
}

export interface StylemakerOptions<T extends StyleBuilder<T>> {

	/** The base URL for loading external resources like tiles, sprites, and fonts. */
	baseUrl?: string;

	/** The URL template for loading font glyphs, formatted with `{fontstack}` and `{range}` placeholders. */
	glyphs?: string;

	/** The URL for loading sprite images and metadata. */
	sprite?: string;

	/** An array of URL templates for loading map tiles, with `{z}`, `{x}`, and `{y}` placeholders. */
	tiles?: string[];

	/** If true, hides all map labels. */
	hideLabels?: boolean;

	/** Suffix to append to language-specific resources, such as `"-en"` for English. */
	languageSuffix?: LanguageSuffix;

	/** An object specifying overrides for default color values, keyed by the color names. */
	colors?: Partial<StylemakerColorStrings<T>>;

	/** An object specifying overrides for default font names, keyed by the font names. */
	fonts?: Partial<StylemakerFontStrings<T>>;

	/** Options for color adjustments and transformations applied to the entire style. */
	recolor?: RecolorOptions;
}

/** 
* Checks if an object adheres to the TileJSON specification. 
* Throws errors if the object does not conform to the expected structure or types.
*/
export function isTileJSONSpecification(obj: unknown): obj is TileJSONSpecification {
	if (typeof obj !== 'object' || obj === null) {
		throw Error('spec must be an object');
	}

	const spec = obj as TileJSONSpecification;

	// Common property validation
	if (typeof spec.tilejson !== 'undefined' && spec.tilejson !== '3.0.0') {
		throw Error('spec.tilejson must be "3.0.0" if present');
	}
	if (typeof spec.attribution !== 'undefined' && typeof spec.attribution !== 'string') {
		throw Error('spec.attribution must be a string if present');
	}
	if (typeof spec.scheme !== 'undefined' && !['tms', 'xyz'].includes(spec.scheme)) {
		throw Error('spec.scheme must be "tms" or "xyz" if present');
	}
	if (typeof spec.bounds !== 'undefined' && (!Array.isArray(spec.bounds) || spec.bounds.length !== 4 || spec.bounds.some(num => typeof num !== 'number'))) {
		throw Error('spec.bounds must be an array of four numbers if present');
	}
	if (typeof spec.center !== 'undefined' && (!Array.isArray(spec.center) || spec.center.length !== 2 || spec.center.some(num => typeof num !== 'number'))) {
		throw Error('spec.center must be an array of two numbers if present');
	}
	if (typeof spec.description !== 'undefined' && typeof spec.description !== 'string') {
		throw Error('spec.description must be a string if present');
	}
	if (typeof spec.fillzoom !== 'undefined' && typeof spec.fillzoom !== 'number') {
		throw Error('spec.fillzoom must be a number if present');
	}
	if (typeof spec.grids !== 'undefined' && (!Array.isArray(spec.grids) || spec.grids.some(url => typeof url !== 'string'))) {
		throw Error('spec.grids must be an array of strings if present');
	}
	if (typeof spec.legend !== 'undefined' && typeof spec.legend !== 'string') {
		throw Error('spec.legend must be a string if present');
	}
	if (typeof spec.minzoom !== 'undefined' && typeof spec.minzoom !== 'number') {
		throw Error('spec.minzoom must be a number if present');
	}
	if (typeof spec.maxzoom !== 'undefined' && typeof spec.maxzoom !== 'number') {
		throw Error('spec.maxzoom must be a number if present');
	}
	if (typeof spec.name !== 'undefined' && typeof spec.name !== 'string') {
		throw Error('spec.name must be a string if present');
	}
	if (typeof spec.template !== 'undefined' && typeof spec.template !== 'string') {
		throw Error('spec.template must be a string if present');
	}

	if (!Array.isArray(spec.tiles) || spec.tiles.length === 0 || spec.tiles.some(url => typeof url !== 'string')) {
		throw Error('spec.tiles must be an array of strings');
	}

	if (spec.type === 'raster') {
		if (!['avif', 'jpg', 'png', 'webp'].includes(spec.format)) {
			throw Error('spec.format must be "avif", "jpg", "png", or "webp"');
		}
	} else if (spec.type === 'vector') {
		if (spec.format !== 'pbf') {
			throw Error('spec.format must be "pbf"');
		}
		if (!Array.isArray(spec.vector_layers) || spec.vector_layers.length === 0 || spec.vector_layers.some(layer => !validateVectorLayer(layer))) {
			throw Error('spec.vector_layers must be an array of VectorLayer');
		}
	} else {
		throw Error('spec.type must be "raster" or "vector"');
	}

	return true;
}

/** 
* Validates if an object conforms to the VectorLayer structure. 
* Throws errors for any deviations from the expected structure or types.
*/
export function validateVectorLayer(obj: unknown): boolean {
	if (typeof obj !== 'object' || obj === null) {
		throw Error('layer must be an object');
	}

	const layer = obj as VectorLayer;

	if (typeof layer.id !== 'string') {
		throw Error('layer.id must be a string');
	}
	if (typeof layer.fields !== 'object' || layer.fields === null || Object.values(layer.fields).some(type => !['Boolean', 'Number', 'String'].includes(type))) {
		throw Error('layer.fields must be an object with values "Boolean", "Number", or "String"');
	}
	if (typeof layer.description !== 'undefined' && typeof layer.description !== 'string') {
		throw Error('layer.description must be a string if present');
	}
	if (typeof layer.minzoom !== 'undefined' && (typeof layer.minzoom !== 'number' || layer.minzoom < 0)) {
		throw Error('layer.minzoom must be a non-negative number if present');
	}
	if (typeof layer.maxzoom !== 'undefined' && (typeof layer.maxzoom !== 'number' || layer.maxzoom < 0)) {
		throw Error('layer.maxzoom must be a non-negative number if present');
	}

	return true;
}

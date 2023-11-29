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

export type TileFormat = 'avif' | 'bin' | 'geojson' | 'jpg' | 'json' | 'pbf' | 'png' | 'svg' | 'topojson' | 'webp';

export type MaplibreLayer = BackgroundLayerSpecification | FillLayerSpecification | LineLayerSpecification | SymbolLayerSpecification;
export type MaplibreLayerDefinition = BackgroundLayerSpecification | Omit<FillLayerSpecification, 'source'> | Omit<LineLayerSpecification, 'source'> | Omit<SymbolLayerSpecification, 'source'>;
export type MaplibreFilter = FilterSpecification;

export interface VectorLayer {
	id: string;
	fields: Record<string, 'Boolean' | 'Number' | 'String'>;
	description?: string;
	minzoom?: number;
	maxzoom?: number;
}

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

export interface TileJSONSpecificationRaster extends TileJSONSpecificationBasic {
	type: 'raster';
	format: 'avif' | 'jpg' | 'png' | 'webp';
}
export interface TileJSONSpecificationVector extends TileJSONSpecificationBasic {
	type: 'vector';
	format: 'pbf';
	// eslint-disable-next-line @typescript-eslint/naming-convention
	vector_layers: VectorLayer[];
}
export type TileJSONSpecification = TileJSONSpecificationRaster | TileJSONSpecificationVector;

export interface TileJSONOption extends TileJSONSpecificationBasic {
	format: 'avif' | 'jpg' | 'pbf' | 'png' | 'webp';
	// eslint-disable-next-line @typescript-eslint/naming-convention
	vector_layers?: VectorLayer[];
}

export type MaplibreStyleRaster = Omit<StyleSpecification, 'sources'> & {
	// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
	'sources': { [_: string]: TileJSONSpecificationRaster };
};
export type MaplibreStyleVector = Omit<StyleSpecification, 'sources'> & {
	// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
	'sources': { [_: string]: TileJSONSpecificationVector };
};
export type MaplibreStyle = MaplibreStyleRaster | MaplibreStyleVector;


export type StyleRuleValue = boolean | number | object | string;
export type StyleRule = Record<string, StyleRuleValue | undefined>;
export type StyleRules = Record<string, StyleRule | undefined>;
//export type StylemakerColorLookup = Record<string, Color | undefined>;
//export type StylemakerStringLookup = Record<string, string | undefined>;
export type LanguageSuffix = '_de' | '_en' | '';

export type StylemakerColorKeys<T extends StyleBuilder<T>> = keyof T['defaultColors'];
export type StylemakerFontKeys<T extends StyleBuilder<T>> = keyof T['defaultFonts'];

export type StylemakerColorStrings<T extends StyleBuilder<T>> = Record<StylemakerColorKeys<T>, string>;
export type StylemakerFontStrings<T extends StyleBuilder<T>> = Record<StylemakerFontKeys<T>, string>;

export type StylemakerColors<T extends StyleBuilder<T>> = Record<StylemakerColorKeys<T>, Color>;
export type StylemakerFonts<T extends StyleBuilder<T>> = Record<StylemakerFontKeys<T>, string>;

export interface StyleRulesOptions<T extends StyleBuilder<T>> {
	colors: StylemakerColors<T>;
	fonts: StylemakerFontStrings<T>;
	languageSuffix: string;
}

export interface RecolorOptions {
	invert?: boolean;
	rotate?: number;
	saturate?: number;
	gamma?: number;
	contrast?: number;
	brightness?: number;
	tint?: number;
	tintColor?: string;
}

export interface StylemakerOptions<T extends StyleBuilder<T>> {
	baseUrl?: string;
	glyphsUrl?: string;
	spriteUrl?: string;
	tilesUrls?: string[];
	hideLabels?: boolean;
	languageSuffix?: LanguageSuffix;
	colors?: Partial<StylemakerColorStrings<T>>;
	fonts?: Partial<StylemakerFontStrings<T>>;
	recolor?: RecolorOptions;
}



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

function validateVectorLayer(obj: unknown): boolean {
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

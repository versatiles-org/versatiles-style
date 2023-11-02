

export type StyleRules = { [id: string]: StyleRule }
export type StyleRule = { [id: string]: StyleValue }
export type StyleValue = object | number | string;


import { BackgroundLayer, FillLayer, LineLayer, SymbolLayer } from 'mapbox-gl';
import WrappedColor from 'color';
import { Style } from 'mapbox-gl';


export type MaplibreStyle = Style;
export type MaplibreLayer = BackgroundLayer | FillLayer | LineLayer | SymbolLayer;
export type MaplibreFilter = any[];


export type StylemakerLayerStyleGeneratorOptions = {
	colors: StylemakerColorLookup,
	fonts: StylemakerFontLookup,
	languageSuffix: string,
}


export type StylemakerLayerStyleGenerator = (options: StylemakerLayerStyleGeneratorOptions) => StylemakerLayerStyleRules

export type StylemakerLayerStyleRules = unknown;
export type StylemakerFunction = (options: StylemakerOptions) => MaplibreStyle


export type StylemakerOptions = {
	baseUrl?: string,
	glyphsUrl?: string,
	spriteUrl?: string,
	tilesUrls?: string[],
	sourceName?: string, // e.g. "versatiles-shortbread"
	hideLabels?: boolean,
	language?: boolean,
	colors?: StylemakerColorLookup,
	fonts?: StylemakerFontLookup,
	colorTransformer?: ColorTransformerFlags,
}

export type StylemakerColorLookup = { [name: string]: WrappedColor };
export type StylemakerFontLookup = { [name: string]: string }

export type ColorTransformerFlags = {
	invert?: boolean,
	rotate?: number,
	saturate?: number,
	gamma?: number,
	contrast?: number,
	brightness?: number,
	tint?: number,
	tintColor?: WrappedColor,
}
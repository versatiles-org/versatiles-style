
/******************************************************************************/

import { BackgroundLayer, FillLayer, LineLayer, SymbolLayer } from 'mapbox-gl';

import { Style } from 'mapbox-gl';

export type MaplibreStyle = Style;
export type MaplibreLayer = BackgroundLayer | FillLayer | LineLayer | SymbolLayer;
export type MaplibreFilter = any[];

/******************************************************************************/

export type StyleRuleValue = object | number | string | boolean;
export type StyleRule = { [id: string]: StyleRuleValue }
export type StyleRules = { [id: string]: StyleRule }

import WrappedColor from 'color';
export type StylemakerColorLookup = { [name: string]: WrappedColor };
export type StylemakerFontLookup = { [name: string]: string }


export type ColorTransformerFlags = {
	invert: boolean,
	rotate: number,
	saturate: number,
	gamma: number,
	contrast: number,
	brightness: number,
	tint: number,
	tintColor: WrappedColor,
}

export type StyleRulesOptions = {
	colors: StylemakerColorLookup,
	fonts: StylemakerFontLookup,
	languageSuffix: string,
}

export type StylemakerLayerStyleGenerator = (options: StyleRulesOptions) => StyleRules

export type LanguageSuffix = '' | '_de' | '_en';

export type StylemakerOptions = {
	baseUrl?: string,
	glyphsUrl?: string,
	spriteUrl?: string,
	tilesUrls?: string[],
	hideLabels?: boolean,
	languageSuffix?: LanguageSuffix,
	colors?: { [name: string]: string },
	fonts?: { [name: string]: string },
	colorTransformer?: {
		invert?: boolean,
		rotate?: number,
		saturate?: number,
		gamma?: number,
		contrast?: number,
		brightness?: number,
		tint?: number,
		tintColor?: string,
	},
}

export interface StylemakerFunction {
	(options: StylemakerOptions): MaplibreStyle;
	name: string;
	options: StylemakerOptions;
}


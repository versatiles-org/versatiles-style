
/******************************************************************************/

import { BackgroundLayer, FillLayer, LineLayer, SymbolLayer } from 'mapbox-gl';

import { Style } from 'mapbox-gl';

export type MaplibreStyle = Style;
export type MaplibreLayer = BackgroundLayer | FillLayer | LineLayer | SymbolLayer;
export type MaplibreFilter = unknown[];

/******************************************************************************/

export type StyleRuleValue = object | number | string | boolean;
export type StyleRule = { [id: string]: StyleRuleValue }
export type StyleRules = { [id: string]: StyleRule }

import Color from 'color';
export type StylemakerColorLookup = { [name: string]: Color };
export type StylemakerStringLookup = { [name: string]: string }

export type LanguageSuffix = '' | '_de' | '_en';

export type RecolorOptions = {
	invert?: boolean,
	rotate?: number,
	saturate?: number,
	gamma?: number,
	contrast?: number,
	brightness?: number,
	tint?: number,
	tintColor?: string,
}

export type StyleRulesOptions = {
	colors: StylemakerColorLookup,
	fonts: StylemakerStringLookup,
	languageSuffix: string,
}

export type StylemakerLayerStyleGenerator = (options: StyleRulesOptions) => StyleRules

export type StylebuilderOptions = {
	baseUrl?: string,
	glyphsUrl?: string,
	spriteUrl?: string,
	tilesUrls?: string[],
	hideLabels?: boolean,
	languageSuffix?: LanguageSuffix,
	colors?: { [name: string]: string },
	fonts?: { [name: string]: string },
	recolor?: RecolorOptions,
}

export interface StylemakerFunction {
	(options: StylebuilderOptions): MaplibreStyle;
	name: string;
	options: StylebuilderOptions;
}


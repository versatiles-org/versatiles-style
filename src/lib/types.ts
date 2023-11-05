
/******************************************************************************/

import type { BackgroundLayer, FillLayer, LineLayer, SymbolLayer } from 'mapbox-gl';

import type { Style } from 'mapbox-gl';

export type MaplibreStyle = Style;
export type MaplibreLayer = BackgroundLayer | FillLayer | LineLayer | SymbolLayer;
export type MaplibreFilter = unknown[];

/******************************************************************************/

export type StyleRuleValue = boolean | number | object | string;
export type StyleRule = Record<string, StyleRuleValue>;
export type StyleRules = Record<string, StyleRule>;

import type Color from 'color';
export type StylemakerColorLookup = Record<string, Color>;
export type StylemakerStringLookup = Record<string, string>;

export type LanguageSuffix = '_de' | '_en' | '';

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

export interface StyleRulesOptions {
	colors: StylemakerColorLookup;
	fonts: StylemakerStringLookup;
	languageSuffix: string;
}

export interface StyleBuilderOptions {
	baseUrl?: string;
	glyphsUrl?: string;
	spriteUrl?: string;
	tilesUrls?: string[];
	hideLabels?: boolean;
	languageSuffix?: LanguageSuffix;
	colors?: Record<string, string>;
	fonts?: Record<string, string>;
	recolor?: RecolorOptions;
}

export interface StylemakerFunction {
	(options: StyleBuilderOptions): MaplibreStyle;
	name: string;
	options: StyleBuilderOptions;
}


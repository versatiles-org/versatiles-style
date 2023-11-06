
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

export interface StyleRulesOptions {
	colors: StylemakerColorLookup;
	fonts: StylemakerStringLookup;
	languageSuffix: string;
}

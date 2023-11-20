
import type {
	BackgroundLayerSpecification,
	FillLayerSpecification,
	FilterSpecification,
	LineLayerSpecification,
	StyleSpecification,
	SymbolLayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import type Color from 'color';

export type TileFormat = 'avif' | 'bin' | 'geojson' | 'jpeg' | 'jpg' | 'json' | 'pbf' | 'png' | 'svg' | 'topojson' | 'webp';

export type MaplibreLayer = BackgroundLayerSpecification | FillLayerSpecification | LineLayerSpecification | SymbolLayerSpecification;
export type MaplibreLayerDefinition = BackgroundLayerSpecification | Omit<FillLayerSpecification, 'source'> | Omit<LineLayerSpecification, 'source'> | Omit<SymbolLayerSpecification, 'source'>;
export type MaplibreFilter = FilterSpecification;

export interface TileJSONSpecification {
	attribution: string;
	tiles: string[];
	type: string;
	scheme: 'xyz';
	bounds: [number, number, number, number];
	minzoom: number;
	maxzoom: number;
	format: TileFormat;
	// eslint-disable-next-line @typescript-eslint/naming-convention
	vector_layers: unknown[];
}
export type MaplibreStyle = Omit<StyleSpecification, 'sources'> & {
	// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
	'sources': { [_: string]: TileJSONSpecification };
};
export type StyleRuleValue = boolean | number | object | string;
export type StyleRule = Record<string, StyleRuleValue>;
export type StyleRules = Record<string, StyleRule>;
export type StylemakerColorLookup = Record<string, Color>;
export type StylemakerStringLookup = Record<string, string>;
export type LanguageSuffix = '_de' | '_en' | '';

export interface StyleRulesOptions {
	colors: StylemakerColorLookup;
	fonts: StylemakerStringLookup;
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

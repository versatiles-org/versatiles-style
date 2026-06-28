import type { Color } from '../color/index.js';
import type { ColorsOptions } from '../types/index.js';

export type SizeStops = Record<number, number>;
export type SizeValue = number | SizeStops;
export type ColorValue = Color | string;

// Describes paint/layout overrides applied to a single layer (or group of layers matched
// by a brace-expansion pattern). Properties use camelCase; applyTheme converts them to
// the MapLibre kebab-case equivalents and dispatches to paint or layout as appropriate.
export type LayerOverride = {
	// primary color — dispatched to fill-color / line-color / text-color / background-color
	color?: ColorValue;
	size?: SizeValue;
	opacity?: number | SizeStops;
	fillOutlineColor?: ColorValue;
	fillAntialias?: boolean;
	fillTranslate?: [number, number];
	fillExtrusionHeight?: unknown;
	fillExtrusionBase?: unknown;
	// dispatched to fill-pattern (fill) or icon-image (symbol)
	image?: unknown;
	lineBlur?: number;
	lineCap?: string;
	lineJoin?: string;
	lineDasharray?: number[];
	font?: string;
	textHaloColor?: ColorValue;
	textHaloWidth?: number;
	textHaloBlur?: number;
	textTransform?: string;
	textAnchor?: string;
	textOffset?: [number, number];
	textPadding?: number;
	textOptional?: boolean;
	symbolPlacement?: string;
	iconSize?: SizeValue;
	iconOpacity?: number;
	iconKeepUpright?: boolean;
	iconAnchor?: string;
	iconOptional?: boolean;
	minzoom?: number;
	maxzoom?: number;
};

// Maps brace-expansion layer ID patterns to layer overrides (undefined = skip).
export type ThemeRules = Record<string, LayerOverride | undefined>;

export type PaletteDefinition = {
	light: Required<ColorsOptions>;
	dark: Required<ColorsOptions>;
};

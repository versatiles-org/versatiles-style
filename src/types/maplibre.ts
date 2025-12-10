import type {
	BackgroundLayerSpecification,
	FillLayerSpecification,
	FilterSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';
export type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

/** Type for Maplibre layers, including background, fill, line, and symbol specifications. */
export type MaplibreLayer =
	| BackgroundLayerSpecification
	| FillLayerSpecification
	| LineLayerSpecification
	| SymbolLayerSpecification;

/** Defines the structure of Maplibre layer definitions, omitting the 'source' property for fill, line, and symbol specifications. */
export type MaplibreLayerDefinition =
	| BackgroundLayerSpecification
	| Omit<FillLayerSpecification, 'source'>
	| Omit<LineLayerSpecification, 'source'>
	| Omit<SymbolLayerSpecification, 'source'>;

/** Represents a filter specification in Maplibre styles. */
export type MaplibreFilter = FilterSpecification;

import type {
	BackgroundLayerSpecification,
	FillExtrusionLayerSpecification,
	FillLayerSpecification,
	FilterSpecification,
	LineLayerSpecification,
	SymbolLayerSpecification,
} from '@maplibre/maplibre-gl-style-spec';
export type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

/** Type for Maplibre layers, including background, fill, fill-extrusion, line, and symbol specifications. */
export type MaplibreLayer =
	| BackgroundLayerSpecification
	| FillExtrusionLayerSpecification
	| FillLayerSpecification
	| LineLayerSpecification
	| SymbolLayerSpecification;

/** Defines the structure of Maplibre layer definitions, omitting the 'source' property for non-background specifications. */
export type MaplibreLayerDefinition =
	| BackgroundLayerSpecification
	| Omit<FillExtrusionLayerSpecification, 'source'>
	| Omit<FillLayerSpecification, 'source'>
	| Omit<LineLayerSpecification, 'source'>
	| Omit<SymbolLayerSpecification, 'source'>;

/** Represents a filter specification in Maplibre styles. */
export type MaplibreFilter = FilterSpecification;

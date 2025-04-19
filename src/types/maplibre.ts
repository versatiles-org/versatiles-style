import type { BackgroundLayerSpecification, FillLayerSpecification, FilterSpecification, LineLayerSpecification, SymbolLayerSpecification, RasterLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
export type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

/** Type for Maplibre layers, including background, fill, line, and symbol specifications. */
export type MaplibreLayer = BackgroundLayerSpecification | FillLayerSpecification | LineLayerSpecification | SymbolLayerSpecification;

/** Defines the structure of Maplibre layer definitions. */
export type MaplibreLayerDefinition = BackgroundLayerSpecification | FillLayerSpecification | LineLayerSpecification | SymbolLayerSpecification | RasterLayerSpecification;

/** Represents a filter specification in Maplibre styles. */
export type MaplibreFilter = FilterSpecification;

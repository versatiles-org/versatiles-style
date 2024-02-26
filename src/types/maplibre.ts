import type { BackgroundLayerSpecification, FillLayerSpecification, FilterSpecification, LineLayerSpecification, StyleSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { TileJSONSpecificationRaster, TileJSONSpecificationVector } from './tilejson.js';

/** Type for Maplibre styles specifically designed for raster sources. */
export type MaplibreStyleRaster = Omit<StyleSpecification, 'sources'> & {
	// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
	'sources': { [_: string]: TileJSONSpecificationRaster };
};

/** Type for Maplibre styles specifically designed for vector sources. */
export type MaplibreStyleVector = Omit<StyleSpecification, 'sources'> & {
	// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
	'sources': { [_: string]: TileJSONSpecificationVector };
};

/** Represents a Maplibre style, which can be either raster or vector. */
export type MaplibreStyle = MaplibreStyleRaster | MaplibreStyleVector;

/** Type for Maplibre layers, including background, fill, line, and symbol specifications. */
export type MaplibreLayer = BackgroundLayerSpecification | FillLayerSpecification | LineLayerSpecification | SymbolLayerSpecification;

/** Defines the structure of Maplibre layer definitions, omitting the 'source' property for fill, line, and symbol specifications. */
export type MaplibreLayerDefinition = BackgroundLayerSpecification | Omit<FillLayerSpecification, 'source'> | Omit<LineLayerSpecification, 'source'> | Omit<SymbolLayerSpecification, 'source'>;

/** Represents a filter specification in Maplibre styles. */
export type MaplibreFilter = FilterSpecification;

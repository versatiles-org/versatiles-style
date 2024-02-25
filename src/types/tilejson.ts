import type { VectorLayer } from './vector_layer';
import { isVectorLayers } from './vector_layer';

/** Basic structure for TileJSON specification, applicable to both raster and vector types. */
export interface TileJSONSpecificationBasic {
	tilejson?: '3.0.0';
	attribution?: string;
	tiles: string[];
	scheme?: 'tms' | 'xyz';
	bounds?: [number, number, number, number];
	center?: [number, number];
	description?: string;
	fillzoom?: number;
	grids?: string[];
	legend?: string;
	minzoom?: number;
	maxzoom?: number;
	name?: string;
	template?: string;
}

/** Structure for TileJSON specification of raster type, specifying raster-specific properties. */
export interface TileJSONSpecificationRaster extends TileJSONSpecificationBasic {
	type: 'raster';
	format: 'avif' | 'jpg' | 'png' | 'webp';
}

/** Structure for TileJSON specification of vector type, specifying vector-specific properties. */
export interface TileJSONSpecificationVector extends TileJSONSpecificationBasic {
	type: 'vector';
	format: 'pbf';
	// eslint-disable-next-line @typescript-eslint/naming-convention
	vector_layers: VectorLayer[];
}

/** Represents a TileJSON specification, which can be either raster or vector. */
export type TileJSONSpecification = TileJSONSpecificationRaster | TileJSONSpecificationVector;

/** 
* Checks if an object adheres to the TileJSON specification. 
* Throws errors if the object does not conform to the expected structure or types.
*/
export function isTileJSONSpecification(spec: unknown): spec is TileJSONSpecification {
	if (typeof spec !== 'object' || spec === null) {
		throw Error('spec must be an object');
	}

	const obj = spec as Record<string, unknown>;

	// Common property validation
	if (obj.tilejson !== undefined && obj.tilejson !== '3.0.0') {
		throw Error('spec.tilejson must be "3.0.0" if present');
	}
	if (obj.attribution !== undefined && typeof obj.attribution !== 'string') {
		throw Error('spec.attribution must be a string if present');
	}
	if (obj.scheme !== undefined && obj.scheme !== 'xyz' && obj.scheme !== 'tms') {
		throw Error('spec.scheme must be "tms" or "xyz" if present');
	}
	if (obj.bounds !== undefined && (!Array.isArray(obj.bounds) || obj.bounds.length !== 4 || obj.bounds.some(num => typeof num !== 'number'))) {
		throw Error('spec.bounds must be an array of four numbers if present');
	}
	if (obj.center !== undefined && (!Array.isArray(obj.center) || obj.center.length !== 2 || obj.center.some(num => typeof num !== 'number'))) {
		throw Error('spec.center must be an array of two numbers if present');
	}
	if (obj.description !== undefined && typeof obj.description !== 'string') {
		throw Error('spec.description must be a string if present');
	}
	if (obj.fillzoom !== undefined && typeof obj.fillzoom !== 'number') {
		throw Error('spec.fillzoom must be a number if present');
	}
	if (obj.grids !== undefined && (!Array.isArray(obj.grids) || obj.grids.some(url => typeof url !== 'string'))) {
		throw Error('spec.grids must be an array of strings if present');
	}
	if (obj.legend !== undefined && typeof obj.legend !== 'string') {
		throw Error('spec.legend must be a string if present');
	}
	if (obj.minzoom !== undefined && typeof obj.minzoom !== 'number') {
		throw Error('spec.minzoom must be a number if present');
	}
	if (obj.maxzoom !== undefined && typeof obj.maxzoom !== 'number') {
		throw Error('spec.maxzoom must be a number if present');
	}
	if (obj.name !== undefined && typeof obj.name !== 'string') {
		throw Error('spec.name must be a string if present');
	}
	if (obj.template !== undefined && typeof obj.template !== 'string') {
		throw Error('spec.template must be a string if present');
	}

	if (!Array.isArray(obj.tiles) || obj.tiles.length === 0 || obj.tiles.some(url => typeof url !== 'string')) {
		throw Error('spec.tiles must be an array of strings');
	}

	if (typeof obj.format !== 'string') {
		throw Error('spec.format must be a string');
	}

	if (obj.type === 'raster') {
		if (!['avif', 'jpg', 'png', 'webp'].includes(obj.format)) {
			throw Error('spec.format must be "avif", "jpg", "png", or "webp"');
		}
	} else if (obj.type === 'vector') {
		if (obj.format !== 'pbf') {
			throw Error('spec.format must be "pbf"');
		}
		if (!isVectorLayers(obj.vector_layers)) {
			throw Error('spec.vector_layers must be an array of VectorLayer');
		}
	} else {
		throw Error('spec.type must be "raster" or "vector"');
	}

	return true;
}

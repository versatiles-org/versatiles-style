import type { VectorLayer } from './vector_layer';
import { isVectorLayers } from './vector_layer';

/** Basic structure for TileJSON specification, applicable to both raster and vector types. */
export interface TileJSONSpecificationBasic {
	tilejson: '3.0.0';
	tiles: string[];
	attribution?: string;
	bounds?: [number, number, number, number];
	center?: [number, number];
	data?: string[];
	description?: string;
	fillzoom?: number;
	grids?: string[];
	legend?: string;
	maxzoom?: number;
	minzoom?: number;
	name?: string;
	scheme?: 'tms' | 'xyz';
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
	if (obj.tilejson !== '3.0.0') {
		throw Error('spec.tilejson must be "3.0.0"');
	}

	if (obj.attribution !== undefined && typeof obj.attribution !== 'string') {
		throw Error('spec.attribution must be a string if present');
	}

	if (obj.bounds !== undefined) {
		if (!Array.isArray(obj.bounds) || obj.bounds.length !== 4 || obj.bounds.some(num => typeof num !== 'number')) {
			throw Error('spec.bounds must be an array of four numbers if present');
		}
		const a = obj.bounds as [number, number, number, number];
		if (a[0] < -180 || a[0] > 180) throw Error('spec.bounds[0] must be between -180 and 180');
		if (a[1] < -90 || a[1] > 90) throw Error('spec.bounds[1] must be between -90 and 90');
		if (a[2] < -180 || a[2] > 180) throw Error('spec.bounds[2] must be between -180 and 180');
		if (a[3] < -90 || a[3] > 90) throw Error('spec.bounds[3] must be between -90 and 90');
		if (a[0] > a[2]) throw Error('spec.bounds[0] must be smaller than spec.bounds[2]');
		if (a[1] > a[3]) throw Error('spec.bounds[1] must be smaller than spec.bounds[3]');
	}

	if (obj.center !== undefined) {
		if (!Array.isArray(obj.center) || obj.center.length !== 2 || obj.center.some(num => typeof num !== 'number')) {
			throw Error('spec.center must be an array of two numbers if present');
		}
		const a = obj.center as [number, number];
		if (a[0] < -180 || a[0] > 180) throw Error('spec.center[0] must be between -180 and 180');
		if (a[1] < -90 || a[1] > 90) throw Error('spec.center[1] must be between -90 and 90');
	}

	if (obj.data !== undefined && (!Array.isArray(obj.data) || obj.data.some(url => typeof url !== 'string'))) {
		throw Error('spec.data must be an array of strings if present');
	}

	if (obj.description !== undefined && typeof obj.description !== 'string') {
		throw Error('spec.description must be a string if present');
	}

	if (obj.fillzoom !== undefined && (typeof obj.fillzoom !== 'number' || (obj.fillzoom < 0))) {
		throw Error('spec.fillzoom must be a positive integer if present');
	}

	if (obj.grids !== undefined && (!Array.isArray(obj.grids) || obj.grids.some(url => typeof url !== 'string'))) {
		throw Error('spec.grids must be an array of strings if present');
	}

	if (obj.legend !== undefined && typeof obj.legend !== 'string') {
		throw Error('spec.legend must be a string if present');
	}

	if (obj.minzoom !== undefined && (typeof obj.minzoom !== 'number' || (obj.minzoom < 0))) {
		throw Error('spec.minzoom must be a positive integer if present');
	}

	if (obj.maxzoom !== undefined && (typeof obj.maxzoom !== 'number' || (obj.maxzoom < 0))) {
		throw Error('spec.maxzoom must be a positive integer if present');
	}

	if (obj.name !== undefined && typeof obj.name !== 'string') {
		throw Error('spec.name must be a string if present');
	}

	if (obj.scheme !== undefined && obj.scheme !== 'xyz' && obj.scheme !== 'tms') {
		throw Error('spec.scheme must be "tms" or "xyz" if present');
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
			throw Error('spec.format must be "avif", "jpg", "png", or "webp" for raster sources');
		}
	} else if (obj.type === 'vector') {
		if (obj.format !== 'pbf') {
			throw Error('spec.format must be "pbf" for vector sources');
		}
		try {
			if (!isVectorLayers(obj.vector_layers)) throw Error('spec.vector_layers is invalid');
		} catch (error) {
			throw Error('spec.vector_layers is invalid: ' + String((error instanceof Error) ? error.message : error));
		}
	} else {
		throw Error('spec.type must be "raster" or "vector"');
	}

	return true;
}

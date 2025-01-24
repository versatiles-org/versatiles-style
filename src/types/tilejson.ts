import type { VectorLayer } from './vector_layer';

/** Basic structure for TileJSON specification, applicable to both raster and vector types. */
export interface TileJSONSpecificationRaster {
	tilejson?: '3.0.0';
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
	version?: string;
}

/** Structure for TileJSON specification of vector type, specifying vector-specific properties. */
export interface TileJSONSpecificationVector extends TileJSONSpecificationRaster {
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
	if (obj.data != null && obj.tilejson !== '3.0.0') {
		throw Error('spec.tilejson must be "3.0.0"');
	}

	if (obj.attribution != null && typeof obj.attribution !== 'string') {
		throw Error('spec.attribution must be a string if present');
	}

	if (obj.bounds != null) {
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

	if (obj.center != null) {
		if (!Array.isArray(obj.center) || obj.center.length !== 2 || obj.center.some(num => typeof num !== 'number')) {
			throw Error('spec.center must be an array of two numbers if present');
		}
		const a = obj.center as [number, number];
		if (a[0] < -180 || a[0] > 180) throw Error('spec.center[0] must be between -180 and 180');
		if (a[1] < -90 || a[1] > 90) throw Error('spec.center[1] must be between -90 and 90');
	}

	if (obj.data != null && (!Array.isArray(obj.data) || obj.data.some(url => typeof url !== 'string'))) {
		throw Error('spec.data must be an array of strings if present');
	}

	if (obj.description != null && typeof obj.description !== 'string') {
		throw Error('spec.description must be a string if present');
	}

	if (obj.fillzoom != null && (typeof obj.fillzoom !== 'number' || (obj.fillzoom < 0))) {
		throw Error('spec.fillzoom must be a positive integer if present');
	}

	if (obj.grids != null && (!Array.isArray(obj.grids) || obj.grids.some(url => typeof url !== 'string'))) {
		throw Error('spec.grids must be an array of strings if present');
	}

	if (obj.legend != null && typeof obj.legend !== 'string') {
		throw Error('spec.legend must be a string if present');
	}

	if (obj.minzoom != null && (typeof obj.minzoom !== 'number' || (obj.minzoom < 0))) {
		throw Error('spec.minzoom must be a positive integer if present');
	}

	if (obj.maxzoom != null && (typeof obj.maxzoom !== 'number' || (obj.maxzoom < 0))) {
		throw Error('spec.maxzoom must be a positive integer if present');
	}

	if (obj.name != null && typeof obj.name !== 'string') {
		throw Error('spec.name must be a string if present');
	}

	if (obj.scheme != null && obj.scheme !== 'xyz' && obj.scheme !== 'tms') {
		throw Error('spec.scheme must be "tms" or "xyz" if present');
	}

	if (obj.template != null && typeof obj.template !== 'string') {
		throw Error('spec.template must be a string if present');
	}

	if (!Array.isArray(obj.tiles) || obj.tiles.length === 0 || obj.tiles.some(url => typeof url !== 'string')) {
		throw Error('spec.tiles must be an array of strings');
	}

	return true;
}

export function isRasterTileJSONSpecification(spec: unknown): spec is TileJSONSpecificationRaster {
	if (!isTileJSONSpecification(spec)) return false;
	if (('vector_layers' in spec) && (spec.vector_layers != null)) return false;
	return true;
}

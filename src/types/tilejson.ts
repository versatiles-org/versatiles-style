import type { VectorLayer } from './vector_layer.js';

/** Basic structure for TileJSON specification, applicable to both raster and vector types. */
export interface TileJSONSpecificationRaster {
	tilejson?: '3.0.0';
	tiles: string[];

	attribution?: string;
	bounds?: [number, number, number, number];
	center?: [number, number] | [number, number, number];
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
	tile_schema?: string;
	tile_size?: number;
	encoding?: 'terrarium' | 'mapbox' | 'custom';
}

/** Structure for TileJSON specification of vector type, specifying vector-specific properties. */
export interface TileJSONSpecificationVector extends TileJSONSpecificationRaster {
	vector_layers: VectorLayer[];
}

/** Represents a TileJSON specification, which can be either raster or vector. */
export type TileJSONSpecification = TileJSONSpecificationRaster | TileJSONSpecificationVector;

/**
 * Validate an object against the TileJSON specification, throwing a descriptive error naming the
 * offending field if it does not conform.
 *
 * Use {@link isTileJSONSpecification} when you want a boolean instead. These were one function
 * whose `spec is T` signature promised a predicate but which threw for every invalid input, so
 * `if (isTileJSONSpecification(x))` blew up rather than branching.
 *
 * **npm only.** Not exported by the browser bundle (`versatiles-style.js`) — see the
 * `versatiles-style.js` module for what that carries.
 */
export function assertTileJSONSpecification(spec: unknown): asserts spec is TileJSONSpecification {
	if (typeof spec !== 'object' || spec === null) {
		throw new Error(`TileJSON validation: spec must be an object, but got ${typeof spec}`);
	}

	const obj = spec as Record<string, unknown>;

	// The version, when the document declares one. This used to be gated on `obj.data != null` — a
	// copy of the `data` check below — which got it wrong in both directions: `{ tiles, tilejson:
	// 'banana' }` was accepted and then narrowed to a type whose `tilejson?: '3.0.0'` was a lie, while
	// `{ tiles, data }` was rejected over a field it had not set. Left optional, as the interface says:
	// requiring it would reject documents this library builds and reads happily.
	if (obj.tilejson != null && obj.tilejson !== '3.0.0') {
		throw new Error(`TileJSON validation: spec.tilejson must be "3.0.0", but got ${JSON.stringify(obj.tilejson)}`);
	}

	if (obj.attribution != null && typeof obj.attribution !== 'string') {
		throw new Error(
			`TileJSON validation: spec.attribution must be a string if present, but got ${typeof obj.attribution}`
		);
	}

	if (obj.bounds != null) {
		if (!Array.isArray(obj.bounds) || obj.bounds.length !== 4 || obj.bounds.some((num) => typeof num !== 'number')) {
			throw new Error(
				`TileJSON validation: spec.bounds must be an array of four numbers if present, but got ${JSON.stringify(obj.bounds)}`
			);
		}
		const a = obj.bounds as [number, number, number, number];
		if (a[0] < -180 || a[0] > 180)
			throw new Error(`TileJSON validation: spec.bounds[0] (longitude) must be between -180 and 180, but got ${a[0]}`);
		if (a[1] < -90 || a[1] > 90)
			throw new Error(`TileJSON validation: spec.bounds[1] (latitude) must be between -90 and 90, but got ${a[1]}`);
		if (a[2] < -180 || a[2] > 180)
			throw new Error(`TileJSON validation: spec.bounds[2] (longitude) must be between -180 and 180, but got ${a[2]}`);
		if (a[3] < -90 || a[3] > 90)
			throw new Error(`TileJSON validation: spec.bounds[3] (latitude) must be between -90 and 90, but got ${a[3]}`);
		if (a[0] > a[2])
			throw new Error(
				`TileJSON validation: spec.bounds[0] must be smaller than spec.bounds[2] (min longitude < max longitude), but got [${a[0]}, ${a[2]}]`
			);
		if (a[1] > a[3])
			throw new Error(
				`TileJSON validation: spec.bounds[1] must be smaller than spec.bounds[3] (min latitude < max latitude), but got [${a[1]}, ${a[3]}]`
			);
	}

	if (obj.center != null) {
		if (
			!Array.isArray(obj.center) ||
			(obj.center.length !== 2 && obj.center.length !== 3) ||
			obj.center.some((num) => typeof num !== 'number')
		) {
			throw new Error(
				`TileJSON validation: spec.center must be an array of two or three numbers if present, but got ${JSON.stringify(obj.center)}`
			);
		}
		const a = obj.center as [number, number] | [number, number, number];
		if (a[0] < -180 || a[0] > 180)
			throw new Error(`TileJSON validation: spec.center[0] (longitude) must be between -180 and 180, but got ${a[0]}`);
		if (a[1] < -90 || a[1] > 90)
			throw new Error(`TileJSON validation: spec.center[1] (latitude) must be between -90 and 90, but got ${a[1]}`);
		if (a.length === 3 && (a[2] < 0 || !Number.isInteger(a[2])))
			throw new Error(`TileJSON validation: spec.center[2] (zoom) must be a non-negative integer, but got ${a[2]}`);
	}

	if (obj.data != null && (!Array.isArray(obj.data) || obj.data.some((url) => typeof url !== 'string'))) {
		throw new Error('TileJSON validation: spec.data must be an array of strings if present');
	}

	if (obj.description != null && typeof obj.description !== 'string') {
		throw new Error(
			`TileJSON validation: spec.description must be a string if present, but got ${typeof obj.description}`
		);
	}

	// Zoom levels are integers. Only `< 0` used to be checked, so `fillzoom: 1.5` and `minzoom: 9.7`
	// passed a check whose own message called them integers, and reached MapLibre as fractional zooms.
	if (obj.fillzoom != null && !isZoom(obj.fillzoom)) {
		throw new Error(
			`TileJSON validation: spec.fillzoom must be a non-negative integer if present, but got ${JSON.stringify(obj.fillzoom)}`
		);
	}

	if (obj.grids != null && (!Array.isArray(obj.grids) || obj.grids.some((url) => typeof url !== 'string'))) {
		throw new Error('TileJSON validation: spec.grids must be an array of strings if present');
	}

	if (obj.legend != null && typeof obj.legend !== 'string') {
		throw new Error(`TileJSON validation: spec.legend must be a string if present, but got ${typeof obj.legend}`);
	}

	if (obj.minzoom != null && !isZoom(obj.minzoom)) {
		throw new Error(
			`TileJSON validation: spec.minzoom must be a non-negative integer if present, but got ${JSON.stringify(obj.minzoom)}`
		);
	}

	if (obj.maxzoom != null && !isZoom(obj.maxzoom)) {
		throw new Error(
			`TileJSON validation: spec.maxzoom must be a non-negative integer if present, but got ${JSON.stringify(obj.maxzoom)}`
		);
	}

	// An inverted range describes a tileset with no zoom levels at all. `bounds` and `center` already
	// get this kind of ordering check; the zooms did not, so `{ minzoom: 14, maxzoom: 2 }` passed.
	if (obj.minzoom != null && obj.maxzoom != null && (obj.minzoom as number) > (obj.maxzoom as number)) {
		throw new Error(
			`TileJSON validation: spec.minzoom must not be greater than spec.maxzoom, but got [${obj.minzoom}, ${obj.maxzoom}]`
		);
	}

	if (obj.name != null && typeof obj.name !== 'string') {
		throw new Error(`TileJSON validation: spec.name must be a string if present, but got ${typeof obj.name}`);
	}

	if (obj.scheme != null && obj.scheme !== 'xyz' && obj.scheme !== 'tms') {
		throw new Error(`TileJSON validation: spec.scheme must be "tms" or "xyz" if present, but got "${obj.scheme}"`);
	}

	if (obj.template != null && typeof obj.template !== 'string') {
		throw new Error(`TileJSON validation: spec.template must be a string if present, but got ${typeof obj.template}`);
	}

	if (!Array.isArray(obj.tiles) || obj.tiles.length === 0 || obj.tiles.some((url) => typeof url !== 'string')) {
		throw new Error('TileJSON validation: spec.tiles must be a non-empty array of strings');
	}

	// `vector_layers` is half of the exported union and was not checked at all, so
	// `{ tiles: ['x'], vector_layers: 'nope' }` narrowed to `TileJSONSpecificationVector` and the first
	// `.vector_layers.filter(...)` downstream threw a TypeError instead.
	//
	// Checked shallowly, on purpose. `fields` is required by TileJSON 3.0.0 but real tilesets omit it,
	// and `guessStyle` runs this over every document it downloads — full conformance here would turn a
	// working style into a blank one for a tileset whose only sin is a missing `fields`. What the
	// library actually reads is the `id` of each layer, so that is what is required. A caller who wants
	// the whole structure checked has `assertVectorLayers`.
	if (obj.vector_layers != null) {
		const layers = obj.vector_layers;
		const shaped =
			Array.isArray(layers) &&
			layers.every((layer) => typeof layer === 'object' && layer !== null && typeof layer.id === 'string');
		if (!shaped) {
			throw new Error(
				'TileJSON validation: spec.vector_layers must be an array of objects each with a string id if present'
			);
		}
	}
}

/** A zoom level: a non-negative integer. */
function isZoom(value: unknown): boolean {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/**
 * Whether an object adheres to the TileJSON specification. Never throws.
 *
 * **npm only.** Not exported by the browser bundle (`versatiles-style.js`) — see the
 * `versatiles-style.js` module for what that carries.
 */
export function isTileJSONSpecification(spec: unknown): spec is TileJSONSpecification {
	try {
		assertTileJSONSpecification(spec);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validate an object as a *raster* TileJSON — a TileJSON with no `vector_layers`.
 * Throws the same descriptive errors as {@link assertTileJSONSpecification}.
 *
 * **npm only.** Not exported by the browser bundle (`versatiles-style.js`) — see the
 * `versatiles-style.js` module for what that carries.
 */
export function assertRasterTileJSONSpecification(spec: unknown): asserts spec is TileJSONSpecificationRaster {
	assertTileJSONSpecification(spec);
	if ('vector_layers' in spec && (spec as { vector_layers?: unknown }).vector_layers != null) {
		throw new Error('TileJSON validation: spec.vector_layers must be absent for a raster TileJSON');
	}
}

/**
 * Whether an object is a raster TileJSON (no `vector_layers`). Never throws.
 *
 * **npm only.** Not exported by the browser bundle (`versatiles-style.js`) — see the
 * `versatiles-style.js` module for what that carries.
 */
export function isRasterTileJSONSpecification(spec: unknown): spec is TileJSONSpecificationRaster {
	try {
		assertRasterTileJSONSpecification(spec);
		return true;
	} catch {
		return false;
	}
}

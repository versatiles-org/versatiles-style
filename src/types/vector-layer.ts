/** Represents the structure of a vector layer in a TileJSON specification. */
export interface VectorLayer {
	id: string;
	fields: Record<string, 'Boolean' | 'Number' | 'String'>;
	description?: string;
	minzoom?: number;
	maxzoom?: number;
}

/**
 * Validate an object against the VectorLayer structure, throwing a descriptive error naming the
 * offending field if it does not conform.
 *
 * Use {@link isVectorLayer} when you want a boolean instead. These were one function whose
 * `layer is VectorLayer` signature promised a predicate but which threw for every invalid input, so
 * `if (isVectorLayer(x))` blew up rather than taking the else branch — the same defect
 * `assertTileJSONSpecification` was split out of.
 */
export function assertVectorLayer(layer: unknown): asserts layer is VectorLayer {
	if (typeof layer !== 'object' || layer === null) {
		throw new Error('Layer must be a non-null object');
	}

	const obj = layer as Record<string, unknown>;

	if (typeof obj.id !== 'string') {
		throw new Error('Layer.id must be a string');
	}

	if (typeof obj.fields !== 'object' || obj.fields === null) {
		throw new Error('Layer.fields must be a non-null object');
	}
	if (Object.values(obj.fields).some((type) => !['Boolean', 'Number', 'String'].includes(type as string))) {
		throw new Error("Layer.fields values must be one of 'Boolean', 'Number', or 'String'");
	}

	if ('description' in obj && typeof obj.description !== 'string') {
		throw new Error('Layer.description must be a string if present');
	}

	if ('minzoom' in obj && (typeof obj.minzoom !== 'number' || obj.minzoom < 0)) {
		throw new Error('Layer.minzoom must be a non-negative number if present');
	}

	if ('maxzoom' in obj && (typeof obj.maxzoom !== 'number' || obj.maxzoom < 0)) {
		throw new Error('Layer.maxzoom must be a non-negative number if present');
	}
}

/** Whether an object conforms to the VectorLayer structure. Never throws. */
export function isVectorLayer(layer: unknown): layer is VectorLayer {
	try {
		assertVectorLayer(layer);
		return true;
	} catch {
		return false;
	}
}

/**
 * Validate a non-empty array of VectorLayers, throwing a descriptive error naming the offending
 * layer. Use {@link isVectorLayers} for a boolean.
 */
export function assertVectorLayers(layers: unknown): asserts layers is VectorLayer[] {
	if (!Array.isArray(layers)) {
		throw new Error('Expected an array of layers');
	}

	if (layers.length === 0) {
		throw new Error('Array of layers cannot be empty');
	}

	layers.forEach((layer, index) => {
		try {
			assertVectorLayer(layer);
		} catch (cause) {
			throw new Error(`Layer[${index}] is invalid`, { cause });
		}
	});
}

/** Whether an object is a non-empty array of VectorLayers. Never throws. */
export function isVectorLayers(layers: unknown): layers is VectorLayer[] {
	try {
		assertVectorLayers(layers);
		return true;
	} catch {
		return false;
	}
}

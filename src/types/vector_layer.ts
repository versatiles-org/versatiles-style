/** Represents the structure of a vector layer in a TileJSON specification. */
export interface VectorLayer {
	id: string;
	fields: Record<string, 'Boolean' | 'Number' | 'String'>;
	description?: string;
	minzoom?: number;
	maxzoom?: number;
}

/** 
* Verifies if an object conforms to the VectorLayer structure. 
* Throws errors for any deviations from the expected structure or types.
*/
export function isVectorLayer(layer: unknown): layer is VectorLayer {
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
	if (Object.values(obj.fields).some(type => !['Boolean', 'Number', 'String'].includes(type as string))) {
		throw new Error('Layer.fields values must be one of \'Boolean\', \'Number\', or \'String\'');
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

	return true;
}

export function isVectorLayers(layers: unknown): layers is VectorLayer[] {
	if (!Array.isArray(layers)) {
		throw new Error('Expected an array of layers');
	}

	if (layers.length === 0) {
		throw new Error('Array of layers cannot be empty');
	}

	layers.forEach((layer, index) => {
		try {
			if (!isVectorLayer(layer)) {
				throw new Error(`Layer[${index}] is invalid`);
			}
		} catch (error) {
			// Assuming `isVectorLayer` throws an error with a meaningful message, you can rethrow it
			// Alternatively, customize the error message or handle the error as needed
			throw new Error(`Layer[${index}] at invalid: ${String((error instanceof Error) ? error.message : error)}`);
		}
	});

	return true;
}

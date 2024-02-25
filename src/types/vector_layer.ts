
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
		return false;
	}

	const obj = layer as Record<string, unknown>;

	if (typeof obj.id !== 'string') return false;

	if (typeof obj.fields !== 'object' || obj.fields === null) return false;
	if (Object.values(obj.fields).some(type => !['Boolean', 'Number', 'String'].includes(type as string))) return false;

	if ('description' in obj && typeof obj.description !== 'string') return false;

	if ('minzoom' in obj && (typeof obj.minzoom !== 'number' || obj.minzoom < 0)) return false;

	if ('maxzoom' in obj && (typeof obj.maxzoom !== 'number' || obj.maxzoom < 0)) return false;

	return true;
}

export function isVectorLayers(layers: unknown): layers is VectorLayer[] {
	if (!Array.isArray(layers)) return false;
	if (layers.length === 0) return false;
	return layers.every(layer => isVectorLayer(layer));
}

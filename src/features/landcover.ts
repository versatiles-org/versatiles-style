import type { StyleSpecification } from '../types/index.js';

// In "landcover mode" the user is expected to have a raster landcover layer underneath
// the OSM vector layers. This function removes zoom-based fade-in opacity on land fill
// layers so the raster shows through uniformly — rather than the vector fills fading in
// at specific zoom levels, they are set to a constant low opacity from the start.
//
// Affected layers: land-forest (already has low opacity), land-grass, land-vegetation,
// land-park, land-garden, land-agriculture, land-residential, land-commercial, land-industrial,
// land-waste, land-burial.
const LANDCOVER_AFFECTED = new Set([
	'land-grass',
	'land-vegetation',
	'land-park',
	'land-garden',
	'land-agriculture',
	'land-residential',
	'land-commercial',
	'land-industrial',
	'land-waste',
	'land-burial',
]);

export function addLandcover(style: StyleSpecification): StyleSpecification {
	const result = structuredClone(style);
	for (const layer of result.layers) {
		if (!LANDCOVER_AFFECTED.has(layer.id)) continue;
		if (layer.type !== 'fill') continue;
		// Remove zoom-dependent opacity so the layer appears at full opacity immediately,
		// letting the raster landcover control the visual at all zoom levels.
		const paint = layer.paint as Record<string, unknown> | undefined;
		if (paint && 'fill-opacity' in paint) {
			delete paint['fill-opacity'];
		}
	}
	return result;
}

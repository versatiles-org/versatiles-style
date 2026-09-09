import type { StyleSpecification } from '../types/index.js';
import { LANDCOVER_LAYERS } from '../shortbread/layers/landcover.js';

// Low-zoom landcover (https://docs.versatiles.org/compendium/specification_shortbread_landcover.html).
//
// The landcover tileset writes ESA WorldCover data into the EXISTING `land` and `water_polygons`
// source-layers, reusing existing `kind` values, only *below* the zoom where OSM introduces each
// kind. So no extra source or layers are needed — the matching fill layers already render those
// kinds. They are merely hidden at low zoom by their zoom-based fade-in.
//
// `addLandcover` removes that fade-in on exactly the layers whose `kind` carries landcover data,
// replacing the zoom ramp with its fully-faded-in (max) opacity. This keeps each layer's high-zoom
// appearance identical while making it visible at low zoom.
//
// The set of affected layers is derived from the layer definitions themselves
// (`LANDCOVER_LAYERS`), not restated here — the three hand-maintained copies of this knowledge are
// what produced the defects in issue #124.

// The fully-faded-in opacity of a fill-opacity value that may be a constant number or a
// ['interpolate', ['linear'], ['zoom'], z0, v0, …] zoom ramp.
function fadedInOpacity(value: unknown): number {
	if (typeof value === 'number') return value;
	if (Array.isArray(value) && value[0] === 'interpolate') {
		let max = 0;
		for (let i = 4; i < value.length; i += 2) {
			if (typeof value[i] === 'number') max = Math.max(max, value[i] as number);
		}
		return max;
	}
	return 1; // no opacity set → fully opaque
}

export function addLandcover(style: StyleSpecification) {
	for (const layer of style.layers) {
		if (!LANDCOVER_LAYERS.has(layer.id)) continue;
		if (layer.type !== 'fill') continue;
		const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
		paint['fill-opacity'] = fadedInOpacity(paint['fill-opacity']);
		// `appear` also sets a matching `minzoom`; it has to go, or the fill stays hidden below its
		// OSM appearance zoom and the extension's low-zoom data never shows.
		delete (layer as { minzoom?: number }).minzoom;
	}
}

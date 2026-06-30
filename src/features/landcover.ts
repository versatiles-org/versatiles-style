import type { StyleSpecification } from '../types/index.js';

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
// kind → layer:  forest→land-forest, grassland→land-grass, scrub→land-vegetation,
// farmland→land-agriculture, residential→land-residential, sand→land-sand, marsh/swamp→land-wetland,
// water→water-area. (glacier→land-glacier already renders at all zooms with constant opacity, so it
// needs no change.) The extension provides every kind below the zoom where OSM introduces it, so the
// fill must be visible from z0 onward — not fade in — which is why the zoom ramp is removed entirely.
const LANDCOVER_DEFADE = new Set([
	'land-forest',
	'land-grass',
	'land-vegetation',
	'land-agriculture',
	'land-residential',
	'land-sand',
	'land-wetland',
	'water-area',
]);

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
		if (!LANDCOVER_DEFADE.has(layer.id)) continue;
		if (layer.type !== 'fill') continue;
		const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
		paint['fill-opacity'] = fadedInOpacity(paint['fill-opacity']);
	}
}

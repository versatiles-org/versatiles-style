import type { LayerContext } from '../context.js';
import type { LayerOverride } from '../groups.js';
import type { MaplibreLayer } from '../../types/index.js';
import { slot, type TaggedLayer } from '../build.js';
import { background } from './background.js';
import { landcover } from './landcover.js';
import { water } from './water.js';
import { sites } from './sites.js';
import { airport } from './airport.js';
import { buildings } from './buildings.js';
import { roads } from './roads.js';
import { pois } from './pois.js';
import { boundaries } from './boundaries.js';
import { markings } from './markings.js';
import { transitStops } from './transitstops.js';
import { labels } from './labels.js';

// Slot anchor layers — stable IDs used as MapLibre `beforeId` targets.
export const SLOT_BELOW_FILLS = 'slot-below-fills';
export const SLOT_BELOW_STREETS = 'slot-below-streets';
export const SLOT_BELOW_SYMBOLS = 'slot-below-symbols';
export const SLOT_BELOW_LABELS = 'slot-below-labels';

// Assemble every group's decorated layers in render order (bottom → top), with slot anchors
// at the four stable positions. Each group module owns both the structure and style of its layers.
export function* shortbreadLayers(ctx: LayerContext): Generator<TaggedLayer> {
	yield* background(ctx);
	yield slot(SLOT_BELOW_FILLS);
	yield* landcover(ctx);
	yield* water(ctx);
	yield* sites(ctx);
	yield* airport(ctx);
	yield* buildings(ctx);
	yield slot(SLOT_BELOW_STREETS);
	yield* roads(ctx);
	yield slot(SLOT_BELOW_SYMBOLS);
	yield* pois(ctx);
	yield* boundaries(ctx);
	yield* markings(ctx);
	yield* transitStops(ctx);
	yield slot(SLOT_BELOW_LABELS);
	yield* labels(ctx);
}

// Set the type-appropriate opacity paint property on a single layer.
function setLayerOpacity(layer: { type: string; paint?: unknown }, opacity: number): void {
	const paint = (layer.paint ?? {}) as Record<string, unknown>;
	switch (layer.type) {
		case 'fill':
			paint['fill-opacity'] = opacity;
			break;
		case 'line':
			paint['line-opacity'] = opacity;
			break;
		case 'symbol':
			paint['text-opacity'] = opacity;
			paint['icon-opacity'] = opacity;
			break;
		case 'background':
			paint['background-opacity'] = opacity;
			break;
		case 'fill-extrusion':
			paint['fill-extrusion-opacity'] = opacity;
			break;
		case 'raster':
			paint['raster-opacity'] = opacity;
			break;
	}
	layer.paint = paint as typeof layer.paint;
}

// Materialize the assembled layers, adding the source to every non-background layer
// (background + slot anchors carry no source), ready to drop into a style.
//
// `overrides` (from the `layers:` option) is applied here, at creation time: a layer
// the config makes invisible — hidden, or opacity 0 — is dropped entirely rather than
// emitted as a no-op; a fractional opacity is baked into the layer's paint.
export function buildStyleLayers(ctx: LayerContext, overrides?: Map<string, LayerOverride>): MaplibreLayer[] {
	const layers: MaplibreLayer[] = [];
	for (const { layer } of shortbreadLayers(ctx)) {
		const override = overrides?.get(layer.id);
		if (override && (!override.visible || override.opacity === 0)) continue;

		const out = layer.type === 'background' ? layer : ({ ...layer, source: ctx.source } as MaplibreLayer);
		if (override?.opacity !== undefined) setLayerOpacity(out, override.opacity);
		layers.push(out);
	}
	return layers;
}

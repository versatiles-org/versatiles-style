import type { LayerContext } from '../context.js';
import type { MaplibreLayer } from '../../types/index.js';
import { slot, type TaggedLayer } from '../build.js';
import { background } from './background.js';
import { landcover } from './landcover.js';
import { water } from './water.js';
import { sites } from './sites.js';
import { airport } from './airport.js';
import { buildings, buildings3d } from './buildings.js';
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
	// OSM Bright renders site areas (hospital/school/…) as low `landuse` fills, beneath water.
	yield* sites(ctx);
	yield* water(ctx);
	// OSM Bright draws aeroway (runways/taxiways) above buildings, below the street network.
	yield* airport(ctx);
	yield* buildings(ctx);
	yield slot(SLOT_BELOW_STREETS);
	yield* roads(ctx);
	yield slot(SLOT_BELOW_SYMBOLS);
	// OSM Bright overlay order is boundaries → markings → POIs (POIs sit above road markings).
	yield* boundaries(ctx);
	yield* markings(ctx);
	yield* pois(ctx);
	yield* transitStops(ctx);
	yield slot(SLOT_BELOW_LABELS);
	yield* labels(ctx);
	// Extruded 3D buildings render last (above labels) so tall buildings are not occluded.
	yield* buildings3d(ctx);
}

// Materialize the assembled layers, adding the source to every non-background layer
// (background + slot anchors carry no source), ready to drop into a style. Per-group
// visibility/opacity is already applied by each generator (see `gate` in build.ts).
export function buildStyleLayers(ctx: LayerContext): MaplibreLayer[] {
	const layers: MaplibreLayer[] = [];
	for (const { layer } of shortbreadLayers(ctx)) {
		layers.push(layer.type === 'background' ? layer : ({ ...layer, source: ctx.source } as MaplibreLayer));
	}
	return layers;
}

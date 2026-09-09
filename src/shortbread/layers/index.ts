import type { LayerContext } from '../context.js';
import type { MaplibreLayer } from '../../types/index.js';
import { slot, gate, type TaggedLayer } from '../build.js';
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
import { labels, addresses } from './labels.js';
import { SHORTBREAD_SCHEMA } from '../schema.js';

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
	// House numbers sit at the very bottom of the symbol stack, so they are placed last and have the
	// lowest collision priority — markings, POIs, transit stops and all other labels win over them.
	yield* addresses(ctx);
	yield* markings(ctx);
	yield* pois(ctx);
	yield* transitStops(ctx);
	yield slot(SLOT_BELOW_LABELS);
	yield* labels(ctx);
	// Extruded 3D buildings render last (above labels) so tall buildings are not occluded.
	yield* buildings3d(ctx);
}

// Materialize the assembled layers, adding the source to every non-background layer (background +
// slot anchors carry no source), ready to drop into a style. Per-group visibility/opacity from the
// `layers:` option is applied here in a single pass by `gate`: hidden groups are dropped, fractional
// opacity is merged into each affected layer.
export function buildStyleLayers(ctx: LayerContext): MaplibreLayer[] {
	const layers: MaplibreLayer[] = [];
	for (const { layer } of gate(ctx.layers, shortbreadLayers(ctx))) {
		if (layer.type !== 'background') applyDataFloor(layer);
		layers.push(layer.type === 'background' ? layer : ({ ...layer, source: ctx.source } as MaplibreLayer));
	}
	return layers;
}

/**
 * Raise a layer's `minzoom` to the zoom where its source-layer's data actually begins.
 *
 * `make()` derives `minzoom` from a layer's transition, which covers everything that fades or grows
 * in. Layers with no transition had no gate at all, so MapLibre processed them from z0 while the
 * tiles carried nothing — `water-river` was live from z0 although `water_lines` starts at z9.
 *
 * Only ever raises, never lowers: a layer deliberately gated later than its data keeps that.
 * `addLandcover` runs after this and clears the gate on the fills it reveals, which is what lets
 * the low-zoom landcover extension supply those kinds below their plain-Shortbread zoom (#124).
 */
function applyDataFloor(layer: MaplibreLayer): void {
	const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
	if (!sourceLayer) return;
	const dataFrom = SHORTBREAD_SCHEMA[sourceLayer]?.minzoom;
	if (dataFrom === undefined) return;
	const l = layer as { minzoom?: number };
	if ((l.minzoom ?? 0) < dataFrom) l.minzoom = dataFrom;
}

import type { LayerContext } from '../context.js';
import type { MaplibreLayer } from '../../types/index.js';
import { slot, buildLayers, type TaggedLayer } from '../../dsl/index.js';
import { airport } from './airport.js';
import { background } from './background.js';
import { boundaries } from './boundaries.js';
import { markings } from './markings.js';
import { pois } from './pois.js';
import { buildings, buildings3d } from './buildings.js';
import { featureLabels, placeLabels, addresses } from './labels.js';
import { landcover } from './landcover.js';
import { roads } from './roads.js';
import { sites } from './sites.js';
import { transitStops } from './transitstops.js';
import { water } from './water.js';
import { PROTOMAPS_SCHEMA } from '../schema.js';

/**
 * The Protomaps layer assembler — the third and, by this point, the cheapest.
 *
 * Compared with `src/shortbread/layers/index.ts` the only thing restated is the render order below: the
 * slot anchors, the gating and the data floor come from `src/dsl/`, and five of the twelve modules are
 * thin wrappers over `src/cartography/`.
 */

// Slot anchor layers — the same four ids every schema emits.
export const SLOT_BELOW_FILLS = 'slot-below-fills';
export const SLOT_BELOW_STREETS = 'slot-below-streets';
export const SLOT_BELOW_SYMBOLS = 'slot-below-symbols';
export const SLOT_BELOW_LABELS = 'slot-below-labels';

/** Every group's decorated layers in render order (bottom → top), with the four slot anchors. */
export function* protomapsLayers(ctx: LayerContext): Generator<TaggedLayer> {
	yield* background(ctx);
	yield slot(SLOT_BELOW_FILLS);
	yield* landcover(ctx);
	// OSM Bright renders site areas (hospital/school/…) as low `landuse` fills, beneath water.
	yield* sites(ctx);
	yield* water(ctx);
	// Aeroway (runways/taxiways) sits above water and below buildings, so a terminal reads on top of
	// the apron it stands on, and the street network above both.
	yield* airport(ctx);
	yield* buildings(ctx);
	yield slot(SLOT_BELOW_STREETS);
	yield* roads(ctx);
	yield slot(SLOT_BELOW_SYMBOLS);
	// OSM Bright overlay order is boundaries → markings → POIs (POIs sit above road markings).
	yield* boundaries(ctx);
	yield* addresses(ctx);
	yield* markings(ctx);
	yield* pois(ctx);
	yield slot(SLOT_BELOW_LABELS);
	yield* featureLabels(ctx);
	// Transit stops sit between the two label bands so a stop outranks the street name it stands on;
	// see the Shortbread assembler for why emitting them before the labels drops most of them.
	yield* transitStops(ctx);
	yield* placeLabels(ctx);
	// Extruded 3D buildings render last (above labels) so tall buildings are not occluded.
	yield* buildings3d(ctx);
}

/** The built Protomaps layer list. See `buildStyleLayers` in the Shortbread assembler. */
export function buildStyleLayers(ctx: LayerContext): MaplibreLayer[] {
	return buildLayers(ctx, PROTOMAPS_SCHEMA, protomapsLayers(ctx));
}

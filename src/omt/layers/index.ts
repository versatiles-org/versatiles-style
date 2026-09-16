import type { LayerContext } from '../context.js';
import type { MaplibreLayer } from '../../types/index.js';
import { slot, buildLayers, mergeIdenticalLayers, type TaggedLayer, type MergeTable } from '../../dsl/';
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
import { OMT_SCHEMA } from '../schema.js';

/**
 * The OpenMapTiles layer assembler — **incomplete**, one module in.
 *
 * SCHEMA-SUPPORT-PLAN.md §7 step 4 seeds this directory with a single module so the real per-module
 * cost can be measured before committing to the remaining twelve. Nothing here is wired into a public
 * `omt()` yet (that is step 6), and §23 is explicit that a half-ported schema reads as broken, so this
 * must not be exported from `src/index.ts` or a subpath until the port is complete.
 *
 * What it demonstrates is the shape of the seam: compared with `src/shortbread/layers/index.ts` the only
 * things restated are the render order below and the merge table — the slot anchors, the gating, the data
 * floor and the merge machinery all come from `src/dsl/`.
 */

// Slot anchor layers. The ids are deliberately the same strings Shortbread uses: §6 requires every
// schema to emit the same four anchors, so that `slots` stays a schema-neutral static and a caller's
// `beforeId` keeps working whichever schema built the style.
export const SLOT_BELOW_FILLS = 'slot-below-fills';
export const SLOT_BELOW_STREETS = 'slot-below-streets';
export const SLOT_BELOW_SYMBOLS = 'slot-below-symbols';
export const SLOT_BELOW_LABELS = 'slot-below-labels';

/**
 * Every group's decorated layers in render order (bottom → top), with slot anchors at the four stable
 * positions — the OpenMapTiles counterpart of Shortbread's `assembleLayers`.
 *
 * The commented entries are the modules still to be ported, kept in Shortbread's render order so the
 * two lists can be read side by side and so the order is decided once, here, rather than rediscovered
 * per module. `water` sits where it does for the same reason it does there: above the land fills.
 */
export function* assembleLayers(ctx: LayerContext): Generator<TaggedLayer> {
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
	yield* addresses(ctx);
	yield* markings(ctx);
	yield* pois(ctx);
	yield slot(SLOT_BELOW_LABELS);
	yield* featureLabels(ctx);
	// Transit stops sit between the two label bands so a stop outranks the street name it stands on;
	// see the Shortbread assembler for why emitting them before the labels drops most of them.
	yield* transitStops(ctx);
	// `mountain_peak` has no Shortbread counterpart and is therefore not drawn; see the conformance test.
	yield* placeLabels(ctx);
	// Extruded 3D buildings render last (above labels) so tall buildings are not occluded.
	yield* buildings3d(ctx);
}

/**
 * Layers OpenMapTiles draws identically, by merged id (issue #51).
 *
 * Empty while only `water` exists: its layers differ in colour or width, so no run is identical. This
 * table is per-schema by necessity — it is keyed by layer id, and ids are a schema's own dialect — and
 * it is the one §3 names as such alongside the cartography.
 */
const MERGES: MergeTable = {};

export function* omtLayers(ctx: LayerContext): Generator<TaggedLayer> {
	yield* mergeIdenticalLayers(MERGES, assembleLayers(ctx));
}

/** The built OpenMapTiles layer list. See `buildStyleLayers` in the Shortbread assembler. */
export function buildStyleLayers(ctx: LayerContext): MaplibreLayer[] {
	return buildLayers(ctx, OMT_SCHEMA, omtLayers(ctx));
}

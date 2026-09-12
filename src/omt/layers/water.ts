import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';

// Water for the OpenMapTiles schema: the `waterway` lines and the `water` polygons.
//
// ── What this module is, and what it is not ───────────────────────────────────
//
// This is the seed module of SCHEMA-SUPPORT-PLAN.md §7 step 4 — one module ported so the per-module
// effort can be measured against the estimate rather than guessed. It is a port of
// `src/shortbread/layers/water.ts`: the same groups, the same colour derivation, the same widths, so
// that what differs is only what the schema forces to differ.
//
// **The class values below are confirmed against real tiles** by
// `npm run schema-values -- omt water waterway`: all five `waterway` classes (river, canal, stream,
// ditch, drain) and all five `water` classes occur in the sample — `dock` only in the Rotterdam port
// tile, which is why that tile is in the sample at all. `brunnel: bridge` is the one value still
// unobserved, and absence across a dozen tiles is weak evidence: a filter value the tiles never use
// costs nothing, where a missing one loses features. Both layers are single-geometry (`water` polygons,
// `waterway` lines), so unlike `aeroway` neither needs a geometry-type filter.
//
// ── Three things the schema decides differently ───────────────────────────────
//
//  1. **Ocean is a class, not a layer.** Shortbread serves `ocean` as its own source-layer and draws it
//     in the landcover band, below the land fills. OpenMapTiles has `water` with `class: ocean`, so the
//     ocean fill cannot be separated from the other water polygons by source-layer, only by filter. It
//     is emitted here, first in the band; once the landcover module exists, whether it needs to move
//     below the land fills is a real question this port has not answered.
//  2. **`brunnel` replaces `tunnel`/`bridge`.** Shortbread carries two booleans; OpenMapTiles carries
//     one enum (`bridge` / `tunnel` / `ford`), so the two exclusions become two `!=` tests on one field.
//  3. **No dams and no pier polygons.** `water.piers` has nothing to bind to — see the group note at
//     the bottom of this file.

// Waterway line widths, carried over unchanged from the Shortbread module (OSM Bright curves,
// base ~1.2–1.3). `river` is wider and starts earlier.
const LINE_SIZES: Record<string, b.ExpStops> = {
	river: { base: 1.2, stops: { 10: 0.8, 20: 6 } },
	canal: { base: 1.3, stops: { 13: 0.5, 20: 6 } },
	stream: { base: 1.3, stops: { 13: 0.5, 20: 6 } },
	ditch: { base: 1.3, stops: { 13: 0.5, 20: 2 } },
	drain: { base: 1.3, stops: { 13: 0.5, 20: 2 } },
};

// Per-class data floors inside `waterway`. The record states the source-layer starts at z3, which is
// true of rivers; the smaller classes are not tiled nearly that early, and `applyDataFloor` can only
// gate at the source-layer minzoom, so without this they would be processed for ten zoom levels that
// carry no such feature.
//
// Unlike the Shortbread table these numbers are NOT measured: the value sample confirms *which* classes
// exist, not the zoom each one starts at, which needs a zoom sweep. Measuring them the way the
// Shortbread comment describes is outstanding.
const LINE_MINZOOM: Record<string, number> = { canal: 9, stream: 13, ditch: 14, drain: 14 };

/** Shortbread's `tunnel`/`bridge` booleans, as OpenMapTiles' single `brunnel` enum. */
const AT_GRADE: ExpressionSpecification = [
	'all',
	['!=', ['get', 'brunnel'], 'tunnel'],
	['!=', ['get', 'brunnel'], 'bridge'],
];

export function* water(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c, fg } = ctx;
	// Identical derivation to the Shortbread module: a slightly deeper, more saturated blue than the
	// fill, blended toward `fg` so it stays a contrasting tone in both light and dark palettes.
	const waterLine = c.water.saturate(0.5).blend(0.07, fg);

	// The ocean, and the `water` polygons behind everything else in the band. OpenMapTiles serves
	// `water` from z0, so unlike Shortbread (z4, where a fade-in was needed to stop the low-zoom
	// landcover extension leaking — issue #124) these need no appearance ramp.
	yield b.fill('water-ocean', {
		sourceLayer: 'water',
		filter: ['==', ['get', 'class'], 'ocean'],
		color: c.water,
		group: 'water.ocean',
	});
	yield b.fill('water-area', {
		sourceLayer: 'water',
		// `lake` and `pond` are the Shortbread `water` kind; `swimming_pool` and `dock` stand in for its
		// `reservoir`/`basin`/`dock` small-water fills, which OpenMapTiles does not separate out.
		filter: ['in', ['get', 'class'], ['literal', ['lake', 'pond', 'swimming_pool', 'dock']]],
		color: c.water,
		group: 'water.lakes',
	});
	yield b.fill('water-area-river', {
		sourceLayer: 'water',
		filter: ['==', ['get', 'class'], 'river'],
		color: c.water,
		group: 'water.rivers',
	});

	// Flowing water (lines). `drain` has no Shortbread counterpart — Shortbread has no such kind — so it
	// is drawn as a ditch, which is the nearest thing the palette and the width table already express.
	for (const kind of ['river', 'canal', 'stream', 'ditch', 'drain'] as const) {
		yield b.line('water-' + kind, {
			sourceLayer: 'waterway',
			filter: ['all', ['==', ['get', 'class'], kind], AT_GRADE],
			color: waterLine,
			lineCap: 'round',
			lineJoin: 'round',
			size: LINE_SIZES[kind],
			minzoom: LINE_MINZOOM[kind],
			group: 'water.rivers',
		});
	}

	// ── `water.piers` yields nothing, deliberately ──────────────────────────────
	//
	// Shortbread draws six layers here from four source-layers: `dam_lines`, `dam_polygons`,
	// `pier_lines` and `pier_polygons`. OpenMapTiles has no dam concept at all (its `waterway` classes
	// are the five flowing kinds, and `water` has no dam class), and no polygon piers — `transportation`
	// is lines only. A linear pier is *expected* under `transportation.subclass`, but that is a value
	// claim the record cannot support, and piers belong to the roads module's source-layer rather than
	// this one, so it is left for the port of that module to decide.
	//
	// This is the one place the gate's verdict is visible in code: `water.piers` loses 3 of its 4 layers,
	// which is why it appears in the gate's "survive but lose part of themselves" list rather than among
	// the groups that bind cleanly.
}

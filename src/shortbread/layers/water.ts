import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../build.js';
import { WATER_POLYGONS_APPEAR } from './landcover.js';

// Inland water: rivers/canals/streams/ditches (lines), water polygons, dams and piers.
// These sit ABOVE the land fills (which is why ocean lives in the landcover band instead).

// OSM Bright waterway line widths (base ~1.2–1.3). river is wider and starts earlier.
const LINE_SIZES: Record<string, b.ExpStops> = {
	river: { base: 1.2, stops: { 10: 0.8, 20: 6 } },
	canal: { base: 1.3, stops: { 13: 0.5, 20: 6 } },
	stream: { base: 1.3, stops: { 13: 0.5, 20: 6 } },
	ditch: { base: 1.3, stops: { 13: 0.5, 20: 2 } },
};

// Per-kind data floors inside `water_lines`. `applyDataFloor` can only gate at the SOURCE-LAYER
// minzoom, which the tileset reports as 9 — true for rivers and canals, but streams and ditches are
// not tiled until z14, so without this they would be processed for five zoom levels that carry no
// such feature. None of these widths ramps from 0, so nothing else derives a gate for them.
//
// Measured against the live tileset rather than taken from the prose spec, which says rivers and
// canals are "not below 12" — the VersaTiles tiles in fact carry both from z9, so trusting the prose
// here would have hidden them. Streams and ditches were absent below z14 in every region sampled
// (Black Forest, Wales, Vermont, Bavaria, Dutch polder) and the spec agrees at "14+".
const LINE_MINZOOM: Record<string, number> = { stream: 14, ditch: 14 };

export function* water(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c, fg } = ctx;
	// OSM Bright draws waterway lines in a slightly deeper blue than the water fill (#a0c8f0).
	// Blend toward `fg` (pure black in light mode / white in dark mode) instead of an absolute
	// darken, so the line stays a contrasting deeper tone in both light and dark palettes.
	const waterLine = c.water.saturate(0.5).blend(0.07, fg);

	// flowing water (lines)
	for (const kind of ['river', 'canal', 'stream', 'ditch'] as const) {
		yield b.line('water-' + kind, {
			sourceLayer: 'water_lines',
			filter: ['all', ['==', ['get', 'kind'], kind], ['!=', ['get', 'tunnel'], true], ['!=', ['get', 'bridge'], true]],
			color: waterLine,
			lineCap: 'round',
			lineJoin: 'round',
			size: LINE_SIZES[kind],
			minzoom: LINE_MINZOOM[kind],
			group: 'water.rivers',
		});
	}

	// water polygons — Shortbread serves `water_polygons` from z4, so these fade in there rather
	// than painting at full opacity from z0. Without the fade they leak the low-zoom landcover
	// extension's data at z0–3 even when `features.landcover` is off (issue #124).
	yield b.fill('water-area', {
		sourceLayer: 'water_polygons',
		filter: ['==', ['get', 'kind'], 'water'],
		color: c.water,
		appear: WATER_POLYGONS_APPEAR,
		group: 'water.lakes',
	});
	yield b.fill('water-area-river', {
		sourceLayer: 'water_polygons',
		filter: ['==', ['get', 'kind'], 'river'],
		color: c.water,
		appear: WATER_POLYGONS_APPEAR,
		group: 'water.rivers',
	});
	yield b.fill('water-area-small', {
		sourceLayer: 'water_polygons',
		filter: ['in', ['get', 'kind'], ['literal', ['reservoir', 'basin', 'dock']]],
		color: c.water,
		appear: WATER_POLYGONS_APPEAR,
		group: 'water.lakes',
	});

	// dam
	yield b.fill('water-dam-area', {
		sourceLayer: 'dam_polygons',
		filter: ['==', ['get', 'kind'], 'dam'],
		color: c.land,
		opacity: { 12: 0, 13: 1 },
		group: 'water.piers',
	});
	yield b.line('water-dam', {
		sourceLayer: 'dam_lines',
		filter: ['==', ['get', 'kind'], 'dam'],
		color: c.water,
		lineCap: 'round',
		lineJoin: 'round',
		group: 'water.piers',
	});

	// pier
	const pierKinds: FilterSpecification = ['in', ['get', 'kind'], ['literal', ['pier', 'breakwater', 'groyne']]];
	yield b.fill('water-pier-area', {
		sourceLayer: 'pier_polygons',
		filter: pierKinds,
		color: c.land,
		opacity: { 12: 0, 13: 1 },
		group: 'water.piers',
	});
	yield b.line('water-pier', {
		sourceLayer: 'pier_lines',
		filter: pierKinds,
		color: c.land,
		lineCap: 'round',
		lineJoin: 'round',
		group: 'water.piers',
	});
}

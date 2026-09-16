import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/';

// Water for Protomaps: one `water` source-layer carrying every kind, at every geometry type.
//
// ── What the tiles say ────────────────────────────────────────────────────────
//
// From `npm run schema-values -- protomaps water`: `kind` is ocean, lake, water, river, canal, stream,
// dock, swimming_pool, bay, fountain — and the layer is **mixed geometry**, with `canal`/`stream`/
// `river` appearing as lines and `lake`/`water`/`dock`/`ocean` as polygons. `kind_detail` refines the
// polygons (lake, river, basin, canal, ditch). `is_bridge`-style flags are `bridge` and `tunnel`, both
// booleans, as in Shortbread.
//
// So where Shortbread reads four source-layers and OpenMapTiles two, Protomaps reads one and separates
// by geometry type — the same hazard the OpenMapTiles port hit with `transportation`: a line layer
// paints polygon boundaries, so every layer here states the geometry it wants.
//
// Dams remain absent, as they are in OpenMapTiles: no dam kind was observed in any layer.

const LINES: ExpressionSpecification = ['==', ['geometry-type'], 'LineString'];
const AREAS: ExpressionSpecification = ['==', ['geometry-type'], 'Polygon'];

// OSM Bright waterway line widths, as in the other two ports.
const LINE_SIZES: Record<string, b.ExpStops> = {
	river: { base: 1.2, stops: { 10: 0.8, 20: 6 } },
	canal: { base: 1.3, stops: { 13: 0.5, 20: 6 } },
	stream: { base: 1.3, stops: { 13: 0.5, 20: 6 } },
};

/**
 * Carried over from the Shortbread table, not measured — as in the OpenMapTiles port. `river` starts at z9
 * and `stream` at z14 as in Shortbread, whose tiles have neither earlier; Protomaps carries river lines
 * from z6 and streams from z13.
 */
const LINE_MINZOOM: Record<string, number> = { river: 9, canal: 9, stream: 14 };

/**
 * A river area: `kind: water, kind_detail: river` in the tiles (197 in the cache), or `kind: river` for a
 * build that spells it that way. Canal areas (`kind_detail: canal`) stay with the lakes, as in Shortbread,
 * whose tiles file them as plain `water`. Matching `kind: river | canal` alone — as this module once did —
 * matched no polygon, so every river was drawn by `water.lakes` and `layers.water.rivers` hid nothing.
 */
const IS_RIVER_AREA: ExpressionSpecification = [
	'any',
	['in', ['get', 'kind'], ['literal', ['river', 'canal']]],
	['==', ['get', 'kind_detail'], 'river'],
];
const NOT_RIVER_AREA: ExpressionSpecification = ['!=', ['get', 'kind_detail'], 'river'];

/** Shortbread's `tunnel`/`bridge` booleans, which Protomaps happens to spell the same way. */
const AT_GRADE: ExpressionSpecification = ['all', ['!=', ['get', 'tunnel'], true], ['!=', ['get', 'bridge'], true]];

export function* water(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c, fg } = ctx;
	const waterLine = c.water.saturate(0.5).blend(0.07, fg);

	yield b.fill('water-ocean', {
		sourceLayer: 'water',
		filter: ['all', AREAS, ['==', ['get', 'kind'], 'ocean']],
		color: c.water,
		group: 'water.ocean',
	});
	yield b.fill('water-area', {
		sourceLayer: 'water',
		// `water` is the generic kind, `lake` the named one; `dock` and `swimming_pool` stand in for
		// Shortbread's small-water fills, and `fountain` basins are water in Shortbread and OpenMapTiles
		// too. River areas are generic `water` as well, told apart only by `kind_detail: river`, so they
		// are excluded here and drawn below.
		filter: [
			'all',
			AREAS,
			['in', ['get', 'kind'], ['literal', ['lake', 'water', 'dock', 'swimming_pool', 'fountain']]],
			NOT_RIVER_AREA,
		],
		color: c.water,
		group: 'water.lakes',
	});
	yield b.fill('water-area-river', {
		sourceLayer: 'water',
		filter: ['all', AREAS, IS_RIVER_AREA],
		color: c.water,
		group: 'water.rivers',
	});

	for (const kind of ['river', 'canal', 'stream'] as const) {
		yield b.line('water-' + kind, {
			sourceLayer: 'water',
			filter: ['all', LINES, ['==', ['get', 'kind'], kind], AT_GRADE],
			color: waterLine,
			lineCap: 'round',
			lineJoin: 'round',
			size: LINE_SIZES[kind],
			minzoom: LINE_MINZOOM[kind],
			group: 'water.rivers',
		});
	}

	// Piers: the two halves live in two different layers here — the line in `roads` (`kind_detail: pier`)
	// and the area in `landuse` (`kind: pier`), both verified. The area is drawn with the land colour, as
	// in the other ports; the line is emitted by the roads module, which owns that source-layer.
	yield b.fill('water-pier-area', {
		sourceLayer: 'landuse',
		filter: ['==', ['get', 'kind'], 'pier'],
		color: c.land,
		opacity: { 12: 0, 13: 1 },
		group: 'water.piers',
	});
}

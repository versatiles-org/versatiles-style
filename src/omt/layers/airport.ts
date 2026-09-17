import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../../dsl/index.js';

// Airport runways and taxiways for OpenMapTiles. All in the `airport` group.
//
// ── The finding that made this module possible ────────────────────────────────
//
// The gate first rated this group unportable, because Shortbread reads its paved areas from
// `street_polygons` and the published schema reads as though `transportation` — and by extension
// `aeroway` — carried lines only. `npm run schema-values -- omt aeroway` says otherwise:
//
//   taxiway    360×  line        apron      28×  polygon
//   runway      19×  line + polygon          helipad     6×  polygon
//   aerodrome    2×  polygon
//
// So **one source-layer carries both geometries**, and `runway` carries both under a single class. That
// has a correctness consequence Shortbread never had to handle: a MapLibre *line* layer paints the
// boundary of a polygon, so without an explicit geometry-type filter the runway line layers would trace
// the outline of every runway area as well as the centrelines. Every layer below therefore states the
// geometry it wants.
//
// The twelve-tile sample had seven `aeroway` features in total and not one taxiway, which is why
// `scripts/schema-values.ts` now samples two airports: a sample is evidence only for what it contains.

/** Polygons only — a fill would otherwise ignore the lines, but be joined by their bounding boxes. */
const AREAS: FilterSpecification = [
	'all',
	['==', ['geometry-type'], 'Polygon'],
	// Shortbread's two paved kinds, and nothing else. `aerodrome` is the whole airport boundary, which
	// would tint several square kilometres in the street colour. `apron` and `helipad` have no counterpart
	// in Shortbread's tiles: filled, the aprons made Schiphol a tenth of the picture larger in white than
	// in the other two schemas.
	['in', ['get', 'class'], ['literal', ['runway', 'taxiway']]],
];

/** A centreline of one class. Lines only, for the reason in the header. */
const centreline = (kind: string): FilterSpecification => [
	'all',
	['==', ['geometry-type'], 'LineString'],
	['==', ['get', 'class'], kind],
];

export function* airport(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;
	// Old VersaTiles aeroway casing is the light warm-grey street casing; fills are white.
	const casing = c.roadStreetBg;

	// Shortbread draws only runway and taxiway areas; `apron` and `helipad` are the same paved surface
	// and read as one with them, so they join the area fill rather than being dropped.
	yield b.fill('airport-area', {
		sourceLayer: 'aeroway',
		filter: AREAS,
		color: c.roadStreet,
		opacity: { 13: 0, 14: 1 },
		group: 'airport',
	});

	yield b.line('airport-taxiway:outline', {
		sourceLayer: 'aeroway',
		filter: centreline('taxiway'),
		color: casing,
		lineCap: 'butt',
		lineJoin: 'round',
		minzoom: 12,
		size: { 13: 0, 14: 2, 15: 10, 16: 14, 18: 20, 20: 40 },
		group: 'airport',
	});
	yield b.line('airport-runway:outline', {
		sourceLayer: 'aeroway',
		filter: centreline('runway'),
		color: casing,
		lineCap: 'butt',
		lineJoin: 'round',
		minzoom: 12,
		size: { 11: 0, 12: 6, 13: 9, 14: 16, 15: 24, 16: 40, 17: 100, 18: 160, 20: 300 },
		group: 'airport',
	});
	yield b.line('airport-taxiway', {
		sourceLayer: 'aeroway',
		filter: centreline('taxiway'),
		color: c.roadStreet,
		lineCap: 'butt',
		lineJoin: 'round',
		// No opacity ramp: the width curve already grows from 0 at z13, which is the appearance
		// transition. See the Shortbread module for why a copied runway ramp was wrong here.
		size: { 13: 0, 14: 1, 15: 8, 16: 12, 18: 18, 20: 36 },
		group: 'airport',
	});
	yield b.line('airport-runway', {
		sourceLayer: 'aeroway',
		filter: centreline('runway'),
		color: c.roadStreet,
		lineCap: 'butt',
		lineJoin: 'round',
		size: { 11: 0, 12: 5, 13: 8, 14: 14, 15: 22, 16: 38, 17: 98, 18: 158, 20: 298 },
		opacity: { 11: 0, 12: 1 },
		group: 'airport',
	});
}

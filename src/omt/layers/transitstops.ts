import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../../dsl/index.js';
import { transitStops as draw, type StopDef } from '../../cartography/index.js';

// Public-transport stop icons + names for OpenMapTiles. All share one symbol style, as in Shortbread;
// each adds its icon, filter and min-zoom.
//
// ── Two source-layers where Shortbread has one ────────────────────────────────
//
// Shortbread keeps every stop in `public_transport`. OpenMapTiles splits them: surface stops and stations
// are `poi` classes, and airports have a layer of their own, `aerodrome_label`, which also carries the
// `iata` code the airport/airfield split needs.
//
// Sampled pairs (`class / subclass`), from the city tiles:
//
//   bus / bus_stop 673   entrance / subway_entrance 376   railway / tram_stop 78
//   railway / subway 63  railway / station 34            railway / halt 6
//   ferry_terminal / ferry_terminal 21                    entrance / train_station_entrance 16
//   bus / bus_station 9
//
// ── The distinction Shortbread had to delete, recovered ───────────────────────
//
// `symbol-transit-subway` is back. The Shortbread module records that it once filtered on a `station`
// field `public_transport` does not have, so it never rendered, and that "the distinction is simply not
// expressible against this schema" — so both it and `lightrail` were removed. OpenMapTiles *does*
// express it: `class: railway` with `subclass: subway` is 63 observed features. The layer returns here
// with a filter that matches — but drawn exactly like a station. These are the subway *stations*
// (every Shortbread station name in London, New York, Berlin and Tokyo is among them), which Shortbread
// files as `kind: station` and shows from z13. Starting them at z14, as this layer once did, left
// OpenMapTiles' London Underground unmarked at z13.
//
// What it does not get is its own icon. `base` carries exactly four transit glyphs — `icon-bus`,
// `icon-rail`, `transport-tram`, plus `icon-airfield`/`icon-airport` — and §5.5 is explicit that a schema
// the CDN does not serve must not grow that sheet, since every map downloads it. So the subway stop draws
// the rail glyph and earns its separate layer through zoom, not shape. A metro glyph would belong in a
// separate sheet, not in `base`.
//
// Not drawn, for the same reason plus precedent: `ferry_terminal` and the two `entrance` subclasses.
// `base` has no glyph for either, and Shortbread draws neither — so adding them would make this schema's
// coverage diverge from the other's in the one direction §23 warns about.

const STOPS: StopDef[] = [
	{
		id: 'bus',
		sourceLayer: 'poi',
		// `bus` covers both `bus_stop` and the handful of `bus_station` features; they share the glyph, so
		// splitting them would buy nothing but a layer.
		filter: ['==', ['get', 'class'], 'bus'],
		minzoom: 16,
		image: 'base:icon-bus',
		iconSize: { 16: 0.5, 18: 1 },
	},
	{
		id: 'tram',
		sourceLayer: 'poi',
		filter: ['all', ['==', ['get', 'class'], 'railway'], ['==', ['get', 'subclass'], 'tram_stop']],
		minzoom: 15,
		image: 'base:transport-tram',
		iconSize: { 15: 0.5, 17: 1 },
	},
	{
		id: 'subway',
		sourceLayer: 'poi',
		filter: ['all', ['==', ['get', 'class'], 'railway'], ['==', ['get', 'subclass'], 'subway']],
		// The zoom and size of `station` below: Shortbread draws these same stations as stations.
		minzoom: 13,
		image: 'base:icon-rail',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'station',
		sourceLayer: 'poi',
		filter: ['all', ['==', ['get', 'class'], 'railway'], ['in', ['get', 'subclass'], ['literal', ['station', 'halt']]]],
		minzoom: 13,
		image: 'base:icon-rail',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airfield',
		sourceLayer: 'aerodrome_label',
		filter: ['!', ['has', 'iata']],
		minzoom: 13,
		image: 'base:icon-airfield',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airport',
		sourceLayer: 'aerodrome_label',
		filter: ['has', 'iata'],
		minzoom: 12,
		image: 'base:icon-airport',
		iconSize: { 12: 0.5, 14: 1 },
	},
];

export function* transitStops(ctx: LayerContext): Generator<TaggedLayer> {
	yield* draw(ctx, STOPS);
}

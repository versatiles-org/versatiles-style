import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../../dsl';
import { transitStops as draw, type StopDef } from '../../cartography';

// Which Shortbread features are a stop. The symbol style is shared — see
// `src/cartography/transitstops.ts`.

const SOURCE = 'public_transport';

const STOPS: StopDef[] = [
	{
		id: 'bus',
		sourceLayer: SOURCE,
		filter: ['==', ['get', 'kind'], 'bus_stop'],
		minzoom: 16,
		image: 'base:icon-bus',
		iconSize: { 16: 0.5, 18: 1 },
	},
	{
		id: 'tram',
		sourceLayer: SOURCE,
		filter: ['==', ['get', 'kind'], 'tram_stop'],
		minzoom: 15,
		image: 'base:transport-tram',
		iconSize: { 15: 0.5, 17: 1 },
	},
	// There were `subway` and `lightrail` stops here, filtering on `['get', 'station']`. Shortbread's
	// `public_transport` layer has no such field — only `kind`, `name` and `iata` — so both filters
	// were always false and neither layer ever rendered, while `station` below matched every stop
	// anyway (its `!in(undefined, …)` clause is always true). The distinction is simply not
	// expressible against this schema, so the two dead layers are gone and `station` now says plainly
	// what it matches. See https://shortbread-tiles.org/schema/1.1/#layer-public_transport
	{
		id: 'station',
		sourceLayer: SOURCE,
		filter: ['in', ['get', 'kind'], ['literal', ['station', 'halt']]],
		minzoom: 13,
		image: 'base:icon-rail',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airfield',
		sourceLayer: SOURCE,
		filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['!', ['has', 'iata']]],
		minzoom: 13,
		image: 'base:icon-airfield',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airport',
		sourceLayer: SOURCE,
		filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['has', 'iata']],
		minzoom: 12,
		image: 'base:icon-airport',
		iconSize: { 12: 0.5, 14: 1 },
	},
];

export function* transitStops(ctx: LayerContext): Generator<TaggedLayer> {
	yield* draw(ctx, STOPS);
}

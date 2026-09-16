import type { LayerContext } from '../context.js';
import type { TaggedLayer } from '../../dsl';
import { transitStops as draw, type StopDef } from '../../cartography';

// Public-transport stops for Protomaps: all `pois` kinds, verified in the sample (`station` 29,
// `platform` 34, plus bus and tram stops). The symbol style is shared.
//
// Airports come from the same layer here rather than a dedicated one — `pois` carries an `iata` field,
// which is what splits an airport from an airfield, exactly as `aerodrome_label` does in OpenMapTiles.
const STOPS: StopDef[] = [
	{
		id: 'bus',
		sourceLayer: 'pois',
		filter: ['==', ['get', 'kind'], 'bus_stop'],
		minzoom: 16,
		image: 'base:icon-bus',
		iconSize: { 16: 0.5, 18: 1 },
	},
	{
		id: 'tram',
		sourceLayer: 'pois',
		filter: ['==', ['get', 'kind'], 'tram_stop'],
		minzoom: 15,
		image: 'base:transport-tram',
		iconSize: { 15: 0.5, 17: 1 },
	},
	{
		id: 'station',
		sourceLayer: 'pois',
		filter: ['in', ['get', 'kind'], ['literal', ['station', 'halt']]],
		minzoom: 13,
		image: 'base:icon-rail',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airfield',
		sourceLayer: 'pois',
		filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['!', ['has', 'iata']]],
		minzoom: 13,
		image: 'base:icon-airfield',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airport',
		sourceLayer: 'pois',
		filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['has', 'iata']],
		minzoom: 12,
		image: 'base:icon-airport',
		iconSize: { 12: 0.5, 14: 1 },
	},
];

export function* transitStops(ctx: LayerContext): Generator<TaggedLayer> {
	yield* draw(ctx, STOPS);
}

import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Public-transport stop icons + names (bus, tram, stations, airports).
// All share a common symbol style (the old `symbol-*` rule); each adds its icon + min-zoom.

type StopDef = {
	id: string;
	filter: FilterSpecification;
	minzoom: number;
	image: string;
	iconSize: Record<number, number>;
};

const STOPS: StopDef[] = [
	{
		id: 'bus',
		filter: ['==', ['get', 'kind'], 'bus_stop'],
		minzoom: 16,
		image: 'base:icon-bus',
		iconSize: { 16: 0.5, 18: 1 },
	},
	{
		id: 'tram',
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
		filter: ['in', ['get', 'kind'], ['literal', ['station', 'halt']]],
		minzoom: 13,
		image: 'base:icon-rail',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airfield',
		filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['!', ['has', 'iata']]],
		minzoom: 13,
		image: 'base:icon-airfield',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airport',
		filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['has', 'iata']],
		minzoom: 12,
		image: 'base:icon-airport',
		iconSize: { 12: 0.5, 14: 1 },
	},
];

export function* transitStops(ctx: LayerContext): Generator<b.TaggedLayer> {
	const { c } = ctx;

	// Shared base style (the old `symbol-*` wildcard).
	const base: b.StyleProps = {
		symbolPlacement: 'point',
		iconOpacity: 0.7,
		iconKeepUpright: true,
		font: ctx.fonts.normal,
		size: 10,
		color: c.labelSymbol,
		iconAnchor: 'bottom',
		textAnchor: 'top',
		textHaloColor: c.labelHalo,
		textHaloWidth: 2,
		textHaloBlur: 1,
	};

	for (const stop of STOPS) {
		yield b.symbol('symbol-transit-' + stop.id, {
			sourceLayer: 'public_transport',
			filter: stop.filter,
			layout: { 'text-field': ctx.nameField },
			...base,
			minzoom: stop.minzoom,
			image: stop.image,
			iconSize: stop.iconSize,
			group: 'transit.stops',
		});
	}
}

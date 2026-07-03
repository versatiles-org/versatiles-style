import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../context.js';
import * as b from '../build.js';

// Public-transport stop icons + names (bus, tram, subway, light rail, stations, airports).
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
		image: 'basics:icon-bus',
		iconSize: { 16: 0.5, 18: 1 },
	},
	{
		id: 'tram',
		filter: ['==', ['get', 'kind'], 'tram_stop'],
		minzoom: 15,
		image: 'basics:transport-tram',
		iconSize: { 15: 0.5, 17: 1 },
	},
	{
		id: 'subway',
		filter: ['all', ['in', ['get', 'kind'], ['literal', ['station', 'halt']]], ['==', ['get', 'station'], 'subway']],
		minzoom: 14,
		image: 'basics:icon-rail_metro',
		iconSize: { 14: 0.5, 16: 1 },
	},
	{
		id: 'lightrail',
		filter: [
			'all',
			['in', ['get', 'kind'], ['literal', ['station', 'halt']]],
			['==', ['get', 'station'], 'light_rail'],
		],
		minzoom: 14,
		image: 'basics:icon-rail_light',
		iconSize: { 14: 0.5, 16: 1 },
	},
	{
		id: 'station',
		filter: [
			'all',
			['in', ['get', 'kind'], ['literal', ['station', 'halt']]],
			['!', ['in', ['get', 'station'], ['literal', ['light_rail', 'subway']]]],
		],
		minzoom: 13,
		image: 'basics:icon-rail',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airfield',
		filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['!', ['has', 'iata']]],
		minzoom: 13,
		image: 'basics:icon-airfield',
		iconSize: { 13: 0.5, 15: 1 },
	},
	{
		id: 'airport',
		filter: ['all', ['==', ['get', 'kind'], 'aerodrome'], ['has', 'iata']],
		minzoom: 12,
		image: 'basics:icon-airport',
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

	const layers = STOPS.map((stop) =>
		b.symbol('symbol-transit-' + stop.id, {
			sourceLayer: 'public_transport',
			filter: stop.filter,
			layout: { 'text-field': ctx.nameField },
			...base,
			minzoom: stop.minzoom,
			image: stop.image,
			iconSize: stop.iconSize,
			group: 'transit.stops',
		})
	);

	yield* b.gate(ctx.layers, ...layers);
}

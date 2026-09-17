import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../dsl/index.js';
import * as b from '../dsl/index.js';

/**
 * Public-transport stop cartography, shared by every schema.
 *
 * 69 of ~80 lines were identical between the ports, and all of it was the symbol style —
 * the old `symbol-*` wildcard rule. What is per-schema is *which* features are a bus stop or a station,
 * which is a filter and a source-layer, so each schema passes its own list of stops.
 *
 * Icons are constrained: the `base` sheet must not grow for a schema the CDN does not serve, so
 * a schema that distinguishes more stop kinds than `base` has glyphs for must reuse one and earn the
 * separate layer through zoom instead. The OpenMapTiles subway stop is exactly that case.
 */
export type StopDef = {
	/** Suffix of the layer id: `symbol-transit-<id>`. */
	readonly id: string;
	readonly sourceLayer: string;
	readonly filter?: FilterSpecification;
	readonly minzoom: number;
	readonly image: string;
	readonly iconSize: Record<number, number>;
};

export function* transitStops(ctx: LayerContext, stops: readonly StopDef[]): Generator<b.TaggedLayer> {
	const { c } = ctx;

	// The shared base style (the old `symbol-*` wildcard).
	const base: b.StyleProps = {
		symbolPlacement: 'point',
		iconOpacity: 0.7,
		iconKeepUpright: true,
		size: 10,
		color: c.labelSymbol,
		iconAnchor: 'bottom',
		textAnchor: 'top',
		textHaloColor: c.labelHalo,
	};

	for (const stop of stops) {
		yield b.symbol('symbol-transit-' + stop.id, {
			sourceLayer: stop.sourceLayer,
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

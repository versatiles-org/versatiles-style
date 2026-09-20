import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import type { LayerContext } from '../dsl/index.js';
import type { Color } from '../color/index.js';
import * as b from '../dsl/index.js';

/**
 * Label cartography shared by every schema — the style blocks and the place-label emitter.
 *
 * Labels extract less cleanly than roads: the two ports were 152 of ~250 lines identical,
 * but much of that is the same four style objects restated, not one algorithm keyed on ids. The
 * schemas genuinely differ in *what they can bucket by* — Shortbread sizes country labels by `way_area`
 * and sorts settlements by `population`, OpenMapTiles has neither and offers `rank` instead — so the
 * tables stay per-schema and only the styling is shared.
 *
 * Layer order matters here and is the caller's business: MapLibre resolves symbol collisions in layer
 * order, and transit stops belong between the feature labels and the place labels.
 */

/** The four style blocks every schema's label layers are built from. */
export type LabelStyles = {
	/** Street names, placed along the line. */
	readonly street: b.StyleProps;
	/** Lake, sea and river names. */
	readonly water: b.StyleProps;
	/** Settlement names. */
	readonly place: b.StyleProps;
	/** State and country names — offset, and droppable in a collision. */
	readonly boundary: b.StyleProps;
};

export function labelStyles(ctx: LayerContext): LabelStyles {
	const { c } = ctx;
	return {
		street: {
			color: c.label,
			textHaloColor: c.labelHalo,
			symbolPlacement: 'line',
			textAnchor: 'center',
			minzoom: 12,
			size: { 12: 10, 15: 13 },
		},
		water: {
			color: c.labelWater,
			textHaloColor: c.labelHalo,
			textAnchor: 'center',
		},
		place: {
			color: c.label,
			textHaloColor: c.labelHalo,
		},
		boundary: {
			color: c.label,
			textHaloColor: c.labelHalo,
			textAnchor: 'top',
			textOffset: [0, 0.2],
			textPadding: 0,
			textOptional: true,
		},
	};
}

/**
 * State text: the label colour blended slightly toward `bg` (pure white in light mode / black in dark)
 * — a grey-blue, lighter than the (bluer) settlement text.
 */
export function placeSecondary(ctx: LayerContext): Color {
	return ctx.c.label.blend(0.05, ctx.bg);
}

/** Which `layers.labels.places` group each settlement label belongs to. */
const PLACE_GROUPS = {
	capital: 'cities',
	statecapital: 'cities',
	city: 'cities',
	town: 'cities',
	village: 'villages',
	hamlet: 'hamlets',
	suburb: 'districts',
	quarter: 'districts',
	neighbourhood: 'districts',
} as const;

/** One settlement label: which features, at which zooms, in which size. */
export type PlaceLabelDef = {
	/** Suffix of the layer id: `label-place-<id>`. */
	readonly id: keyof typeof PLACE_GROUPS;
	readonly filter: FilterSpecification;
	readonly minzoom: number;
	/**
	 * The zoom the label has faded out by — required, and per kind, because it is a property of how
	 * big the settlement is on the ground.
	 *
	 * A place is a point, but the thing it names has an extent. While that extent is larger than the
	 * viewport the point no longer marks "the place", it marks an arbitrary building inside it — which
	 * is why a city name at z18 lands on a parking lot. So the label goes once the settlement stops
	 * fitting on screen: with a ~1000px viewport covering ~80150/2^z km, that is
	 * `disappear ≈ log2(80150 / typical diameter in km)`.
	 *
	 * The consequence is that *smaller* places persist longer, not shorter — a 300 m hamlet still fits
	 * on screen at z18, and its name is the only and correct label for what is there. There is no
	 * default on purpose: a new kind has to state its own, rather than inherit one chosen for a
	 * different size of place.
	 */
	readonly disappear: number;
	readonly size: b.SizeValue;
};

/**
 * Emit one settlement label.
 *
 * `sortKey` decides which name survives a collision and is the one thing no two schemas agree on:
 * Shortbread sorts by descending `population`, OpenMapTiles by ascending `rank`. It is passed in whole
 * rather than derived, because the expression differs, not just the field.
 */
export function placeLabel(
	ctx: LayerContext,
	base: b.StyleProps,
	def: PlaceLabelDef,
	source: { sourceLayer: string; sortKey: unknown }
): b.TaggedLayer {
	return b.symbol('label-place-' + def.id, {
		sourceLayer: source.sourceLayer,
		filter: def.filter,
		layout: { 'text-field': ctx.nameField, 'symbol-sort-key': source.sortKey },
		...base,
		minzoom: def.minzoom,
		disappear: def.disappear,
		size: def.size,
		group: 'labels.places.' + PLACE_GROUPS[def.id],
	});
}

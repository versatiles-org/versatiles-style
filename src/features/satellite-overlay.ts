import type { StyleSpecification, MaplibreLayer } from '../types/index.js';
import { moveToLineLayerOpacity, scaleLayerOpacity, type ZoomCurve } from '../lib/index.js';

/**
 * Turning the OSM style into an overlay for satellite imagery.
 *
 * The vector style is designed to *be* the map; over a photo it has a different job — locating and
 * naming what the imagery already shows. v5 made three adjustments, and without them the overlay
 * reads as a basemap accidentally drawn on top of a picture.
 *
 * Two of those adjustments are expressed as option defaults instead of transforms, so callers can
 * still override them: white label text on a black halo (`colors.label` / `colors.labelHalo`), and bold
 * labels with a tight halo (`text`). Those defaults live in `src/options/osm-overlay.ts`, because
 * options may not import features — see the note there. What is left here is what the option surface
 * cannot express.
 */

/**
 * Layer groups dropped from the overlay: the imagery already shows this ground truth, and drawing
 * it again only obscures the photo. Tunnels go too — they are underground, so a surface line for
 * them is actively misleading over imagery.
 *
 * `aerialway-*` is deliberately kept: cable cars and chair lifts are real infrastructure that
 * imagery does *not* resolve, and v5 had no such layers to exclude.
 */
const DROPPED_GROUPS = /^(land|water|site|airport|tunnel)-/;

/**
 * Casings and bridge decks, dropped from the overlay.
 *
 * On the basemap a casing separates a line from the fills beneath it, and a deck lifts a bridge off
 * the road it crosses. The overlay has neither fills nor an opaque road to lift off, so over a photo
 * both are only a second translucent line under the first: the line's middle is blended twice and its
 * edges once, and no `line-layer-opacity` could undo that, because the two passes are separate layers.
 * Dropping them also halves the overlay's line layers (129 → 60).
 */
const CASING = /:(outline|bridge)$/;

/**
 * The borders that had a casing, and the casing itself.
 *
 * Unlike a road's casing, which is darker than its road, a border's casing is the light background
 * colour, twice the line's width — and over imagery it was what made a border visible: a light band
 * with a faint grey line in it. With the casing gone, the line takes the casing's colour, so a border
 * stays the light line it read as. The maritime border never had a casing and keeps its own colour.
 */
const CASED_BOUNDARY = /^boundary-(country|country-disputed|state)$/;
const CASED_BOUNDARY_CASING = /^boundary-(country|country-disputed|state):outline$/;

/**
 * Rail, light rail, subway and aerialways, whose two layers are the other way round.
 *
 * Their `:outline` is not a casing but the line itself — a solid base — and the layer on top is a
 * dashed decoration over it: the alternating tie bands of a railway, the cable ticks of a lift. The
 * rail base also starts three zooms before its ties (z11 against z14). So for these the base stays and
 * the decoration goes, which leaves one solid line per track, as everywhere else in the overlay.
 * (Trams and the other minor railways are not listed: their `:outline` is a genuine dotted casing.)
 */
const BASE_LINE = /^(bridge-)?(transport-(rail|lightrail|subway)(-service)?|aerialway(-.*)?)(?=:outline$|$)/;

/**
 * Multiplier applied to each line's opacity, so it reads as an overlay rather than a basemap — per line
 * class, because dropping the casings and decorations took a different share of each class's weight
 * with it.
 *
 * Measured against the overlay as it was with casings, when every line was dimmed by 0.2: each class
 * rendered alone over imagery with MapLibre Native, and its mean per-pixel change against the bare
 * imagery compared before and after the casings went, over eight to fourteen views per class. With
 * 0.2 kept, the old overlay changed the imagery this much more than the new one:
 *
 * - boundary — ×3.6–4.3 at z4–z11, in its own grey. A border was mostly its casing: twice the line's
 *   width, in the light background colour. Raising the grey line to match (0.9) made it near opaque and
 *   a different colour from what the border had looked like, so instead the line takes the casing's
 *   colour ({@link CASED_BOUNDARY}) at 0.4. Against v6.0.3 that lands at ×0.94–1.07 over sixteen views at
 *   z4–z11, and keeps the light-on-light behaviour of the old casing: over the bright Alps, ×1.07 and
 *   1.35, where the grey line at 0.9 had come out three times heavier.
 * - maritime border — never had a casing, so it keeps 0.2.
 * - road — ×1.8–2.1 at z9–z15, in cities and at a motorway interchange. A road's casing was darker than
 *   the road, so the road keeps its own colour.
 * - aerialway — ×2: the dashed cable ticks that went were as heavy as the base line that stayed.
 * - rail — ×1: its ties start at z14, are drawn at most 1 px wide and dashed, and weighed nothing measurable.
 *
 * Overlap makes the response sub-linear, so the road values sit a little above 0.2 × that ratio; with
 * them, every road view lands within 0.94–1.08 of the old weight.
 */
const LINE_OPACITY = { boundary: 0.4, maritime: 0.2, road: 0.4, aerialway: 0.4, rail: 0.2 };

function lineOpacity(id: string): number {
	if (id === 'boundary-country-maritime') return LINE_OPACITY.maritime;
	if (id.startsWith('boundary-')) return LINE_OPACITY.boundary;
	if (id.startsWith('aerialway')) return LINE_OPACITY.aerialway;
	if (BASE_LINE.test(id)) return LINE_OPACITY.rail;
	return LINE_OPACITY.road;
}

/**
 * Why every line here is dimmed per feature, including the ones that overlap themselves.
 *
 * {@link unroundJoins} removes the overlap a *style* creates. There is a second overlap the *data*
 * creates, which no paint value avoids: an administrative border wanders far more tightly than the
 * line drawn for it is wide, so at low zoom the line runs back over itself. Measured against
 * `tiles.versatiles.org` shortbread at z7, 29–39% of the vertices of the admin-level-2 feature sit
 * within one line width of a non-adjacent part of the same feature — and a render of that layer at
 * `line-opacity` 0.5 has 8% of its covered pixels brighter than half the opaque coverage, in
 * clusters landing exactly on the two-, three-, four-, five- and six-fold blend values. A border
 * ends up drawn over a border, and the overlay carries that noise.
 *
 * The style spec has the cure — `line-layer-opacity` composites a layer's finished output once — and
 * boundaries used it until it turned out to be unshippable. MapLibre Native does not implement the
 * property (maplibre-native#4298, open), and it does not degrade: a layer carrying it is **dropped
 * entirely**, so the satellite overlay lost every border on Android and iOS. Keeping a `line-opacity`
 * alongside as a fallback does not rescue it — the layer still goes. Measured on
 * `@maplibre/maplibre-gl-native` 6.4.1: one red line on white renders `255,0,0` with no opacity
 * property and `255,204,204` at `line-opacity` 0.2, but `255,255,255` — nothing at all — at
 * `line-layer-opacity` 0.2, with or without a `line-opacity` beside it.
 *
 * So by default the self-overlap noise is accepted as the lesser artefact, and no layer carries the
 * property. A caller who knows the style only goes to MapLibre GL JS can opt in with
 * `osmOverlay.layerOpacity` — see {@link LAYER_OPACITY_IDS}.
 */

/**
 * The layers that get `line-layer-opacity` when `osmOverlay.layerOpacity` is on.
 *
 * Each such layer costs MapLibre GL JS an extra offscreen pass per frame, so the list is kept to the
 * layers whose own features overlap most: country and state borders (see above), and motorways, whose
 * two carriageways are mapped as separate ways that run closer together than the line is wide at low
 * zoom, and fold over each other at every interchange. Trunk roads are deliberately left out, as are the
 * disputed and maritime borders, links and bridges.
 *
 * Composited once, a layer loses the weight its overlaps used to add, so the factor that matched the
 * old overlay with `line-opacity` is not the one that matches it here. Measured in MapLibre GL JS
 * 6.11.2 with `npm run overlay-compare`, each layer alone, white on black, over five places: summed
 * brightness with `line-opacity` divided by summed brightness with `line-layer-opacity`, both at the
 * {@link LINE_OPACITY} factor —
 *
 * - country borders ×1.13–1.14 at z4–z7, 1.11 at z8, 1.10 at z9, 1.09 at z10, 1.05 at z11 and 1.02 at
 *   z12: about a tenth of a border's pixels are drawn twice at low zoom, and at 0.4 a second pass adds
 *   most of a first one. So its factor follows that curve.
 * - state borders ×1.00–1.03: they hardly cross themselves, so they keep their factor.
 * - motorways ×1.13 at z6, 1.34 at z7, 1.51 at z8, 1.58–1.59 at z9–z10, 1.36 at z11, 1.26 at z12,
 *   1.10 at z13, 1.01 at z14 and 1.00 at z15. The carriageways merge into one line up to about z10,
 *   and separate as the zoom goes up. (z6 is low only because the line is still fading in, 1 px wide.)
 *   So the motorway's factor follows that curve, 0.4 × up to 1.6.
 *
 * `npm run overlay-compare` repeats the measurement for the current list and factors; with them, every
 * `off / on` it reports should sit near 1.
 */
const COUNTRY_OVERLAP: ZoomCurve = { 4: 1.13, 7: 1.13, 8: 1.11, 9: 1.1, 10: 1.09, 11: 1.05, 12: 1.02 };
const MOTORWAY_OVERLAP: ZoomCurve = { 6: 1.15, 7: 1.35, 8: 1.5, 10: 1.6, 11: 1.35, 12: 1.25, 13: 1.1, 14: 1 };
const scaled = (curve: ZoomCurve, factor: number): ZoomCurve =>
	Object.fromEntries(Object.entries(curve).map(([zoom, f]) => [zoom, f * factor]));
const LAYER_OPACITY_IDS: ReadonlyMap<string, number | ZoomCurve> = new Map<string, number | ZoomCurve>([
	['boundary-country', scaled(COUNTRY_OVERLAP, LINE_OPACITY.boundary)],
	['boundary-state', LINE_OPACITY.boundary],
	['street-motorway', scaled(MOTORWAY_OVERLAP, LINE_OPACITY.road)],
]);

/**
 * Round caps and joins, which a translucent line cannot afford.
 *
 * A round cap puts a semicircle *past* the end of a segment and a round join a fan at every vertex, so
 * both cover pixels the adjoining geometry already covers. Drawn opaque that is free — the same colour
 * lands on the same colour — and it is why the basemap asks for them: they keep a boundary or a road
 * smooth round its corners. Drawn translucent ({@link LINE_OPACITY}) it is not free: MapLibre blends
 * each overlapping triangle in turn, so those pixels composite twice — at 0.2 they come out at
 * 1 − 0.8² = 0.36 against 0.2 everywhere else. Since boundary and road geometry is split per way and
 * per tile, that is a bright bead at every vertex and every seam between features — the whole overlay
 * reads as noisy.
 *
 * So the overlay drops them and takes MapLibre's own `butt` and `miter`. Only `round` is removed — a
 * layer that asked for `butt` meant it.
 *
 * The two are not worth the same, and `butt` is the one doing the work. Measured on
 * `@maplibre/maplibre-gl-native` 6.4.1 at `line-opacity` 0.2, counting covered pixels by blend depth:
 *
 * - caps, two features meeting end to end — `butt` 0.33% of covered pixels blended twice, `round`
 *   3.34%. A round cap really does stop overlapping once it is gone.
 * - joins, one continuous zig-zag (bends only, no interior caps) — `miter` 10.53%, `bevel` 10.53%
 *   (pixel-identical), `round` 14.26%.
 *
 * So `miter` does *not* avoid overlap, the way this comment used to claim. The two segment quads
 * overlap each other on the *inside* of every corner whatever the join is, and that is most of the
 * beading; unrounding a join removes only about a quarter of it. On real border geometry the same
 * holds — `boundary-country` at z6 goes 11.23% (miter) to 16.51% (round) — but the two render
 * indistinguishably: 1.5% of pixels differ by more than 8/255 at z6, 0.4% at z8, 0.001% at z10, and
 * every difference sits on a corner. What makes a boundary look noisy is the layer crossing itself
 * (see the note above), which no join style touches.
 *
 * Joins are therefore unrounded for consistency and a small gain, not because they were the problem.
 * Caps are unrounded because they were.
 */
function unroundJoins(layer: MaplibreLayer): void {
	const holder = layer as { layout?: Record<string, unknown> };
	if (!holder.layout) return;
	for (const key of ['line-cap', 'line-join'] as const) {
		if (holder.layout[key] === 'round') delete holder.layout[key];
	}
	// A layer whose layout held nothing but those two is left with an empty object; the base style
	// emits none, so the overlay should not start.
	if (Object.keys(holder.layout).length === 0) delete holder.layout;
}

/** Whether a layer belongs in the overlay at all. */
export function keepInOverlay(layer: { id: string; type: string }): boolean {
	// Fills would hide the imagery outright.
	if (layer.type === 'fill' || layer.type === 'fill-extrusion') return false;
	if (DROPPED_GROUPS.test(layer.id)) return false;
	if (layer.type !== 'line') return true;
	if (BASE_LINE.test(layer.id)) return layer.id.endsWith(':outline');
	return !CASING.test(layer.id);
}

/**
 * Adjust a layer that is staying, in place. Text and icon colours are already correct via the
 * overlay's option defaults; this covers what those options cannot reach.
 *
 * `haloColor` is the overlay's resolved `colors.labelHalo`. It has to be forced onto every symbol
 * layer rather than left to the palette, because two label groups derive their halo elsewhere: POI
 * halos follow `bg` (deliberately opaque, so they cannot use the semi-transparent `labelHalo`) and
 * the motorway shield uses the road colour. Left alone, those become white halos behind the now-
 * white label text — invisible labels.
 */
export function applyImageryTreatment(
	layer: MaplibreLayer,
	haloColor: string,
	layerOpacity = false,
	boundaryColor?: unknown
): void {
	if (layer.type === 'line') {
		if (boundaryColor !== undefined && CASED_BOUNDARY.test(layer.id)) {
			((layer as { paint?: Record<string, unknown> }).paint ??= {})['line-color'] = boundaryColor;
		}
		// Composited once, the layer no longer overlaps itself, so it keeps the cartography's round caps
		// and joins.
		const factor = layerOpacity ? LAYER_OPACITY_IDS.get(layer.id) : undefined;
		if (factor !== undefined && moveToLineLayerOpacity(layer, factor)) return;
		scaleLayerOpacity(layer, lineOpacity(layer.id));
		unroundJoins(layer);
		return;
	}
	if (layer.type === 'symbol') {
		const paint = ((layer as { paint?: Record<string, unknown> }).paint ??= {});
		// Only touch a halo that exists — layers with no halo should not gain one.
		if (paint['text-halo-color'] !== undefined) {
			paint['text-halo-color'] = haloColor;
		}
	}
}

/**
 * Filter and adjust a built OSM style's layers for use over imagery. `layerOpacity` is the overlay's
 * `osmOverlay.layerOpacity` — see {@link LAYER_OPACITY_IDS}.
 */
export function toOverlayLayers(
	layers: StyleSpecification['layers'],
	haloColor: string,
	layerOpacity = false
): StyleSpecification['layers'] {
	// Read before the casings are dropped: it is already the theme's colour, recoloured.
	const casing = layers.find((l) => CASED_BOUNDARY_CASING.test(l.id)) as
		{ paint?: Record<string, unknown> } | undefined;
	const boundaryColor = casing?.paint?.['line-color'];
	const kept = layers.filter((l) => keepInOverlay(l as { id: string; type: string }));
	for (const layer of kept) applyImageryTreatment(layer as MaplibreLayer, haloColor, layerOpacity, boundaryColor);
	return kept;
}

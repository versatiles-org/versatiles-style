import type { LayerContext } from '../dsl/index.js';
import type { Color } from '../color/index.js';
import type { MaplibreLayerDefinition } from '../types/index.js';
import type { FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import * as b from '../dsl/index.js';

/**
 * Road cartography, shared by every schema.
 *
 * ── Why this is shared when the rest of the cartography is not ────────────────
 *
 * The port duplicated the cartography first, deferring any shared abstraction until there were
 * two real implementations in hand rather than betting on one derived from a single schema. This module
 * is that revisit, and the measurement that justified it: of the roads module's ~330 lines of style code,
 * **314 were byte-identical** between the Shortbread and OpenMapTiles ports, and every one of the 27
 * lines that differed was the same vocabulary difference — Shortbread names its ordinary streets
 * `residential`/`unclassified`/`living_street`, OpenMapTiles calls all three `minor`. No logic differed.
 *
 * So the split measured on `roads.ts` (24% structure / 72% style) turned out to be real and to
 * generalise across schemas, and what remained per-schema was a table, not a shape. That table is
 * `RoadVocabulary`; everything else lives here once.
 *
 * ── What is still per-schema ──────────────────────────────────────────────────
 *
 * Structure: which source-layer and filter select each road type. That is `buildStructures()` in each
 * schema's own `layers/roads.ts`, and it is where the two genuinely differ — 38% identical, against 94%
 * here.
 *
 * ── Risk 2, accepted knowingly ────────────────────────────────────────────────
 *
 * Everything below dispatches on the **layer id**, so the id vocabulary is now canonical across schemas:
 * a new schema must name its layers `street-<base>`, `way-<kind>`, `transport-<kind>`, `aerialway`, or it
 * gets no style. The plan flagged exactly this ("shared style keys on layer ids, so the canonical
 * vocabulary would be Shortbread's dialect"). It is a real constraint and it is why option B was not
 * taken first — but with two ports written the ids have already proved schema-neutral enough that
 * OpenMapTiles adopted them without strain, and one shared 314-line body beats three copies of it.
 */

/**
 * The per-schema half of road styling: which class names a schema uses for the concepts the style
 * distinguishes, and when each appears. Everything else about a road's paint is the same everywhere.
 */
const lineCap = 'round';
const lineJoin = 'round';

export type RoadVocabulary = {
	/** Street bases drawn as the plain white "minor" road — Shortbread's three, OpenMapTiles' one. */
	readonly minorBases: readonly string[];
	/** Street bases drawn in the faint off-white service/bus colour. */
	readonly serviceBases: readonly string[];
	/** Appearance zoom per street base: the zoom its data begins, which the fade-in follows. */
	readonly appear: Readonly<Record<string, number>>;
};

// ── Inline style resolution ────────────────────────────────────────────────────

type Prefix = '' | 'tunnel-' | 'bridge-';

// The old VersaTiles road widths: hand-tuned linear stops (no exponential base) that stay thin at
// low/mid zoom and ramp up steeply past z16, reaching their full chunky width at z19–20.
const MINOR_WIDTH = {
	outline: { 12: 2, 14: 3, 16: 6, 18: 26, 19: 64, 20: 128 },
	main: { 12: 1, 14: 2, 16: 5, 18: 24, 19: 60, 20: 120 },
};

// The arterial classes drawn in the yellow/orange palette. In the old VersaTiles style tertiary is
// NOT arterial — it's a white minor road — so it is deliberately absent here.
const YELLOW = new Set(['motorway', 'trunk', 'primary', 'secondary']);
const isServiceLike = (base: string, vocab: RoadVocabulary): boolean => vocab.serviceBases.includes(base);

function streetAppear(base: string, isLink: boolean, vocab: RoadVocabulary): number {
	// The `link` flag is only populated from z11; OSM Bright renders motorway ramps from z12, the rest z13.
	if (isLink) return base === 'motorway' ? 12 : 13;
	return vocab.appear[base] ?? 12;
}

// Line width by base street type — the old VersaTiles curves. These are identical across surface,
// tunnel and bridge (the old style never varied fill/casing width by prefix; only the bridge deck,
// handled in `bridgeDeckStyle`, differs), so `prefix` is not consulted here.
function streetWidth(base: string, isLink: boolean, isOutline: boolean, vocab: RoadVocabulary): { size: b.SizeValue } {
	// Service-like bases share one curve; which names those are is the schema's business.
	if (isServiceLike(base, vocab))
		return isOutline
			? { size: { 14: 1, 16: 3, 18: 12, 19: 32, 20: 48 } }
			: { size: { 14: 1, 16: 2, 18: 10, 19: 28, 20: 40 } };
	if (isLink) {
		// tertiary-link follows the minor curve; every other link shares a common (thinner) curve.
		if (base === 'tertiary') return { size: isOutline ? MINOR_WIDTH.outline : MINOR_WIDTH.main };
		return isOutline
			? { size: { 12: 2, 14: 3, 16: 7, 18: 14, 20: 40 } }
			: { size: { 12: 1, 14: 2, 16: 5, 18: 12, 20: 38 } };
	}
	switch (base) {
		case 'motorway':
			return isOutline
				? { size: { 5: 0, 6: 2, 10: 5, 14: 5, 16: 14, 18: 38, 19: 84, 20: 168 } }
				: { size: { 5: 0, 6: 1, 10: 4, 14: 4, 16: 12, 18: 36, 19: 80, 20: 160 } };
		case 'trunk':
			return isOutline
				? { size: { 6: 0, 7: 2, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 } }
				: { size: { 6: 0, 7: 1, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 } };
		case 'primary':
			return isOutline
				? { size: { 8: 0, 9: 2, 10: 4, 14: 6, 16: 12, 18: 36, 19: 74, 20: 144 } }
				: { size: { 8: 0, 9: 1, 10: 3, 14: 5, 16: 10, 18: 34, 19: 70, 20: 140 } };
		case 'secondary':
			return isOutline
				? { size: { 11: 2, 14: 5, 16: 8, 18: 30, 19: 68, 20: 138 } }
				: { size: { 11: 1, 14: 4, 16: 6, 18: 28, 19: 64, 20: 130 } };
		case 'track':
			return isOutline
				? { size: { 14: 2, 16: 4, 18: 18, 19: 48, 20: 96 } }
				: { size: { 14: 1, 16: 3, 18: 16, 19: 44, 20: 88 } };
		default: // tertiary / residential / unclassified / livingstreet / pedestrian — the minor curve
			return { size: isOutline ? MINOR_WIDTH.outline : MINOR_WIDTH.main };
	}
}

// Surface fill (main) + casing (:outline) colors per class — the old VersaTiles road palette.
function classColors(
	c: LayerContext['c'],
	fg: Color,
	base: string,
	vocab: RoadVocabulary
): { main: Color; casing: Color } {
	if (base === 'motorway') return { main: c.roadMotorway, casing: c.roadMotorwayBg };
	if (YELLOW.has(base)) return { main: c.roadTrunk, casing: c.roadTrunkBg };
	// Pedestrian streets are drawn in the lavender foot color; service/bus in a faint off-white with a
	// slightly lighter casing. Everything else (tertiary/residential/unclassified/livingstreet/track)
	// is a plain white minor road with the warm-grey street casing.
	if (base === 'pedestrian') return { main: c.transitFoot, casing: c.roadStreetBg };
	if (isServiceLike(base, vocab))
		return { main: c.roadStreet.blend(0.03, fg), casing: c.roadStreetBg.blend(0.3, c.roadStreet) };
	return { main: c.roadStreet, casing: c.roadStreetBg };
}

function streetLineStyle(
	ctx: LayerContext,
	prefix: Prefix,
	t: string,
	isOutline: boolean,
	vocab: RoadVocabulary
): b.StyleProps {
	const { c, fg } = ctx;
	const isLink = t.endsWith('-link');
	const base = isLink ? t.slice(0, -5) : t;
	const { main, casing } = classColors(c, fg, base, vocab);
	const isYellow = YELLOW.has(base);

	const r: b.StyleProps = { lineJoin, lineCap };

	if (isOutline) {
		r.color = casing;
		// Bridges lighten the white-minor / pedestrian casing to a neutral grey.
		if (prefix === 'bridge-' && !isYellow && !isServiceLike(base, vocab)) r.color = c.roadStreet.blend(0.15, fg);
	} else {
		r.color = main;
		// Pedestrian streets are lavender only on the surface; on bridges they render white.
		if (prefix === 'bridge-' && base === 'pedestrian') r.color = c.roadStreet;
	}

	Object.assign(r, streetWidth(base, isLink, isOutline, vocab));

	// Every road type fades in by opacity (0 → 1) over its Shortbread appearance zoom z → z+1, so it
	// materializes smoothly instead of popping. Applies to both the casing (:outline) and the fill.
	r.opacity = b.fadeIn(streetAppear(base, isLink, vocab));

	return r;
}

function zoneStyle(ctx: LayerContext, prefix: Prefix): b.StyleProps {
	const { c } = ctx;
	// The surface zone is a tint over what it covers — landuse, sites, the plaza's own paths — so it
	// fades in to 0.25, not to 1. At full strength it hides all of them; v5 expressed the same thing
	// as a 25%-alpha fill colour. Bridges and tunnels below are real surfaces, not tints, and stay opaque.
	if (prefix === '') return { color: c.transitFoot, opacity: { 14: 0, 15: 0.25 } };
	// Inside a tunnel or on a bridge the zone is a built deck, not a tint over the ground, so it takes
	// the road surface colour rather than the lavender. `underground` fades the tunnel one from here.
	return { color: c.roadStreet, opacity: { 12: 0, 13: 1 } };
}

function bicycleStyle(ctx: LayerContext, base: string, vocab: RoadVocabulary): b.StyleProps {
	const { c } = ctx;
	const r: b.StyleProps = { lineJoin, lineCap };
	r.color = c.roadStreet;
	// minor width for these bicycle overlays (track/service overlays get none)
	if (vocab.minorBases.includes(base) || base === 'pedestrian') {
		r.size = MINOR_WIDTH.main;
		r.opacity = { 12: 0, 13: 1 };
		r.color = c.transitCycle;
		r.lineCap = 'round';
	}
	return r;
}

// Path-class ways (footway/steps/path/cycleway), old VersaTiles style: a solid line with a matching
// casing, growing in from 0 width at z13. footway/steps/path use the lavender foot color; cycleway
// the light-blue cycle color. Tunnels are dimmed by `underground` (no dash — see the note there);
// bridges also get a deck (see bridgeDeckStyle).
function wayStyle(ctx: LayerContext, t: string, isOutline: boolean): b.StyleProps | null {
	const { c, fg } = ctx;
	const fill = t === 'cycleway' ? c.transitCycle : c.transitFoot;

	if (isOutline) {
		// Casing: the fill darkened ~10% (matches the old style's outline tint), solid in every prefix.
		return {
			color: fill.blend(0.1, fg),
			lineJoin,
			lineCap,
			size: { 13: 0, 16: 5, 18: 7, 19: 12, 20: 22 },
		};
	}
	return {
		color: fill,
		lineJoin,
		lineCap,
		size: { 13: 0, 16: 4, 18: 6, 19: 10, 20: 20 },
	};
}

// Returns null for variants that should not be drawn at all (e.g. ferry casing, and service track on
// subway and the tram family) so the caller skips them instead of emitting a bare layer. Rail and
// lightrail DO draw their service tracks, in a lighter, narrower variant.
function transportStyle(ctx: LayerContext, t: string, isOutline: boolean): b.StyleProps | null {
	const { c, fg, bg } = ctx;

	if (t === 'ferry')
		return isOutline
			? null
			: {
					minzoom: 10,
					// closest derivation of OSM Bright's ferry teal (#6c9fb6) from the single water color;
					// blend toward `fg` (black in light mode / white in dark mode) rather than absolute darken
					color: c.water.saturate(0.8).blend(0.3, fg),
					size: 1.1,
					opacity: { 10: 0, 11: 1 },
					lineDasharray: [2, 2],
					lineJoin, // OSM Bright: ferry cap butt (default) / join round
				};

	const isService = t.endsWith('-service');
	const rt = isService ? t.slice(0, -'-service'.length) : t;

	let r: b.StyleProps | null;
	if (rt === 'rail' || rt === 'lightrail') {
		// Old VersaTiles railway: a WIDE solid base line (:outline) with a slightly narrower, LIGHTER
		// `[2, 2]`-dashed "tie" line (fill) on top. The darker base shows through the gaps, giving the
		// alternating darker/lighter tie bands (rather than OSM Bright's thin cross-ticks).
		if (isService)
			r = isOutline
				? { color: c.transitRail, size: { 14: 0, 15: 1, 16: 1, 20: 14 } }
				: { color: c.transitRail.blend(0.3, bg), lineDasharray: [2, 2], size: { 15: 0, 16: 1, 20: 10 } };
		else
			r = isOutline
				? // The casing is a hairline well before its width ramp starts moving, so its fade-in is what
					// puts it on the map — and z11 is the earliest zoom at which putting it there is honest.
					//
					// Shortbread ships service tracks (yards, sidings, spurs, crossovers) from z10 but the
					// `service` attribute that identifies them only from z11, so at z10 a marshalling yard is
					// indistinguishable from a main line: at Maschen that is 270 km of track in one tile that
					// this layer would have to draw at full mainline weight. Below z10 the data is clean —
					// service tracks are simply absent — so z8/z9 would be safe, but appearing at z8, blooming
					// into a solid mass at z10 and thinning again at z11 is worse than starting at z11. If the
					// schema ever supplies `service` from z10, this can move back down.
					{
						color: c.transitRail,
						size: { 8: 1, 13: 1, 15: 1, 20: 14 },
						opacity: b.fadeIn(11),
					}
				: {
						color: c.transitRail.blend(0.3, bg),
						lineDasharray: [2, 2],
						size: { 14: 0, 15: 1, 20: 10 },
						opacity: b.fadeIn(14),
					};
	} else if (rt === 'subway') {
		if (isService) return null;
		// Subway: same two-tone tie technique in its own (bluer) grey. The casing joins the map at z11,
		// a city-overview zoom; the ties only make sense once the casing is wide enough to show them.
		r = isOutline
			? {
					color: c.transitSubway,
					size: { 11: 0, 12: 1, 15: 3, 16: 3, 18: 6, 19: 8, 20: 10 },
					opacity: b.fadeIn(11),
				}
			: {
					color: c.transitSubway.blend(0.3, bg),
					lineDasharray: [2, 2],
					size: { 11: 0, 12: 1, 15: 2, 16: 2, 18: 5, 19: 6, 20: 8 },
					opacity: b.fadeIn(14),
				};
	} else {
		// tram / narrowgauge / funicular / monorail
		if (isService) return null;
		// No opacity ramp here: both width curves already grow from 0 (the casing at z15, the track at
		// z13), which is the appearance transition — adding a fade on top would only dim the track
		// through the zooms where it is the sole thing drawn.
		r = isOutline
			? { color: c.transitRail, size: { 15: 0, 16: 5, 18: 7, 20: 20 }, lineDasharray: [0.1, 0.5] }
			: { size: { 13: 0, 16: 1, 17: 2, 18: 3, 20: 5 }, color: c.transitRail };
	}

	return r;
}

function bridgeDeckStyle(ctx: LayerContext, s: string, vocab: RoadVocabulary): b.StyleProps {
	const { c, fg } = ctx;
	const base: b.StyleProps = {
		lineCap,
		lineJoin,
		color: c.land.blend(0.02, fg),
		fillAntialias: true,
		opacity: 0.5,
	};
	if (s.startsWith('way-')) return { ...base, size: { 15: 0, 16: 7, 18: 10, 19: 17, 20: 31 }, minzoom: 15 };

	const t = s.slice('street-'.length);
	const isLink = t.endsWith('-link');
	const bt = isLink ? t.slice(0, -5) : t;

	if (isLink) {
		if (bt === 'motorway') return { ...base, minzoom: 12, size: { 12: 3, 14: 4, 16: 10, 18: 20, 20: 56 } };
		if (bt === 'trunk' || bt === 'primary' || bt === 'secondary')
			return { ...base, minzoom: 13, size: { 12: 3, 14: 4, 16: 10, 18: 20, 20: 56 } };
		// tertiary-link → minor deck
		return { ...base, size: { 12: 3, 14: 4, 16: 8, 18: 36, 19: 90, 20: 179 }, opacity: { 12: 0, 13: 1 } };
	}
	if (vocab.minorBases.includes(bt))
		return { ...base, size: { 12: 3, 14: 4, 16: 8, 18: 36, 19: 90, 20: 179 }, opacity: { 12: 0, 13: 1 } };
	switch (bt) {
		case 'motorway':
			return { ...base, size: { 5: 0, 6: 3, 10: 7, 14: 7, 16: 20, 18: 53, 19: 118, 20: 235 } };
		case 'trunk':
			return { ...base, size: { 7: 0, 8: 3, 10: 6, 14: 8, 16: 17, 18: 50, 19: 104, 20: 202 } };
		case 'primary':
			return { ...base, size: { 8: 0, 9: 1, 10: 6, 14: 8, 16: 17, 18: 50, 19: 104, 20: 202 } };
		case 'secondary':
			return { ...base, size: { 11: 3, 14: 7, 16: 11, 18: 42, 19: 95, 20: 193 }, opacity: { 11: 0, 12: 1 } };
		case 'tertiary':
		case 'pedestrian':
			return { ...base, size: { 12: 3, 14: 4, 16: 8, 18: 36, 19: 90, 20: 179 }, opacity: { 12: 0, 13: 1 } };
		case 'service':
		case 'track':
			return { ...base, size: { 14: 3, 16: 6, 18: 25, 19: 67, 20: 134 }, opacity: { 14: 0, 15: 1 } };
		default: // the bus ways, which carry no deck
			return base;
	}
}

// Compute the fully-resolved style for a road layer from its id.
// Returns the resolved style for a road layer, or null when the layer should not be
// drawn (no styling rule). Every non-null result carries a color, so the caller can
// safely treat it as a colored style for the mandatory-color fill/line builders.
function roadStyle(ctx: LayerContext, id: string, vocab: RoadVocabulary): b.StyleProps | null {
	if (id === 'bridge') return { color: ctx.c.land.blend(0.02, ctx.fg), fillAntialias: true, opacity: 0.8 };

	let prefix: Prefix = '';
	let s = id;
	if (s.startsWith('tunnel-')) {
		prefix = 'tunnel-';
		s = s.slice(7);
	} else if (s.startsWith('bridge-')) {
		prefix = 'bridge-';
		s = s.slice(7);
	}

	let suffix: '' | ':outline' | ':bridge' = '';
	if (s.endsWith(':outline')) {
		suffix = ':outline';
		s = s.slice(0, -8);
	} else if (s.endsWith(':bridge')) {
		suffix = ':bridge';
		s = s.slice(0, -7);
	}

	if (suffix === ':bridge') return bridgeDeckStyle(ctx, s, vocab);
	// `aerialway-<kind>` where a schema names each kind, plain `aerialway` where one filter covers them.
	if (s.startsWith('aerialway')) {
		// Aerialways (cable cars / lifts), OSM Bright style: a thin solid base line (:outline)
		// with a wider dashed line on top (the fill) giving the cable-tick pattern.
		// OSM Bright caps cable-cars round and joins them miter.
		if (suffix === ':outline')
			return { color: ctx.c.transitRail, minzoom: 13, size: { base: 1, stops: { 11: 1, 19: 2.5 } }, lineCap };
		return {
			color: ctx.c.transitRail,
			minzoom: 13,
			size: { base: 1, stops: { 11: 3, 19: 5.5 } },
			lineDasharray: [2, 3],
			lineCap,
		};
	}
	if (s.startsWith('transport-')) return transportStyle(ctx, s.slice('transport-'.length), suffix === ':outline');
	if (s.startsWith('way-')) return wayStyle(ctx, s.slice('way-'.length), suffix === ':outline');
	if (s.startsWith('street-')) {
		const t = s.slice('street-'.length);
		if (t === 'pedestrian-zone') return zoneStyle(ctx, prefix);
		if (t.endsWith('-bicycle')) return bicycleStyle(ctx, t.slice(0, -'-bicycle'.length), vocab);
		return streetLineStyle(ctx, prefix, t, suffix === ':outline', vocab);
	}
	return null;
}

// ── Group tagging (mirrors the old groups.ts road membership) ──────────────────

function roadGroup(id: string, vocab: RoadVocabulary): string | undefined {
	if (id.startsWith('aerialway')) return 'transit.aerialways';
	const s = id.replace(/^(tunnel-|bridge-)/, '');
	if (s.startsWith('transport-ferry')) return 'transit.ferries';
	if (s.startsWith('transport-')) return 'transit.rail';
	if (id === 'bridge') return 'roads.motorways';
	if (s.startsWith('way-steps')) return 'roads.steps';
	if (s.startsWith('way-footway')) return 'roads.footway';
	if (s.startsWith('way-')) return 'roads.paths';
	if (s.startsWith('street-')) {
		let t = s.slice('street-'.length).replace(/(:outline|:bridge)$/, '');
		t = t.replace(/-(link|bicycle|zone)$/, '');
		if (vocab.minorBases.includes(t)) return 'roads.streets.residential';
		if (vocab.serviceBases.includes(t)) return t === 'service' ? 'roads.streets.service' : 'roads.streets.bus';
		switch (t) {
			case 'motorway':
			case 'trunk':
				return 'roads.motorways';
			case 'primary':
			case 'secondary':
			case 'tertiary':
				return 'roads.highways';
			case 'pedestrian':
				return 'roads.streets.pedestrian';
			case 'track':
				return 'roads.streets.track';
		}
	}
	return undefined;
}

// ── Underground (tunnel) treatment ─────────────────────────────────────────────

// The one definition of "this is below ground". Every `tunnel-` layer is routed through
// `underground` by the assembler, so a road or path type added later cannot quietly miss it, and
// there is a single place to look when the treatment needs debugging or tuning.
const UNDERGROUND = {
	// How far a tunnel's colour is faded toward `bg` (white in light mode, black in dark). 0.45 is
	// where the arterials gain the most — ΔE 16 from their surface colour — while still staying ~17
	// clear of every other colour on the map; past ~0.5 the casings start to merge into the ground.
	//
	// KNOWN GAP: `roadStreet` IS `bg`, so a fade cannot move the white minor roads at all and they
	// read the same underground as on the surface. Only a cue that is not a colour can mark those —
	// a dashed fill does it, and is what the test below records as missing. See the exception list
	// there before assuming a road was simply forgotten.
	fade: 0.45,
	// Rail is the exception (see `underground`): it keeps the translucency the old style gave it.
	translucency: 0.5,
} as const;

/** Scale an opacity — a constant or a zoom ramp — by a factor, keeping its shape. */
function scaleOpacity(opacity: b.StyleProps['opacity'], factor: number): b.StyleProps['opacity'] {
	if (opacity === undefined) return factor;
	if (typeof opacity === 'number') return opacity * factor;
	return Object.fromEntries(Object.entries(opacity).map(([z, v]) => [Number(z), v * factor]));
}

/**
 * Apply the underground treatment to one already-styled tunnel layer.
 *
 * Nothing here is per road class: every tunnel layer fades, and rail additionally dims.
 *
 * If a dash is ever added back here, it must set `line-cap: 'butt'`. A round cap extends every dash
 * by half a line width at BOTH ends, so it closes any gap narrower than 1.0 line widths — that is
 * why the `[0.5, 0.25]` and `[1, 0.2]` tunnel dashes this style used to carry all rendered solid.
 */
function underground(ctx: LayerContext, id: string, s: b.StyleProps): b.StyleProps {
	const color = typeof s.color === 'object' ? s.color.blend(UNDERGROUND.fade, ctx.bg) : s.color;

	// Rail keeps the translucency it has always had; its casing and its ties dim together.
	if (id.startsWith('tunnel-transport-'))
		return { ...s, color, opacity: scaleOpacity(s.opacity, UNDERGROUND.translucency) };

	return { ...s, color };
}

/**
 * Emit one schema's road structures as fully-styled layers.
 *
 * `structures` is the schema's own `buildStructures()` output — ids, source-layers and filters — and
 * `vocab` its class names. Everything between is shared.
 */
export function* emitRoads(
	ctx: LayerContext,
	structures: MaplibreLayerDefinition[],
	vocab: RoadVocabulary
): Generator<b.TaggedLayer> {
	for (const def of structures) {
		// every road structure is a fill or line layer (never background)
		const d = def as { id: string; type: string; 'source-layer': string; filter?: FilterSpecification };
		const style = roadStyle(ctx, d.id, vocab);
		if (!style) continue; // no styling rule → don't emit a bare (black) layer
		// A bridge is a mid-road section that must join flush to the surface road at both ends, so its
		// line ends use butt caps (like the old VersaTiles style). Round caps would round off the bridge
		// end into a bulge that overlaps the road it continues, making one street look like two
		// overlapping outlined pieces. Surface and tunnel roads keep round caps.
		if (d.type === 'line' && d.id.startsWith('bridge-')) (style as b.StyleProps).lineCap = 'butt';
		// Depth is a property of the structure, not of the road class, so it is applied here in one
		// pass rather than branching inside every style function.
		const placed = d.id.startsWith('tunnel-') ? underground(ctx, d.id, style) : style;
		const make = d.type === 'fill' ? b.fill : b.line;
		// roadStyle guarantees a color for every non-null result (see its contract).
		yield make(d.id, {
			sourceLayer: d['source-layer'],
			filter: d.filter,
			...(placed as b.ColoredStyleProps),
			group: roadGroup(d.id, vocab),
		});
	}
}

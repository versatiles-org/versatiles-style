import { describe, expect, it } from 'vitest';
import { isDeepStrictEqual } from 'node:util';
import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../index.js';
import { omt } from '../omt/index.js';
import { protomaps } from '../protomaps/index.js';

// The shared road style draws tunnel and bridge variants differently from the surface — a bridge's
// pedestrian zone, for one, is an opaque deck. That is only right if the variant's filter actually
// selects tunnels or bridges. A variant whose filter is the surface filter draws every surface feature a
// second time in the structure style: Protomaps' `landuse` has no tunnel or bridge flag, and its
// pedestrian zones came out solid white until the variants were dropped.

const STYLES: [string, StyleSpecification][] = [
	['shortbread', osm()],
	['openmaptiles', omt()],
	['protomaps', protomaps({ urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } })],
];

const filterOf = (layer: LayerSpecification): unknown => (layer as { filter?: unknown }).filter;
const sourceLayerOf = (layer: LayerSpecification): unknown => (layer as { 'source-layer'?: unknown })['source-layer'];

describe.each(STYLES)('%s tunnel and bridge layers', (_, style) => {
	it('select something other than their surface counterpart', () => {
		const byId = new Map(style.layers.map((layer) => [layer.id, layer]));
		// `tunnel-street-pedestrian-zone` pairs with `street-pedestrian-zone`.
		const pairs = style.layers
			.filter((layer) => /^(tunnel|bridge)-/.test(layer.id))
			.map((layer) => [layer, byId.get(layer.id.replace(/^(tunnel|bridge)-/, ''))] as const)
			.filter((pair): pair is readonly [LayerSpecification, LayerSpecification] => pair[1] !== undefined);
		// Guards against the pairing silently matching nothing after a rename.
		expect(pairs.length).toBeGreaterThan(10);

		const duplicates = pairs
			.filter(
				([layer, surface]) =>
					sourceLayerOf(surface) === sourceLayerOf(layer) && isDeepStrictEqual(filterOf(surface), filterOf(layer))
			)
			.map(([layer]) => layer.id);
		expect(duplicates).toEqual([]);
	});
});

// ── Where tiles begin to mark tunnels and bridges ─────────────────────────────
//
// Below that zoom a tunnel is an ordinary feature, drawn by the surface layer; at it the feature moves to the
// tunnel layer. No check on one layer's own zoom ramp can see that step: rail tunnels faded in opaque, and turned
// translucent at z11 in one frame. So at that zoom, a structure's layer has to look just like the surface layer.
describe.each([
	['shortbread', osm(), 11],
	['protomaps', protomaps({ urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } }), 12],
] as [string, StyleSpecification, number][])(
	'%s tunnels and bridges where the tiles begin to mark them',
	(_, style, marked) => {
		const byId = new Map(style.layers.map((layer) => [layer.id, layer]));
		const paint = (layer: LayerSpecification, key: string) =>
			(layer as { paint?: Record<string, unknown> }).paint?.[key];
		const stops = (value: unknown): [number, unknown][] =>
			Array.isArray(value) && value[0] === 'interpolate'
				? value.slice(3).flatMap((v, i, all) => (i % 2 ? [] : [[v as number, all[i + 1]] as [number, unknown]]))
				: [[-Infinity, value]];
		/** A value at a zoom, for colours only at a stop or where constant. */
		const at = (value: unknown, zoom: number): unknown => {
			const all = stops(value);
			const exact = all.find(([z]) => z === zoom);
			if (exact) return exact[1];
			if (all.length === 1) return all[0][1];
			const next = all.findIndex(([z]) => z > zoom);
			if (next <= 0) return all[next === 0 ? 0 : all.length - 1][1];
			const [[z0, v0], [z1, v1]] = [all[next - 1], all[next]];
			return (v0 as number) + (((v1 as number) - (v0 as number)) * (zoom - z0)) / (z1 - z0);
		};
		const lines = style.layers.filter((layer) => layer.type === 'line' && /^(tunnel|bridge)-/.test(layer.id));
		/** What a line layer draws at a zoom. A hollow casing's width is both edges and the gap between them. */
		const drawn = (layer: LayerSpecification, key: string, zoom: number): unknown => {
			const gap = paint(layer, 'line-gap-width');
			if (key !== 'line-width' || gap === undefined) return at(paint(layer, key), zoom);
			const outer = 2 * (at(paint(layer, key), zoom) as number) + (at(gap, zoom) as number);
			return Math.round(outer * 1e9) / 1e9;
		};

		it('draw like the surface layer they take over from', () => {
			const pairs = lines
				.map((layer) => [layer, byId.get(layer.id.replace(/^(tunnel|bridge)-/, ''))] as const)
				.filter((pair): pair is readonly [LayerSpecification, LayerSpecification] => pair[1] !== undefined)
				.filter(([, surface]) => (surface.minzoom ?? 0) < marked);
			expect(pairs.length).toBeGreaterThan(10);

			const jumps = pairs.flatMap(([layer, surface]) =>
				['line-color', 'line-opacity', 'line-width']
					.filter((key) => JSON.stringify(drawn(layer, key, marked)) !== JSON.stringify(drawn(surface, key, marked)))
					.map(
						(key) =>
							`${layer.id} ${key}: ${String(drawn(layer, key, marked))}, surface ${String(drawn(surface, key, marked))}`
					)
			);
			expect(jumps).toEqual([]);
		});

		it('a bridge deck, with no surface layer to take over from, fades in no earlier', () => {
			const decks = lines.filter((layer) => layer.id.endsWith(':bridge'));
			expect(decks.length).toBeGreaterThan(5);
			const early = decks.filter((layer) => (layer.minzoom ?? 0) < marked).map((layer) => layer.id);
			expect(early).toEqual([]);
			const pops = decks
				.filter((layer) => at(paint(layer, 'line-opacity'), layer.minzoom ?? 0) !== 0)
				.map((layer) => layer.id);
			expect(pops).toEqual([]);
		});

		it('still end up looking underground one zoom later', () => {
			const rail = byId.get('tunnel-transport-rail:outline') as LayerSpecification;
			expect(at(paint(rail, 'line-opacity'), marked)).toBe(1);
			expect(at(paint(rail, 'line-opacity'), marked + 1)).toBe(0.5);
			const road = stops(paint(byId.get('tunnel-street-motorway') as LayerSpecification, 'line-color'));
			expect(road.map(([z]) => z)).toEqual([marked, marked + 1]);
			expect(road[0][1]).toBe(paint(byId.get('street-motorway') as LayerSpecification, 'line-color'));
			expect(road[1][1]).not.toBe(road[0][1]);
			// A road tunnel turns translucent too (issue #150), all but its casing.
			const fill = byId.get('tunnel-street-motorway') as LayerSpecification;
			expect(at(paint(fill, 'line-opacity'), marked)).toBe(1);
			expect(at(paint(fill, 'line-opacity'), marked + 1)).toBe(0.4);
			const casing = byId.get('tunnel-street-motorway:outline') as LayerSpecification;
			expect(at(paint(casing, 'line-opacity'), marked + 1)).toBe(1);
		});

		it('draw a road tunnel casing hollow, beside its fill, at least 1 px a side', () => {
			const casings = lines.filter((layer) => /^tunnel-(street|way)-.*:outline$/.test(layer.id));
			expect(casings.length).toBeGreaterThan(10);
			const wrong = casings.flatMap((casing) => {
				const fill = byId.get(casing.id.slice(0, -':outline'.length)) as LayerSpecification;
				const problems: string[] = [];
				if (JSON.stringify(paint(casing, 'line-gap-width')) !== JSON.stringify(paint(fill, 'line-width')))
					problems.push(`${casing.id}: gap is not the fill's width`);
				const thin = stops(paint(casing, 'line-width')).filter(([z, w]) => z > marked && (w as number) < 1);
				if (thin.length) problems.push(`${casing.id}: ${JSON.stringify(thin)}`);
				return problems;
			});
			expect(wrong).toEqual([]);
		});
	}
);

// ── Casing must never be narrower than the line it cases ──────────────────────
//
// Every cased road is two layers: `<id>:outline` draws the casing, `<id>` the fill on top of it. The
// casing is the wider of the two at every zoom, which is what makes it visible as an outline. Get the
// pair the wrong way round and the fill covers the casing completely — the road loses its outline and
// is drawn at the casing's width instead of its own.
//
// `street-primary` shipped that way: `9: 1` casing against `9: 2` fill, where every other arterial
// starts `2` against `1`. Between z8.5 and z9.5 primary roads drew as a bare fill, one pixel too wide,
// on all three of `street-primary`, `tunnel-street-primary` and `bridge-street-primary`.
describe('road casing is never narrower than its fill', () => {
	// Two pairs invert deliberately, and say so where they are defined:
	//  - aerialway: a thin solid base line with a wider dashed line on top, which is what draws the
	//    cable ticks. The "casing" is the cable, not an outline.
	//  - transit-minorrail: the casing appears at z15 while the track is already drawn from z13, so
	//    the track is legitimately the wider of the two until the casing arrives.
	const DELIBERATE = /aerialway|minorrail/;

	/** The `[zoom, value]` stops of an `interpolate` expression, or null for anything else. */
	function stopsOf(width: unknown): [number, number][] | null {
		if (!Array.isArray(width) || width[0] !== 'interpolate') return null;
		const flat = width.slice(3);
		const pairs: [number, number][] = [];
		for (let i = 0; i + 1 < flat.length; i += 2) {
			if (typeof flat[i] !== 'number' || typeof flat[i + 1] !== 'number') return null;
			pairs.push([flat[i] as number, flat[i + 1] as number]);
		}
		return pairs;
	}

	for (const [schema, style] of STYLES) {
		it(`holds for every cased road in ${schema}`, () => {
			const byId = new Map(style.layers.map((layer) => [layer.id, layer]));
			const inverted: string[] = [];

			for (const layer of style.layers) {
				if (!layer.id.endsWith(':outline') || DELIBERATE.test(layer.id)) continue;
				const fill = byId.get(layer.id.slice(0, -':outline'.length));
				if (!fill) continue;

				const casingPaint = (layer as { paint?: Record<string, unknown> }).paint;
				const casingStops = stopsOf(casingPaint?.['line-width']);
				const fillStops = stopsOf((fill as { paint?: Record<string, unknown> }).paint?.['line-width']);
				if (!casingStops || !fillStops) continue;
				// A hollow casing (a road tunnel's) draws two edges around a gap, so it is that much wider.
				const gapAt = new Map(stopsOf(casingPaint?.['line-gap-width']) ?? []);
				const hollow = casingPaint?.['line-gap-width'] !== undefined;

				// Compare only the zooms both curves declare; a stop one side lacks is interpolated and
				// says nothing about the author's intent.
				const fillAt = new Map(fillStops);
				for (const [zoom, edge] of casingStops) {
					const value = fillAt.get(zoom);
					const gap = gapAt.get(zoom);
					if (hollow && gap === undefined) continue;
					const casing = hollow ? 2 * edge + (gap ?? 0) : edge;
					if (value !== undefined && casing < value) {
						inverted.push(`${layer.id} @z${zoom}: casing ${casing} < fill ${value}`);
					}
				}
			}

			expect(inverted).toEqual([]);
		});
	}
});

// The casing/fill check above compares two width curves, so it can only skip a layer that has none —
// `if (!casingStops || !fillStops) continue`. That blind spot is exactly where nine width-less line
// layers hid: a `line` layer with no `line-width` is not invisible, it is MapLibre's 1px default, and
// with no ramp to derive a gate from it drew from the source-layer data floor. The bicycle overlays
// came out as solid white hairlines over every track and service road from z5.
describe.each(STYLES)('%s line layers', (_, style) => {
	it('all declare a line-width', () => {
		const widthless = style.layers
			.filter((layer) => layer.type === 'line')
			.filter((layer) => (layer as { paint?: Record<string, unknown> }).paint?.['line-width'] === undefined)
			.map((layer) => layer.id);

		expect(widthless).toEqual([]);
	});
});

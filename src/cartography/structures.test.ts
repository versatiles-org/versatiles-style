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

				const casingStops = stopsOf((layer as { paint?: Record<string, unknown> }).paint?.['line-width']);
				const fillStops = stopsOf((fill as { paint?: Record<string, unknown> }).paint?.['line-width']);
				if (!casingStops || !fillStops) continue;

				// Compare only the zooms both curves declare; a stop one side lacks is interpolated and
				// says nothing about the author's intent.
				const fillAt = new Map(fillStops);
				for (const [zoom, casing] of casingStops) {
					const value = fillAt.get(zoom);
					if (value !== undefined && casing < value) {
						inverted.push(`${layer.id} @z${zoom}: casing ${casing} < fill ${value}`);
					}
				}
			}

			expect(inverted).toEqual([]);
		});
	}
});

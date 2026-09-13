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

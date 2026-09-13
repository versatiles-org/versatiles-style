import { describe, expect, it } from 'vitest';
import { featureFilter, type FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import { protomaps } from './api.js';

// Path features as the Protomaps tiles carry them: `kind: path`, the OSM value in `kind_detail`.
const style = protomaps({ urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } });
const surfaceLines = (style.layers as { id: string; type: string; filter?: FilterSpecification }[]).filter(
	(l) => l.type === 'line' && !l.id.startsWith('tunnel-') && !l.id.startsWith('bridge-') && !l.id.endsWith(':outline')
);

/** The surface-level line layers whose filter accepts a path with this `kind_detail`. */
function layersFor(kindDetail: string): string[] {
	const feature = { type: 2 as const, properties: { kind: 'path', kind_detail: kindDetail } };
	return surfaceLines.filter((l) => featureFilter(l.filter, 'filter').filter({ zoom: 16 }, feature)).map((l) => l.id);
}

describe('protomaps() paths', () => {
	it.each(['footway', 'sidewalk', 'crossing'])('draws `kind_detail: %s` as a footway, as the other schemas do', (d) => {
		expect(layersFor(d)).toEqual(['way-footway']);
	});

	it.each([
		['steps', 'way-steps'],
		['path', 'way-path'],
		['cycleway', 'way-cycleway'],
	])('draws `kind_detail: %s` as %s', (detail, layer) => {
		expect(layersFor(detail)).toEqual([layer]);
	});

	it('leaves indoor corridors out, as Shortbread and OpenMapTiles do', () => {
		expect(layersFor('corridor')).toEqual([]);
	});
});

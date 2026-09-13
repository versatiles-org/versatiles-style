import { describe, expect, it } from 'vitest';
import { featureFilter, type FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import { protomaps } from './api.js';

// Water polygons as the Protomaps tiles carry them: generic `kind: water`, refined by `kind_detail`.
const style = protomaps({ urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } });
const waterFills = (style.layers as { id: string; type: string; filter?: FilterSpecification }[]).filter(
	(l) => l.type === 'fill' && l.id.startsWith('water-')
);

/** The water fill layers whose filter accepts a polygon with these properties. */
function fillsFor(properties: Record<string, string>): string[] {
	const feature = { type: 3 as const, properties };
	return waterFills.filter((l) => featureFilter(l.filter, 'filter').filter({ zoom: 14 }, feature)).map((l) => l.id);
}

describe('protomaps() water areas', () => {
	it('draws river areas (`kind: water, kind_detail: river`) as rivers, not lakes', () => {
		expect(fillsFor({ kind: 'water', kind_detail: 'river' })).toEqual(['water-area-river']);
		expect(fillsFor({ kind: 'river' })).toEqual(['water-area-river']);
	});

	it.each([
		[{ kind: 'water', kind_detail: 'lake' }],
		[{ kind: 'water' }],
		[{ kind: 'water', kind_detail: 'canal' }],
		[{ kind: 'water', kind_detail: 'basin' }],
		[{ kind: 'lake' }],
	])('draws %o as a lake, as Shortbread files it', (properties) => {
		expect(fillsFor(properties)).toEqual(['water-area']);
	});
});

import { describe, expect, it } from 'vitest';
import { featureFilter, type FilterSpecification } from '@maplibre/maplibre-gl-style-spec';
import { protomaps } from './api.js';

// Place features as the Protomaps tiles carry them (surveyed across the cached tiles, z2–15): the type in
// `kind_detail`, `capital` as a string.
const style = protomaps({ urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' } });
const placeLayers = (style.layers as { id: string; 'source-layer'?: string; filter?: FilterSpecification }[]).filter(
	(l) => l['source-layer'] === 'places'
);

/** The place-label layers whose filter accepts a feature with these properties. */
function labelsFor(properties: Record<string, string | number>): string[] {
	const feature = { type: 1 as const, properties };
	return placeLayers.filter((l) => featureFilter(l.filter, 'filter').filter({ zoom: 10 }, feature)).map((l) => l.id);
}

describe('protomaps() place labels', () => {
	it.each([
		[{ kind: 'locality', kind_detail: 'city' }, 'label-place-city'],
		[{ kind: 'locality', kind_detail: 'town' }, 'label-place-town'],
		[{ kind: 'locality', kind_detail: 'village' }, 'label-place-village'],
		[{ kind: 'locality', kind_detail: 'hamlet' }, 'label-place-hamlet'],
		[{ kind: 'neighbourhood', kind_detail: 'suburb' }, 'label-place-suburb'],
		[{ kind: 'neighbourhood', kind_detail: 'neighbourhood' }, 'label-place-neighbourhood'],
		[{ kind: 'macrohood', kind_detail: 'quarter' }, 'label-place-quarter'],
	])('labels %o with %s', (properties, layer) => {
		expect(labelsFor(properties)).toEqual([layer]);
	});

	it('labels a national capital (`capital: yes`) once, as a capital', () => {
		expect(labelsFor({ kind: 'locality', kind_detail: 'city', capital: 'yes' })).toEqual(['label-place-capital']);
	});

	it('labels a state capital (`capital: 4`) once, as a state capital', () => {
		expect(labelsFor({ kind: 'locality', kind_detail: 'city', capital: '4' })).toEqual(['label-place-statecapital']);
		expect(labelsFor({ kind: 'locality', kind_detail: 'town', capital: '4' })).toEqual(['label-place-statecapital']);
	});

	it('keeps lower admin-level capitals as plain cities and towns', () => {
		expect(labelsFor({ kind: 'locality', kind_detail: 'city', capital: '6' })).toEqual(['label-place-city']);
		expect(labelsFor({ kind: 'locality', kind_detail: 'town', capital: '7' })).toEqual(['label-place-town']);
	});

	it('still reads the type from `kind` when a feature has no `kind_detail`', () => {
		expect(labelsFor({ kind: 'city' })).toEqual(['label-place-city']);
		expect(labelsFor({ kind: 'city', capital: 2 })).toEqual(['label-place-capital']);
	});
});

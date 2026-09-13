import { describe, expect, it } from 'vitest';
import { protomaps } from './api.js';

const urls = { protomaps: 'pmtiles://https://example.org/x.pmtiles' };
const lowZoomIds = (options: Parameters<typeof protomaps>[0]) =>
	protomaps({ urls, ...options })
		.layers.map((l) => l.id)
		.filter((id) => id.startsWith('land-lowzoom-'));

describe('protomaps() features.landcover', () => {
	it('is off by default, so the coarse low-zoom band is not drawn — as in osm()', () => {
		expect(protomaps.defaults.features.landcover).toBe(false);
		expect(lowZoomIds({})).toEqual([]);
	});

	it('draws the coarse low-zoom band from the `landcover` source-layer when on', () => {
		const ids = lowZoomIds({ features: { landcover: true } });
		expect(ids).toEqual([
			'land-lowzoom-forest',
			'land-lowzoom-grass',
			'land-lowzoom-scrub',
			'land-lowzoom-farmland',
			'land-lowzoom-barren',
			'land-lowzoom-urban',
		]);
		const layers = protomaps({ urls, features: { landcover: true } }).layers as {
			id: string;
			'source-layer'?: string;
		}[];
		expect(layers.filter((l) => ids.includes(l.id)).every((l) => l['source-layer'] === 'landcover')).toBe(true);
	});

	it('draws the low-zoom band beneath the detailed land fills', () => {
		const ids = protomaps({ urls, features: { landcover: true } }).layers.map((l) => l.id);
		expect(ids.indexOf('land-lowzoom-urban')).toBeLessThan(ids.indexOf('land-commercial'));
	});

	it('lists the low-zoom layers in their layer groups, since the option can emit them', () => {
		const land = protomaps.layerGroups.land as Record<string, string[]>;
		expect(land.forest).toContain('land-lowzoom-forest');
		expect(land.urban).toContain('land-lowzoom-urban');
	});

	it('still rejects feature keys it does not know', () => {
		expect(() => protomaps({ urls, features: { contours: true } } as never)).toThrow(/features\.contours/);
	});
});

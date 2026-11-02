import { describe, expect, it } from 'vitest';
import { osm } from '../api/osm.js';
import { omt } from './api.js';
import { protomaps } from '../protomaps/api.js';

const minzoom = (style: ReturnType<typeof osm>, id: string) => style.layers.find((l) => l.id === id)?.minzoom;

describe('omt() waterway zooms', () => {
	it('starts river lines at z9, as Shortbread does, although OpenMapTiles tiles them from z3', () => {
		expect(minzoom(omt(), 'water-river')).toBe(9);
		expect(minzoom(omt(), 'water-river')).toBe(minzoom(osm(), 'water-river'));
	});

	it('starts stream lines at z14, as Shortbread does, although OpenMapTiles tiles them from z13', () => {
		expect(minzoom(omt(), 'water-stream')).toBe(14);
		expect(minzoom(omt(), 'water-stream')).toBe(minzoom(osm(), 'water-stream'));
	});
});

// A fade over before the data arrives is no fade: the layer pops in where its data begins, which no check
// on the style alone can see. These zooms were measured in tiles, and differ from Shortbread's.
describe('omt() fades in where its tiles begin', () => {
	it('canals, from z12', () => {
		expect(minzoom(omt(), 'water-canal')).toBe(12);
		expect(minzoom(osm(), 'water-canal')).toBe(9);
	});

	it('bridge areas, from z13', () => {
		expect(minzoom(omt(), 'bridge')).toBe(13);
		expect(minzoom(osm(), 'bridge')).toBe(12);
	});

	it.each([
		['water-area-river', 6],
		['water-pier-area', 13],
		['water-pier', 13],
		['street-tertiary', 11],
		['street-pedestrian-bicycle', 13],
		['transport-subway:outline', 14],
		['transport-tram', 14],
	])('%s, from z%i', (id, zoom) => {
		expect(minzoom(omt(), id)).toBe(zoom);
	});
});

describe('protomaps() fades in where its tiles begin', () => {
	const style = () => protomaps({ urls: { protomaps: 'https://example.org/tiles.json' } });

	it.each([
		['water-area-river', 6],
		['street-livingstreet', 14],
		['street-busway', 14],
		['transport-subway:outline', 14],
		['transport-lightrail:outline', 14],
		['transport-funicular', 14],
		['transport-tram', 14],
		['transport-ferry', 11],
	])('%s, from z%i', (id, zoom) => {
		expect(minzoom(style(), id)).toBe(zoom);
	});
});

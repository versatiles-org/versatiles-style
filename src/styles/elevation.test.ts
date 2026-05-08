import { afterEach, describe, expect, it, vi } from 'vitest';
import { colorful, eclipse, graybeard, neutrino, shadow } from './index.js';

const fakeElevationTilejson = {
	tilejson: '3.0.0',
	tiles: ['/tiles/elevation/{z}/{x}/{y}'],
	bounds: [-180, -85, 180, 85],
	minzoom: 0,
	maxzoom: 12,
	attribution: 'fake-elevation',
	tile_schema: 'dem/terrarium',
};

describe('vector styles + elevation', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns a sync StyleSpecification when terrain/hillshade are not requested', () => {
		const style = colorful({ baseUrl: 'https://example.org' });
		// If anything were async this would be a Promise; we explicitly assert it's a plain style
		expect(style).toHaveProperty('layers');
		expect(style.sources.elevation).toBeUndefined();
		expect(style.terrain).toBeUndefined();
	});

	it('adds a raster-dem source and style.terrain when terrain is enabled', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(() => Promise.resolve(Response.json(fakeElevationTilejson)));

		const style = await colorful({ baseUrl: 'https://example.org', terrain: true });

		expect(fetchSpy).toHaveBeenCalledWith('https://example.org/tiles/elevation/tiles.json');
		expect(style.sources.elevation).toMatchObject({ type: 'raster-dem', encoding: 'terrarium' });
		expect(style.terrain).toEqual({ source: 'elevation', exaggeration: 1 });
	});

	it('honours custom terrain exaggeration', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(Response.json(fakeElevationTilejson)));

		const style = await colorful({ terrain: { exaggeration: 2 } });

		expect(style.terrain).toEqual({ source: 'elevation', exaggeration: 2 });
	});

	it('places hillshade above land/water fills but below lines/symbols', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(Response.json(fakeElevationTilejson)));

		const style = await colorful({ hillshade: true });

		const hillshadeIdx = style.layers.findIndex((l) => l.id === 'hillshade');
		expect(hillshadeIdx).toBeGreaterThan(0);

		// All preceding layers should be background/fill/raster (so fills don't paint over hillshade)
		for (let i = 0; i < hillshadeIdx; i++) {
			expect(['background', 'fill', 'raster']).toContain(style.layers[i].type);
		}
		// The very next layer should be a line/symbol (not a fill that would cover hillshade)
		const next = style.layers[hillshadeIdx + 1];
		expect(['line', 'symbol']).toContain(next.type);
	});

	it('passes hillshade paint customization through', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(Response.json(fakeElevationTilejson)));

		const style = await colorful({
			hillshade: { shadowColor: '#123456', highlightColor: '#abcdef', illuminationDirection: 90 },
		});

		const hillshade = style.layers.find((l) => l.id === 'hillshade');
		expect(hillshade).toMatchObject({
			paint: {
				'hillshade-shadow-color': '#123456',
				'hillshade-highlight-color': '#abcdef',
				'hillshade-illumination-direction': 90,
			},
		});
	});

	it('respects a custom elevationTilejson URL', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(() => Promise.resolve(Response.json(fakeElevationTilejson)));

		await colorful({ terrain: true, elevationTilejson: 'https://elev.example.com/dem.json' });

		expect(fetchSpy).toHaveBeenCalledWith('https://elev.example.com/dem.json');
	});

	it.each([
		{ name: 'colorful', builder: colorful },
		{ name: 'eclipse', builder: eclipse },
		{ name: 'graybeard', builder: graybeard },
		{ name: 'neutrino', builder: neutrino },
		{ name: 'shadow', builder: shadow },
	])('supports terrain + hillshade for $name', async ({ builder }) => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(Response.json(fakeElevationTilejson)));

		const style = await builder({ terrain: true, hillshade: true });

		expect(style.sources.elevation).toMatchObject({ type: 'raster-dem' });
		expect(style.terrain).toMatchObject({ source: 'elevation' });
		expect(style.layers.find((l) => l.id === 'hillshade')).toBeDefined();
	});
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSatelliteStyle } from './satellite.js';

const fakeTilejson = {
	tilejson: '3.0.0',
	tiles: ['/tiles/satellite/{z}/{x}/{y}'],
	bounds: [-180, -85, 180, 85],
	minzoom: 0,
	maxzoom: 14,
	attribution: 'fake',
};

describe('satellite style', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});
	it('should create a satellite style with default options', async () => {
		const style = await buildSatelliteStyle();

		expect(style.name).toBe('versatiles-satellite');
		expect(style.sources.satellite).toStrictEqual({
			attribution: "<a href='https://versatiles.org/sources/'>VersaTiles sources</a>",
			bounds: [-180, -85.051129, 180, 85.051129],
			center: [-61.170502, 18.329982, 2],
			description: 'High-resolution satellite and orthophoto imagery from various providers, merged by VersaTiles.',
			maxzoom: 17,
			minzoom: 0,
			name: 'VersaTiles - Satellite + Orthophotos',
			tile_format: 'image/webp',
			tile_schema: 'rgb',
			tile_type: 'raster',
			tilejson: '3.0.0',
			tiles: ['https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}'],
			type: 'raster',
			version: '3.0',
		});

		// Raster layer should be the first layer
		expect(style.layers[0]).toMatchObject({
			id: 'satellite',
			type: 'raster',
			source: 'satellite',
		});
	});

	it('should include vector overlay by default', async () => {
		const style = await buildSatelliteStyle();

		// Should have more than just the raster layer
		expect(style.layers.length).toBeGreaterThan(1);

		// Should have the vector source
		expect(style.sources['versatiles-shortbread']).toStrictEqual({
			type: 'vector',
			attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			bounds: [-180, -85.0511287798066, 180, 85.0511287798066],
			maxzoom: 14,
			minzoom: 0,
			scheme: 'xyz',
			tiles: ['https://tiles.versatiles.org/tiles/osm/{z}/{x}/{y}'],
		});

		// Should not contain background layer
		expect(style.layers.find((l) => l.id === 'background')).toBeUndefined();

		// Should not contain fill layers
		expect(style.layers.filter((l) => l.type === 'fill')).toHaveLength(0);

		// Should not contain land-*, water-*, site-*, airport-*, tunnel-* layers
		const unwanted = style.layers.filter((l) => /^(land|water|site|airport|tunnel)-/.test(l.id));
		expect(unwanted).toHaveLength(0);
	});

	it('should modify symbol layers for satellite overlay', async () => {
		const style = await buildSatelliteStyle();

		const symbolLayers = style.layers.filter((l) => l.type === 'symbol');
		expect(symbolLayers.length).toBeGreaterThan(0);

		for (const layer of symbolLayers) {
			if (layer.type !== 'symbol') continue;
			if (layer.paint) {
				expect(layer.paint['text-color']).toBe('#fff');
				expect(layer.paint['text-halo-color']).toBe('#000');
			}
			if (layer.layout?.['text-font']) {
				expect(layer.layout['text-font']).toEqual(['noto_sans_bold']);
			}
		}
	});

	it('should reduce line layer opacity', async () => {
		const style = await buildSatelliteStyle();

		const lineLayers = style.layers.filter((l) => l.type === 'line');
		expect(lineLayers.length).toBeGreaterThan(0);

		for (const layer of lineLayers) {
			if (layer.type !== 'line' || !layer.paint) continue;
			const opacity = layer.paint['line-opacity'];
			if (typeof opacity === 'number') {
				expect(opacity).toBeLessThanOrEqual(0.2);
			}
		}
	});

	it('should create minimal style when overlay is false', async () => {
		const style = await buildSatelliteStyle({ overlay: false });

		expect(style.name).toBe('versatiles-satellite');
		// Should only have the raster layer
		expect(style.layers).toHaveLength(1);
		expect(style.layers[0]).toMatchObject({
			id: 'satellite',
			type: 'raster',
			source: 'satellite',
		});

		// Should only have the raster source
		expect(Object.keys(style.sources)).toEqual(['satellite']);
	});

	it('should accept custom rasterTilejson', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(fakeTilejson));

		const style = await buildSatelliteStyle({ rasterTilejson: 'https://example.com/satellite.json' });

		expect(fetchSpy).toHaveBeenCalledWith('https://example.com/satellite.json');
		expect(style.sources.satellite).toMatchObject({
			type: 'raster',
			tiles: ['https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}'],
		});
	});

	it('should accept custom baseUrl', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json(fakeTilejson));

		const style = await buildSatelliteStyle({ baseUrl: 'https://example.org' });

		expect(fetchSpy).toHaveBeenCalledWith('https://example.org/tiles/satellite/tiles.json');
		expect(style.glyphs).toBe('https://example.org/assets/glyphs/{fontstack}/{range}.pbf');
		expect(style.sources.satellite).toMatchObject({
			type: 'raster',
			tiles: ['https://example.org/tiles/satellite/{z}/{x}/{y}'],
		});
	});

	it('should apply raster paint properties', async () => {
		const style = await buildSatelliteStyle({
			overlay: false,
			rasterOpacity: 0.8,
			rasterHueRotate: 45,
			rasterBrightnessMin: 0.1,
			rasterBrightnessMax: 0.9,
			rasterSaturation: 0.5,
			rasterContrast: -0.3,
		});

		const rasterLayer = style.layers[0];
		expect(rasterLayer).toMatchObject({
			paint: {
				'raster-opacity': 0.8,
				'raster-hue-rotate': 45,
				'raster-brightness-min': 0.1,
				'raster-brightness-max': 0.9,
				'raster-saturation': 0.5,
				'raster-contrast': -0.3,
			},
		});
	});

	it('should not include raster paint when no raster options set', async () => {
		const style = await buildSatelliteStyle({ overlay: false });

		const rasterLayer = style.layers[0];
		expect(rasterLayer).not.toHaveProperty('paint');
	});

	it('should accept language option', async () => {
		const style = await buildSatelliteStyle({ language: 'de' });

		// Style should still be valid
		expect(style.name).toBe('versatiles-satellite');
		expect(style.layers.length).toBeGreaterThan(1);
	});
});

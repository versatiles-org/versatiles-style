import { describe, expect, it } from 'vitest';
import { buildSatelliteStyle } from './satellite.js';

describe('satellite style', () => {
	it('should create a satellite style with default options', () => {
		const style = buildSatelliteStyle();

		expect(style.name).toBe('versatiles-satellite');
		expect(style.sources.orthophotos).toBeDefined();
		expect(style.sources.orthophotos).toMatchObject({
			type: 'raster',
			tiles: ['https://tiles.versatiles.org/tiles/satellite/{z}/{x}/{y}'],
			tileSize: 512,
			maxzoom: 17,
		});

		// Raster layer should be the first layer
		expect(style.layers[0]).toMatchObject({
			id: 'orthophotos',
			type: 'raster',
			source: 'orthophotos',
		});
	});

	it('should include vector overlay by default', () => {
		const style = buildSatelliteStyle();

		// Should have more than just the raster layer
		expect(style.layers.length).toBeGreaterThan(1);

		// Should have the vector source
		expect(style.sources['versatiles-shortbread']).toBeDefined();

		// Should not contain background layer
		expect(style.layers.find((l) => l.id === 'background')).toBeUndefined();

		// Should not contain fill layers
		expect(style.layers.filter((l) => l.type === 'fill')).toHaveLength(0);

		// Should not contain land-*, water-*, site-*, airport-*, tunnel-* layers
		const unwanted = style.layers.filter((l) => /^(land|water|site|airport|tunnel)-/.test(l.id));
		expect(unwanted).toHaveLength(0);
	});

	it('should modify symbol layers for satellite overlay', () => {
		const style = buildSatelliteStyle();

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

	it('should reduce line layer opacity', () => {
		const style = buildSatelliteStyle();

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

	it('should create minimal style when overlay is false', () => {
		const style = buildSatelliteStyle({ overlay: false });

		expect(style.name).toBe('versatiles-satellite');
		// Should only have the raster layer
		expect(style.layers).toHaveLength(1);
		expect(style.layers[0]).toMatchObject({
			id: 'orthophotos',
			type: 'raster',
			source: 'orthophotos',
		});

		// Should only have the raster source
		expect(Object.keys(style.sources)).toEqual(['orthophotos']);
	});

	it('should accept custom raster tiles', () => {
		const customTiles = ['https://example.com/tiles/{z}/{x}/{y}'];
		const style = buildSatelliteStyle({ rasterTiles: customTiles });

		const source = style.sources.orthophotos as { tiles: string[] };
		expect(source.tiles).toEqual(customTiles);
	});

	it('should accept custom baseUrl', () => {
		const style = buildSatelliteStyle({ baseUrl: 'https://example.org' });

		expect(style.glyphs).toBe('https://example.org/assets/glyphs/{fontstack}/{range}.pbf');
	});

	it('should apply raster paint properties', () => {
		const style = buildSatelliteStyle({
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

	it('should not include raster paint when no raster options set', () => {
		const style = buildSatelliteStyle({ overlay: false });

		const rasterLayer = style.layers[0];
		expect(rasterLayer).not.toHaveProperty('paint');
	});

	it('should accept language option', () => {
		const style = buildSatelliteStyle({ language: 'de' });

		// Style should still be valid
		expect(style.name).toBe('versatiles-satellite');
		expect(style.layers.length).toBeGreaterThan(1);
	});
});

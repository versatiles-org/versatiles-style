import { beforeEach, describe, expect, it } from 'vitest';
import { Color } from '../color/index.js';
import type { StyleRules, StyleRulesOptions } from './types.js';
import { StyleBuilder } from './style_builder.js';
import { VectorSourceSpecification } from '@maplibre/maplibre-gl-style-spec';
import Colorful from '../styles/colorful.js';

// Mock class for abstract class StyleBuilder
class MockStyleBuilder extends Colorful {
	public readonly name = 'mock';

	public defaultFonts = { regular: 'Arial', bold: 'Courier' };

	public invertColors(): void {
		this.transformDefaultColors((color) => color.invert());
	}

	protected getStyleRules(opt: StyleRulesOptions): StyleRules {
		for (const color of Object.values(opt.colors)) if (!(color instanceof Color)) throw Error();
		for (const font of Object.values(opt.fonts)) if (typeof font !== 'string') throw Error();

		return {
			'water-area': {
				textColor: opt.colors.land,
				textSize: 12,
				textFont: opt.fonts.regular,
			},
		};
	}
}

describe('StyleBuilder', () => {
	let builder: MockStyleBuilder;

	beforeEach(() => {
		builder = new MockStyleBuilder();
	});

	it('should create an instance of StyleBuilder', () => {
		expect(builder).toBeInstanceOf(StyleBuilder);
	});

	it('should build a MaplibreStyle object', () => {
		const style = builder.build();
		expect(style).toBeDefined();
		expect(style).toHaveProperty('name');
		expect(style).toHaveProperty('layers');
		expect(style).toHaveProperty('glyphs');
		expect(style).toHaveProperty('sprite');
	});

	it('should transform colors correctly', () => {
		const initialColor = Color.parse(builder.defaultColors.land).asHex();
		builder.invertColors();
		const newColor = Color.parse(builder.defaultColors.land).asHex();
		expect(newColor).not.toBe(initialColor);
		expect(newColor).toBe(Color.parse(initialColor).invert().asHex());
	});

	it('should create default options', () => {
		expect(builder.getDefaultOptions()).toStrictEqual({
			baseUrl: 'https://tiles.versatiles.org',
			bounds: [-180, -85.0511287798066, 180, 85.0511287798066],
			colors: {
				agriculture: '#F0E7D1',
				boundary: '#A6A6C8',
				building: '#F2EAE2',
				buildingbg: '#DFDBD7',
				burial: '#DDDBCA',
				commercial: '#F7DEED40',
				construction: '#A9A9A9',
				cycle: '#EFF9FF',
				danger: '#FF0000',
				disputed: '#BEBCCF',
				education: '#FFFF80',
				foot: '#FBEBFF',
				glacier: '#FFFFFF',
				grass: '#D8E8C8',
				hospital: '#FF6666',
				industrial: '#FFF4C255',
				label: '#333344',
				labelHalo: '#FFFFFFCC',
				land: '#F9F4EE',
				leisure: '#E7EDDE',
				motorway: '#FFCC88',
				motorwaybg: '#E9AC77',
				park: '#D9D9A5',
				parking: '#EBE8E6',
				poi: '#555555',
				prison: '#FDF2FC',
				rail: '#B1BBC4',
				residential: '#EAE6E133',
				rock: '#E0E4E5',
				sand: '#FAFAED',
				shield: '#FFFFFF',
				street: '#FFFFFF',
				streetbg: '#CFCDCA',
				subway: '#A6B8C7',
				symbol: '#66626A',
				trunk: '#FFEEAA',
				trunkbg: '#E9AC77',
				waste: '#DBD6BD',
				water: '#BEDDF3',
				wetland: '#D3E6DB',
				wood: '#66AA44',
			},
			elevationTilejson: '/tiles/elevation/tiles.json',
			experimental: {},
			fonts: { regular: 'Arial', bold: 'Courier' },
			glyphs: '/assets/glyphs/{fontstack}/{range}.pbf',
			hideLabels: false,
			hillshade: false,
			iconScale: 1,
			language: '',
			languageStrict: false,
			terrain: false,
			textScale: 1,
			recolor: {
				brightness: 0,
				contrast: 1,
				gamma: 1,
				invertBrightness: false,
				rotate: 0,
				saturate: 0,
				tint: 0,
				tintColor: '#FF0000',
				blend: 0,
				blendColor: '#000000',
			},
			sprite: [{ id: 'basics', url: '/assets/sprites/basics/sprites' }],
			tiles: ['/tiles/osm/{z}/{x}/{y}'],
		});
	});

	describe('build method', () => {
		it('should create a style object', () => {
			const style = builder.build();
			expect(style).toBeDefined();
			expect(style).toHaveProperty('layers');
			expect(style).toHaveProperty('name');
			expect(style).toHaveProperty('glyphs');
			expect(style).toHaveProperty('sprite');
		});

		it('should resolve urls correctly', () => {
			const style = builder.build({ baseUrl: 'https://my.base.url/' });
			expect(style.glyphs).toBe('https://my.base.url/assets/glyphs/{fontstack}/{range}.pbf');
			expect(style.sprite).toStrictEqual([{ id: 'basics', url: 'https://my.base.url/assets/sprites/basics/sprites' }]);

			const source = style.sources['versatiles-shortbread'] as VectorSourceSpecification;
			expect(source).toHaveProperty('tiles');
			expect(source.tiles).toStrictEqual(['https://my.base.url/tiles/osm/{z}/{x}/{y}']);
		});

		it('should leave text-size unchanged when textScale is 1', () => {
			const baseline = builder.build();
			const scaled = builder.build({ textScale: 1 });

			const baselineSizes = baseline.layers
				.filter((l) => l.type === 'symbol')
				.map((l) => (l.layout as Record<string, unknown>)?.['text-size']);
			const scaledSizes = scaled.layers
				.filter((l) => l.type === 'symbol')
				.map((l) => (l.layout as Record<string, unknown>)?.['text-size']);

			expect(scaledSizes).toStrictEqual(baselineSizes);
		});

		it('should scale text-size on symbol layers when textScale is set', () => {
			const baseline = builder.build();
			const scaled = builder.build({ textScale: 2 });

			const baselineSymbols = baseline.layers.filter((l) => l.type === 'symbol');
			const scaledSymbols = scaled.layers.filter((l) => l.type === 'symbol');
			expect(scaledSymbols).toHaveLength(baselineSymbols.length);

			for (let i = 0; i < baselineSymbols.length; i++) {
				const before = (baselineSymbols[i].layout as Record<string, unknown>)?.['text-size'];
				const after = (scaledSymbols[i].layout as Record<string, unknown>)?.['text-size'];
				if (before == null) {
					expect(after).toBe(before);
					continue;
				}
				if (typeof before === 'number') {
					expect(after).toBe(before * 2);
					continue;
				}
				const beforeStops = (before as { stops: [number, number][] }).stops;
				const afterStops = (after as { stops: [number, number][] }).stops;
				expect(afterStops).toHaveLength(beforeStops.length);
				for (let j = 0; j < beforeStops.length; j++) {
					expect(afterStops[j][0]).toBe(beforeStops[j][0]); // zoom unchanged
					expect(afterStops[j][1]).toBe(beforeStops[j][1] * 2); // value doubled
				}
			}
		});

		it('should leave icon-size unchanged when iconScale is 1', () => {
			const colorful = new Colorful();
			const baseline = colorful.build();
			const scaled = colorful.build({ iconScale: 1 });

			const baselineSizes = baseline.layers
				.filter((l) => l.type === 'symbol')
				.map((l) => (l.layout as Record<string, unknown>)?.['icon-size']);
			const scaledSizes = scaled.layers
				.filter((l) => l.type === 'symbol')
				.map((l) => (l.layout as Record<string, unknown>)?.['icon-size']);

			expect(scaledSizes).toStrictEqual(baselineSizes);
		});

		it('should scale icon-size on symbol layers when iconScale is set', () => {
			const colorful = new Colorful();
			const baseline = colorful.build();
			const scaled = colorful.build({ iconScale: 2 });

			const iconLayers = baseline.layers.filter(
				(l) => l.type === 'symbol' && (l.layout as Record<string, unknown>)?.['icon-image'] != null
			);
			expect(iconLayers.length).toBeGreaterThan(0);

			for (const beforeLayer of iconLayers) {
				const afterLayer = scaled.layers.find((l) => l.id === beforeLayer.id);
				const before = (beforeLayer.layout as Record<string, unknown>)?.['icon-size'];
				const after = (afterLayer?.layout as Record<string, unknown>)?.['icon-size'];

				if (before == null) {
					// Implicit MapLibre default of 1, scaled to 2
					expect(after).toBe(2);
					continue;
				}
				if (typeof before === 'number') {
					expect(after).toBe(before * 2);
					continue;
				}
				const beforeStops = (before as { stops: [number, number][] }).stops;
				const afterStops = (after as { stops: [number, number][] }).stops;
				expect(afterStops).toHaveLength(beforeStops.length);
				for (let j = 0; j < beforeStops.length; j++) {
					expect(afterStops[j][0]).toBe(beforeStops[j][0]);
					expect(afterStops[j][1]).toBe(beforeStops[j][1] * 2);
				}
			}
		});

		it('should not touch icon-size on layers without icon-image when iconScale is set', () => {
			const colorful = new Colorful();
			const baseline = colorful.build();
			const scaled = colorful.build({ iconScale: 2 });

			const noIconSymbols = baseline.layers.filter(
				(l) => l.type === 'symbol' && (l.layout as Record<string, unknown>)?.['icon-image'] == null
			);
			expect(noIconSymbols.length).toBeGreaterThan(0);

			for (const beforeLayer of noIconSymbols) {
				const afterLayer = scaled.layers.find((l) => l.id === beforeLayer.id);
				const before = (beforeLayer.layout as Record<string, unknown>)?.['icon-size'];
				const after = (afterLayer?.layout as Record<string, unknown>)?.['icon-size'];
				expect(after).toStrictEqual(before);
			}
		});

		it('should not affect line-width when textScale is set', () => {
			const baseline = builder.build();
			const scaled = builder.build({ textScale: 2 });

			const baselineLines = baseline.layers.filter((l) => l.type === 'line');
			const scaledLines = scaled.layers.filter((l) => l.type === 'line');

			for (let i = 0; i < baselineLines.length; i++) {
				const before = (baselineLines[i].paint as Record<string, unknown>)?.['line-width'];
				const after = (scaledLines[i].paint as Record<string, unknown>)?.['line-width'];
				expect(after).toStrictEqual(before);
			}
		});
	});
});

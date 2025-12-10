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
		this.transformDefaultColors(color => color.invert());
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
			bounds: [
				-180,
				-85.0511287798066,
				180,
				85.0511287798066
			],
			colors: {
				agriculture: "#F0E7D1",
				boundary: "#A6A6C8",
				building: "#F2EAE2",
				buildingbg: "#DFDBD7",
				burial: "#DDDBCA",
				commercial: "#F7DEED40",
				construction: "#A9A9A9",
				cycle: "#EFF9FF",
				danger: "#FF0000",
				disputed: "#BEBCCF",
				education: "#FFFF80",
				foot: "#FBEBFF",
				glacier: "#FFFFFF",
				grass: "#D8E8C8",
				hospital: "#FF6666",
				industrial: "#FFF4C255",
				label: "#333344",
				labelHalo: "#FFFFFFCC",
				land: "#F9F4EE",
				leisure: "#E7EDDE",
				motorway: "#FFCC88",
				motorwaybg: "#E9AC77",
				park: "#D9D9A5",
				parking: "#EBE8E6",
				poi: "#555555",
				prison: "#FDF2FC",
				rail: "#B1BBC4",
				residential: "#EAE6E133",
				rock: "#E0E4E5",
				sand: "#FAFAED",
				shield: "#FFFFFF",
				street: "#FFFFFF",
				streetbg: "#CFCDCA",
				subway: "#A6B8C7",
				symbol: "#66626A",
				trunk: "#FFEEAA",
				trunkbg: "#E9AC77",
				waste: "#DBD6BD",
				water: "#BEDDF3",
				wetland: "#D3E6DB",
				wood: "#66AA44",
			},
			fonts: { regular: 'Arial', bold: 'Courier' },
			glyphs: '/assets/glyphs/{fontstack}/{range}.pbf',
			hideLabels: false,
			language: "",
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
	});
});

/* eslint-disable @typescript-eslint/naming-convention */
import Color from 'color';
import type { StyleRules, StyleRulesOptions } from './style_builder.js';
import StyleBuilder from './style_builder.js';
import type { Style, VectorSource } from 'mapbox-gl';

// Mock class for abstract class StyleBuilder
class MockStyleBuilder extends StyleBuilder {
	public readonly name = 'mock';

	public fonts = { regular: 'Arial' };

	public colors = { primary: '#FF8800' };

	public negateColors(): void {
		this.resetColors((color) => color.negate());
	}

	protected getStyleRules(opt: StyleRulesOptions): StyleRules {
		for (const color of Object.values(opt.colors)) if (!(color instanceof Color)) throw Error();
		for (const font of Object.values(opt.fonts)) if (typeof font !== 'string') throw Error();

		return {
			'water-area': {
				textColor: opt.colors.primary,
				textSize: 12,
				textFont: [opt.fonts.Arial],
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

	it('should reset colors correctly', () => {
		const initialColor: string = builder.colors.primary;
		builder.negateColors();
		expect(builder.colors.primary).not.toBe(initialColor);
		expect(builder.colors.primary).toBe(Color(initialColor).negate().hexa());
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

		it('should convert color strings to Color instances', () => {
			builder.build();
			const colors = Object.values(builder.colors);
			expect(colors.every((color: unknown) => typeof color === 'string')).toBe(true);
		});

		it('should resolve urls correctly', () => {
			builder.baseUrl = 'https://my.base.url/';
			const style: Style = builder.build();
			expect(style.glyphs).toBe('https://my.base.url/assets/fonts/{fontstack}/{range}.pbf');
			expect(style.sprite).toBe('https://my.base.url/assets/sprites/sprites');

			const source = style.sources['versatiles-shortbread'] as VectorSource;
			expect(source).toHaveProperty('tiles');
			if (!source.tiles) return;
			expect(source.tiles[0]).toBe('https://my.base.url/tiles/osm/{z}/{x}/{y}');
		});
	});
});

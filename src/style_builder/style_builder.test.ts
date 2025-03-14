
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
			baseUrl: '',
			bounds: [
				-180, 
				-85.0511287798066, 
				180, 
				85.0511287798066
			],
			colors: expect.any(Object),
			fonts: { regular: 'Arial', bold: 'Courier' },
			glyphs: '',
			hideLabels: false,
			language: undefined,
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
			sprite: '',
			tiles: [],
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

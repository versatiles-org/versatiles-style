/* eslint-disable @typescript-eslint/naming-convention */
import Color from 'color';
import type { MaplibreStyle, StyleRules, StyleRulesOptions } from './types';
import StyleBuilder from './build_style';

// Mock class for abstract class StyleBuilder
class MockStyleBuilder extends StyleBuilder<MockStyleBuilder> {
	public readonly name = 'mock';

	public defaultFonts = { regular: 'Arial' };

	public defaultColors = { primary: '#FF8800' };

	public negateColors(): void {
		this.transformDefaultColors(color => color.negate());
	}

	protected getStyleRules(opt: StyleRulesOptions<MockStyleBuilder>): StyleRules {
		for (const color of Object.values(opt.colors)) if (!(color instanceof Color)) throw Error();
		for (const font of Object.values(opt.fonts)) if (typeof font !== 'string') throw Error();

		return {
			'water-area': {
				textColor: opt.colors.primary,
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
		const initialColor: string = builder.defaultColors.primary;
		builder.negateColors();
		expect(builder.defaultColors.primary).not.toBe(initialColor);
		expect(builder.defaultColors.primary).toBe(Color(initialColor).negate().hexa());
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
			const style: MaplibreStyle = builder.build({ baseUrl: 'https://my.base.url/' });
			expect(style.glyphs).toBe('https://my.base.url/assets/fonts/{fontstack}/{range}.pbf');
			expect(style.sprite).toBe('https://my.base.url/assets/sprites/sprites');

			const source = style.sources['versatiles-shortbread'];
			expect(source).toHaveProperty('tiles');
			expect(source.tiles[0]).toBe('https://my.base.url/tiles/osm/{z}/{x}/{y}');
		});
	});
});

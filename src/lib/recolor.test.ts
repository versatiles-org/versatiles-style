import { getDefaultRecolorFlags, recolor } from './recolor.js';
import type Color from 'color';
import type { StyleRules, StyleRulesOptions,  StylemakerColors } from './types.js';
import StyleBuilder from './style_builder.js';



describe('colorTransformer', () => {
	describe('getDefaultRecolorFlags', () => {
		it('should return the default color transformer flags', () => {
			const defaultFlags = getDefaultRecolorFlags();
			expect(defaultFlags).toEqual({
				invert: false,
				rotate: 0,
				saturate: 0,
				gamma: 1,
				contrast: 1,
				brightness: 0,
				tint: 0,
				tintColor: '#FF0000',
			});
		});
	});

	describe('recolor', () => {
		it('should not alter the colors if no flags are provided', () => {
			const colors = getDefaultColors();
			recolor(colors, {});
			expect(colors).toEqual(getDefaultColors());
		});

		describe('invert', () => {
			it('should invert colors when invert flag is true', () => {
				const colors = getDefaultColors();
				recolor(colors, { invert: true });
				expect(colors2string(colors)).toBe('0055AA00,FF005555,AAFF00AA,55AAFFFF');
			});
		});

		describe('rotate', () => {
			it('should rotate colors 120°', () => {
				const colors = getDefaultColors();
				recolor(colors, { rotate: 120 });
				expect(colors2string(colors)).toBe('55FFAA00,AA00FF55,FF5500AA,00AA55FF');
			});

			it('should rotate colors 180°', () => {
				const colors = getDefaultColors();
				recolor(colors, { rotate: 180 });
				expect(colors2string(colors)).toBe('55AAFF00,FF005555,AAFF00AA,0055AAFF');
			});

			it('should rotate colors 240°', () => {
				const colors = getDefaultColors();
				recolor(colors, { rotate: 240 });
				expect(colors2string(colors)).toBe('AA55FF00,FFAA0055,00FF55AA,5500AAFF');
			});
		});

		describe('saturation', () => {
			it('should remove any saturation', () => {
				const colors = getDefaultColors();
				recolor(colors, { saturate: -1.0 });
				expect(colors2string(colors)).toBe('AAAAAA00,80808055,808080AA,555555FF');
			});

			it('should decrease saturation', () => {
				const colors = getDefaultColors();
				recolor(colors, { saturate: -0.5 });
				expect(colors2string(colors)).toBe('D4AA7F00,40BF9555,6A40BFAA,7F552AFF');
			});

			it('should increase saturation', () => {
				const colors = getDefaultColors();
				recolor(colors, { saturate: 0.5 });
				expect(colors2string(colors)).toBe('FFAA2A00,00FFBF55,4000FFAA,D45500FF');
			});

			it('should maximize saturation', () => {
				const colors = getDefaultColors();
				recolor(colors, { saturate: 1.0 });
				expect(colors2string(colors)).toBe('FFAA0000,00FFD455,2B00FFAA,FF5500FF');
			});
		});

		describe('gamma', () => {
			it('should decrease gamma', () => {
				const colors = getDefaultColors();
				recolor(colors, { gamma: 0.5 });
				expect(colors2string(colors)).toBe('FFD09300,00FFD055,9300FFAA,D09300FF');
			});

			it('should increase gamma', () => {
				const colors = getDefaultColors();
				recolor(colors, { gamma: 2 });
				expect(colors2string(colors)).toBe('FF711C00,00FF7155,1C00FFAA,711C00FF');
			});
		});

		describe('contrast', () => {
			it('should remove any contrast', () => {
				const colors = getDefaultColors();
				recolor(colors, { contrast: 0 });
				expect(colors2string(colors)).toBe('80808000,80808055,808080AA,808080FF');
			});

			it('should decrease contrast', () => {
				const colors = getDefaultColors();
				recolor(colors, { contrast: 0.5 });
				expect(colors2string(colors)).toBe('BF956A00,40BF9555,6A40BFAA,956A40FF');
			});

			it('should increase contrast', () => {
				const colors = getDefaultColors();
				recolor(colors, { contrast: 2 });
				expect(colors2string(colors)).toBe('FFD52B00,00FFD555,2B00FFAA,D52B00FF');
			});

			it('should maximize contrast', () => {
				const colors = getDefaultColors();
				recolor(colors, { contrast: Infinity });
				expect(colors2string(colors)).toBe('FFFF0000,00FFFF55,0000FFAA,FF0000FF');
			});
		});

		describe('contrast', () => {
			it('should remove any brightness', () => {
				const colors = getDefaultColors();
				recolor(colors, { brightness: -1 });
				expect(colors2string(colors)).toBe('00000000,00000055,000000AA,000000FF');
			});

			it('should decrease brightness', () => {
				const colors = getDefaultColors();
				recolor(colors, { brightness: -0.5 });
				expect(colors2string(colors)).toBe('80552B00,00805555,2B0080AA,552B00FF');
			});

			it('should increase brightness', () => {
				const colors = getDefaultColors();
				recolor(colors, { brightness: 0.5 });
				expect(colors2string(colors)).toBe('FFD5AA00,80FFD555,AA80FFAA,D5AA80FF');
			});

			it('should maximize brightness', () => {
				const colors = getDefaultColors();
				recolor(colors, { brightness: 1 });
				expect(colors2string(colors)).toBe('FFFFFF00,FFFFFF55,FFFFFFAA,FFFFFFFF');
			});
		});

		describe('tint', () => {
			it('should not tint at all', () => {
				const colors = getDefaultColors();
				recolor(colors, { tint: 0, tintColor: '#F00' });
				expect(colors2string(colors)).toBe('FFAA5500,00FFAA55,5500FFAA,AA5500FF');
			});

			it('should tint a little bit red', () => {
				const colors = getDefaultColors();
				recolor(colors, { tint: 0.5, tintColor: '#F00' });
				expect(colors2string(colors)).toBe('FF552B00,80805555,AA0080AA,D52B00FF');
			});

			it('should tint a little bit yellow', () => {
				const colors = getDefaultColors();
				recolor(colors, { tint: 0.5, tintColor: '#FF0' });
				expect(colors2string(colors)).toBe('FFD52B00,80FF5555,AA8080AA,D5AA00FF');
			});

			it('should tint a little bit green', () => {
				const colors = getDefaultColors();
				recolor(colors, { tint: 0.5, tintColor: '#0F0' });
				expect(colors2string(colors)).toBe('80D52B00,00FF5555,2B8080AA,55AA00FF');
			});

			it('should tint a little bit blue', () => {
				const colors = getDefaultColors();
				recolor(colors, { tint: 0.5, tintColor: '#00F' });
				expect(colors2string(colors)).toBe('8055AA00,0080D555,2B00FFAA,552B80FF');
			});

			it('should tint a strongly orange', () => {
				const colors = getDefaultColors();
				recolor(colors, { tint: 0.5, tintColor: '#F80' });
				expect(colors2string(colors)).toBe('FF992B00,80C45555,AA4480AA,D56F00FF');
			});

			it('should tint a strongly blue', () => {
				const colors = getDefaultColors();
				recolor(colors, { tint: 0.5, tintColor: '#00F' });
				expect(colors2string(colors)).toBe('8055AA00,0080D555,2B00FFAA,552B80FF');
			});
		});
	});
});

function colors2string(colors: StylemakerColors<TestStyle>): string {
	const colorArray: Color[] = [
		colors.c0,
		colors.c1,
		colors.c2,
		colors.c3,
	];
	return colorArray.map(c => c.hexa().slice(1)).join(',');
}

export default class TestStyle extends StyleBuilder<TestStyle> {
	public readonly name: string = 'teststyle';

	public defaultFonts = {};

	public defaultColors = {
		c0: '#FFAA5500',
		c1: '#00FFAA55',
		c2: '#5500FFAA',
		c3: '#AA5500FF',
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected getStyleRules(_options: StyleRulesOptions<TestStyle>): StyleRules {
		throw new Error('Method not implemented.');
	}
}

function getDefaultColors(): StylemakerColors<TestStyle> {
	const style = new TestStyle();
	return style.colors;
}

import Color from '../color/index.js';
import { CachedRecolor, getDefaultRecolorFlags, recolorArray, recolorObject } from './recolor.js';


describe('recolor', () => {
	describe('getDefaultRecolorFlags', () => {
		it('should return the default color transformer flags', () => {
			const defaultFlags = getDefaultRecolorFlags();
			expect(defaultFlags).toEqual({
				invertBrightness: false,
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

	it('should not alter the colors if no flags are provided', () => {
		const colors = getTestColors();
		recolorArray(colors, {});
		expect(colors).toEqual(getTestColors());
	});

	describe('invertBrightness', () => {
		it('should invert brightness when invert flag is true', () => {
			const colors = getTestColors();
			recolorArray(colors, { invertBrightness: true });
			expect(colors2string(colors)).toBe('AA550000,00FFAA55,5500FFAA,FFAA55,AA7755');
		});
	});

	describe('rotate', () => {
		it('should rotate colors 120°', () => {
			const colors = getTestColors();
			recolorArray(colors, { rotate: 120 });
			expect(colors2string(colors)).toBe('55FFAA00,AA00FF55,FF5500AA,00AA55,55AA77');
		});

		it('should rotate colors 180°', () => {
			const colors = getTestColors();
			recolorArray(colors, { rotate: 180 });
			expect(colors2string(colors)).toBe('55AAFF00,FF005555,AAFF00AA,0055AA,5588AA');
		});

		it('should rotate colors 240°', () => {
			const colors = getTestColors();
			recolorArray(colors, { rotate: 240 });
			expect(colors2string(colors)).toBe('AA55FF00,FFAA0055,00FF55AA,5500AA,7755AA');
		});
	});

	describe('saturation', () => {
		it('should remove any saturation', () => {
			const colors = getTestColors();
			recolorArray(colors, { saturate: -1.0 });
			expect(colors2string(colors)).toBe('AAAAAA00,80808055,808080AA,555555,808080');
		});

		it('should decrease saturation', () => {
			const colors = getTestColors();
			recolorArray(colors, { saturate: -0.5 });
			expect(colors2string(colors)).toBe('D4AA7F00,40BF9555,6A40BFAA,7F552A,957B6A');
		});

		it('should increase saturation', () => {
			const colors = getTestColors();
			recolorArray(colors, { saturate: 0.5 });
			expect(colors2string(colors)).toBe('FFAA5500,00FFAA55,5500FFAA,AA5500,D46F2B');
		});

		it('should maximize saturation', () => {
			const colors = getTestColors();
			recolorArray(colors, { saturate: 1.0 });
			expect(colors2string(colors)).toBe('FFAA5500,00FFAA55,5500FFAA,AA5500,FF6600');
		});
	});

	describe('gamma', () => {
		it('should decrease gamma', () => {
			const colors = getTestColors();
			recolorArray(colors, { gamma: 0.5 });
			expect(colors2string(colors)).toBe('FFD09300,00FFD055,9300FFAA,D09300,D0AE93');
		});

		it('should increase gamma', () => {
			const colors = getTestColors();
			recolorArray(colors, { gamma: 2 });
			expect(colors2string(colors)).toBe('FF711C00,00FF7155,1C00FFAA,711C00,71381C');
		});
	});

	describe('contrast', () => {
		it('should remove any contrast', () => {
			const colors = getTestColors();
			recolorArray(colors, { contrast: 0 });
			expect(colors2string(colors)).toBe('80808000,80808055,808080AA,808080,808080');
		});

		it('should decrease contrast', () => {
			const colors = getTestColors();
			recolorArray(colors, { contrast: 0.5 });
			expect(colors2string(colors)).toBe('BF956A00,40BF9555,6A40BFAA,956A40,957B6A');
		});

		it('should increase contrast', () => {
			const colors = getTestColors();
			recolorArray(colors, { contrast: 2 });
			expect(colors2string(colors)).toBe('FFD52B00,00FFD555,2B00FFAA,D52B00,D56F2B');
		});

		it('should maximize contrast', () => {
			const colors = getTestColors();
			recolorArray(colors, { contrast: Infinity });
			expect(colors2string(colors)).toBe('FFFF0000,00FFFF55,0000FFAA,FF0000,FF0000');
		});
	})

	describe('brightness', () => {
		it('should remove any brightness', () => {
			const colors = getTestColors();
			recolorArray(colors, { brightness: -1 });
			expect(colors2string(colors)).toBe('00000000,00000055,000000AA,000000,000000');
		});

		it('should decrease brightness', () => {
			const colors = getTestColors();
			recolorArray(colors, { brightness: -0.5 });
			expect(colors2string(colors)).toBe('80552B00,00805555,2B0080AA,552B00,553C2B');
		});

		it('should increase brightness', () => {
			const colors = getTestColors();
			recolorArray(colors, { brightness: 0.5 });
			expect(colors2string(colors)).toBe('FFD5AA00,80FFD555,AA80FFAA,D5AA80,D5BBAA');
		});

		it('should maximize brightness', () => {
			const colors = getTestColors();
			recolorArray(colors, { brightness: 1 });
			expect(colors2string(colors)).toBe('FFFFFF00,FFFFFF55,FFFFFFAA,FFFFFF,FFFFFF');
		});
	});

	describe('tint', () => {
		it('should not tint at all', () => {
			const colors = getTestColors();
			recolorArray(colors, { tint: 0, tintColor: '#F00' });
			expect(colors2string(colors)).toBe('FFAA5500,00FFAA55,5500FFAA,AA5500,AA7755');
		});

		it('should tint a little bit red', () => {
			const colors = getTestColors();
			recolorArray(colors, { tint: 0.5, tintColor: '#F00' });
			expect(colors2string(colors)).toBe('FF805500,80805555,AA0080AA,AA2B00,AA6655');
		});

		it('should tint a little bit yellow', () => {
			const colors = getTestColors();
			recolorArray(colors, { tint: 0.2, tintColor: '#FF0' });
			expect(colors2string(colors)).toBe('FFBB5500,33FF8855,7733CCAA,AA6600,AA8155');
		});

		it('should tint a little bit green', () => {
			const colors = getTestColors();
			recolorArray(colors, { tint: 0.2, tintColor: '#0F0' });
			expect(colors2string(colors)).toBe('DDBB5500,00FF8855,4433CCAA,886600,998155');
		});

		it('should tint a little bit blue', () => {
			const colors = getTestColors();
			recolorArray(colors, { tint: 0.2, tintColor: '#00F' });
			expect(colors2string(colors)).toBe('DD997700,00CCBB55,4400FFAA,884422,997066');
		});

		it('should tint strongly orange', () => {
			const colors = getTestColors();
			recolorArray(colors, { tint: 0.8, tintColor: '#F80' });
			expect(colors2string(colors)).toBe('FFAF5500,CCA02255,DD6D33AA,AA5A00,AA8055');
		});

		it('should tint a strongly blue', () => {
			const colors = getTestColors();
			recolorArray(colors, { tint: 0.8, tintColor: '#00F' });
			expect(colors2string(colors)).toBe('7766DD00,0033EE55,1100FFAA,221188,665C99');
		});
	});
});

describe('recolorObject', () => {
	it('should recolor an object of colors', () => {
		const colors = {
			color1: Color.parse('#FA50'),
			color2: Color.parse('#0FA5'),
			color3: Color.parse('#50FA'),
		};
		recolorObject(colors, { rotate: 120 });
		expect(colors.color1.asHex()).toBe('#55FFAA00');
		expect(colors.color2.asHex()).toBe('#AA00FF55');
		expect(colors.color3.asHex()).toBe('#FF5500AA');
	});

	it('should not alter colors if options are invalid', () => {
		const colors = {
			color1: Color.parse('#FA50'),
			color2: Color.parse('#0FA5'),
			color3: Color.parse('#50FA'),
		};
		const original = { ...colors };
		recolorObject(colors, {});
		expect(colors).toEqual(original);
	});
});

describe('recolorArray', () => {
	it('should recolor an array of colors with valid options', () => {
		const colors = getTestColors();
		recolorArray(colors, { rotate: 120 });
		expect(colors.map((c) => c.asHex())).toEqual([
			'#55FFAA00',
			'#AA00FF55',
			'#FF5500AA',
			'#00AA55',
			'#55AA77',
		]);
	});

	it('should not alter the array if options are invalid', () => {
		const colors = getTestColors();
		const original = [...colors];
		recolorArray(colors, {});
		expect(colors).toEqual(original);
	});

	it('should handle multiple transformations on the same array', () => {
		const colors = getTestColors();
		recolorArray(colors, { saturate: 0.5 });
		expect(colors.map((c) => c.asHex())).toEqual([
			'#FFAA5500',
			'#00FFAA55',
			'#5500FFAA',
			'#AA5500',
			'#D46F2B',
		]);

		recolorArray(colors, { brightness: 0.5 });
		expect(colors.map((c) => c.asHex())).toEqual([
			'#FFD5AA00',
			'#80FFD555',
			'#AA80FFAA',
			'#D5AA80',
			'#EAB795',
		]);
	});
});

describe('CachedRecolor', () => {
	it('should apply recolor transformations and cache the results', () => {
		const cachedRecolor = new CachedRecolor({ rotate: 120 });
		const color = Color.parse('#FA50');
		const recolored = cachedRecolor.do(color);
		expect(recolored.asHex()).toBe('#55FFAA00');

		// Verify cached result
		const cachedResult = cachedRecolor.do(color);
		expect(cachedResult).toBe(recolored); // Cached object should be the same instance
	});

	it('should skip recoloring if options are invalid', () => {
		const cachedRecolor = new CachedRecolor({});
		const color = Color.parse('#FA50');
		const recolored = cachedRecolor.do(color);
		expect(recolored).toBe(color); // No changes applied
	});

	it('should handle multiple recoloring operations', () => {
		const cachedRecolor = new CachedRecolor({ saturate: 0.5 });
		const colors = getTestColors();

		const recoloredColors = colors.map((color) => cachedRecolor.do(color));
		expect(recoloredColors.map((c) => c.asHex())).toEqual([
			'#FFAA5500',
			'#00FFAA55',
			'#5500FFAA',
			'#AA5500',
			'#D46F2B',
		]);
	});
});

function getTestColors(): Color[] {
	return [
		Color.parse('#FA50'),
		Color.parse('#0FA5'),
		Color.parse('#50FA'),
		Color.parse('#A50F'),
		Color.parse('#A75F'),
	];
}

function colors2string(colors: Color[]): string {
	return colors.map(c => c.asHex().slice(1)).join(',');
}

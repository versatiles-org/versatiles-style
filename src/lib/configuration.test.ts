import { getDefaultRecolorFlags } from './recolor.js';
import { Configuration } from './configuration.js';
import type { StyleBuilderOptions } from './types.js';

describe('Configuration', () => {

	it('should create a default configuration when no arguments are passed', () => {
		const config = new Configuration();
		expect(config.baseUrl).toBe('https://tiles.versatiles.org');
		expect(config.glyphsUrl).toBe('/assets/fonts/{fontstack}/{range}.pbf');
	});

	it('should override default configuration when arguments are passed', () => {
		const customConfig: StyleBuilderOptions = {
			baseUrl: 'https://custom.url',
			glyphsUrl: '/custom/fonts',
			hideLabels: true,
			languageSuffix: '_en',
			spriteUrl: '/custom/sprites/sprites',
			tilesUrls: ['/tiles/custom/{z}/{x}/{y}'],
			colors: {},
			fonts: {},
			recolor: getDefaultRecolorFlags(),
		};
		const config = new Configuration(customConfig);
		expect(config.baseUrl).toBe(customConfig.baseUrl);
		expect(config.glyphsUrl).toBe(customConfig.glyphsUrl);
	});

	it('should correctly return the color and font options', () => {
		const config = new Configuration();
		config.setColors({ primary: '#FF0000' });
		config.setFonts({ base: 'Arial' });

		const { colors, fonts } = config;

		expect(colors.primary).toBe('#FF0000');
		expect(fonts.base).toBe('Arial');
	});
});


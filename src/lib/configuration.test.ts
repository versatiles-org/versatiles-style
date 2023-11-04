import { getDefaultColorTransformer } from './color_transformer.js';
import { Configuration, StylemakerConfiguration } from './configuration.js';
import Color from 'color';

describe('Configuration', () => {
	let defaultConfig;

	beforeEach(() => {
		// Set up any default configurations as necessary before each test
		defaultConfig = {
			// ...your default configuration
		};
	});

	it('should create a default configuration when no arguments are passed', () => {
		const config = new Configuration();
		expect(config.baseUrl).toBe('https://tiles.versatiles.org');
		expect(config.glyphsUrl).toBe('/assets/fonts/{fontstack}/{range}.pbf');
		// Add more assertions as needed for the rest of the default configuration
	});

	it('should override default configuration when arguments are passed', () => {
		const customConfig: StylemakerConfiguration = {
			baseUrl: 'https://custom.url',
			glyphsUrl: '/custom/fonts',
			hideLabels: true,
			languageSuffix: '_en',
			spriteUrl: '/custom/sprites/sprites',
			tilesUrls: ['/tiles/custom/{z}/{x}/{y}'],
			colors: {},
			fonts: {},
			colorTransformer: getDefaultColorTransformer(),
		};
		const config = new Configuration(customConfig);
		expect(config.baseUrl).toBe(customConfig.baseUrl);
		expect(config.glyphsUrl).toBe(customConfig.glyphsUrl);
		// Add more assertions for overridden properties
	});

	it('should correctly return the color and font options', () => {
		const config = new Configuration();
		config.setColors({ primary: '#FF0000' });
		config.setFonts({ base: 'Arial' });

		const colors = config.colors;
		const fonts = config.fonts;

		expect(colors.primary).toBeInstanceOf(Color);
		expect(colors.primary.hex()).toBe('#FF0000');
		expect(fonts.base).toBe('Arial');
	});

	it('should build a new configuration with options', () => {
		const config = new Configuration();
		const newOptions = {
			// ... some new options
		};
		const newConfig = config.buildNew(newOptions);

		// Assert that newConfig has the properties from newOptions
		// and retains the defaults for properties not in newOptions
	});

	it('should correctly return options', () => {
		const config = new Configuration();
		const options = config.getOptions();

		// Assert that options are returned correctly
	});

	// Additional tests to cover more cases, exceptions, and other behaviors...
});


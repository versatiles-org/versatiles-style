import { Colorful } from './index.js';
import * as builderClasses from './index.js';
import StyleBuilder from './lib/style_builder.js';

describe('Style Builders', () => {
	const styleNames = [
		'Colorful',
		'Graybeard',
		'Neutrino',
	];

	it(`should have the correct ${styleNames.length} styles`, () => {
		const keys1 = Array.from(Object.keys(builderClasses)).sort();
		const keys2 = styleNames.sort();
		expect(keys1).toEqual(keys2);
	});

	Object.entries(builderClasses).forEach(([styleName, builderClass]) => {
		it(`should create and test an instance of ${styleName}`, () => {
			const builder: StyleBuilder = new builderClass();
			expect(builder).toBeInstanceOf(StyleBuilder);
			expect(typeof builder.name).toBe('string');

			builder.baseUrl = 'https://example.org';
			const style = builder.build();
			expect(JSON.stringify(style).length).toBeGreaterThan(50000);

			expect(style.name).toBe('versatiles-' + styleName.toLowerCase());
			expect(style.glyphs).toBe('https://example.org/assets/fonts/{fontstack}/{range}.pbf');
			expect(style.sprite).toBe('https://example.org/assets/sprites/sprites');
			expect(Object.keys(style.sources).join(',')).toBe('versatiles-shortbread');

			// @ts-expect-error: Still Overwhelmed
			expect(style.sources['versatiles-shortbread'].tiles).toEqual(['https://example.org/tiles/osm/{z}/{x}/{y}']);
		});
	});
});

describe('Colorful', () => {
	const colorful = new Colorful();
	colorful.baseUrl = 'https://dev.null';
	colorful.colors.commercial = '#f00';
	const style = colorful.build();
	expect(style.glyphs).toBe('https://dev.null/assets/fonts/{fontstack}/{range}.pbf');
});

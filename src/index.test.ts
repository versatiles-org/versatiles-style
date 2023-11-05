import * as styleBuilders from './index.js';
import { StyleBuilder } from './lib/style_builder.js';

describe('Style Builders', () => {
	const styleNames = [
		'colorful',
		'graybeard',
		'neutrino',
	];

	it(`should have the correct ${styleNames.length} styles`, () => {
		const keys1 = Array.from(Object.keys(styleBuilders)).sort();
		const keys2 = styleNames.sort();
		expect(keys1).toEqual(keys2);
	});

	Object.entries(styleBuilders).forEach(([styleName, styleBuilder]) => {
		it(`should create and test an instance of ${styleName}`, () => {
			expect(styleBuilder).toBeInstanceOf(StyleBuilder);
			expect(typeof styleBuilder.name).toBe('string');
			expect(typeof styleBuilder.defaultOptions).toBe('object');

			const style = styleBuilder.build({ baseUrl: 'https://example.org' });
			expect(JSON.stringify(style).length).toBeGreaterThan(50000);

			expect(style.name).toBe('versatiles-' + styleName);
			expect(style.glyphs).toBe('https://example.org/assets/fonts/{fontstack}/{range}.pbf');
			expect(style.sprite).toBe('https://example.org/assets/sprites/sprites');
			expect(Object.keys(style.sources).join(',')).toBe('versatiles-shortbread');

			// @ts-expect-error: Still Overwhelmed
			expect(style.sources['versatiles-shortbread'].tiles).toEqual(['https://example.org/tiles/osm/{z}/{x}/{y}']);
		});
	});
});

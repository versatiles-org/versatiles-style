import * as styleBuilders from './index.js';
import { StyleBuilder } from './lib/style_builder.js';

describe('Style Builders', () => {
	let styleNames = ['colorful', 'graybeard', 'neutrino'];

	for (const styleName of styleNames) {
		it(`should create and test an instance of ${styleName}`, () => {
			// @ts-ignore
			const styleBuilder = styleBuilders[styleName] as StyleBuilder;
			expect(styleBuilder).toBeInstanceOf(StyleBuilder);
			expect(typeof styleBuilder.name).toBe('string');
			expect(typeof styleBuilder.defaultOptions).toBe('object');

			const style = styleBuilder.build({ baseUrl: 'https://example.org' });
			expect(JSON.stringify(style).length).toBeGreaterThan(50000);

			expect(style.name).toBe('versatiles-' + styleName);
			expect(style.glyphs).toBe('https://example.org/assets/fonts/{fontstack}/{range}.pbf');
			expect(style.sprite).toBe('https://example.org/assets/sprites/sprites');
			expect(Object.keys(style.sources).join(',')).toBe('versatiles-shortbread');
			// @ts-ignore
			expect(style.sources['versatiles-shortbread'].tiles).toEqual(['https://example.org/tiles/osm/{z}/{x}/{y}']);
		});
	}
});

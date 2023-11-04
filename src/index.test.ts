import * as styleBuilders from './index.js';
import { StyleBuilder } from './lib/style_builder.js';

describe('Style Builders', () => {
	let styleNames = ['Colorful', 'Graybeard', 'Neutrino'];

	for (const styleName of styleNames) {
		it(`should create and test an instance of ${styleName}`, () => {
			// @ts-ignore
			const styleBuilder = styleBuilders[styleName] as StyleBuilder;
			expect(styleBuilder).toBeDefined();
			expect(styleBuilder).toBeInstanceOf(StyleBuilder);
			expect(typeof styleBuilder.name).toBe('string');
			expect(typeof styleBuilder.defaultOptions).toBe('object');
			const style = styleBuilder.build();
			expect(typeof style).toBe('object');
			expect(JSON.stringify(style).length).toBeGreaterThan(50000);
		});
	}
});

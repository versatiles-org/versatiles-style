import type { ShortbreadProperty } from './properties.js';
import propertyLookup from './properties.js';

describe('propertyLookup', () => {
	it('should be a Map', () => {
		expect(propertyLookup).toBeInstanceOf(Map);
	});

	it('should contain keys for each type and property', () => {
		const expectedTypes = ['background', 'fill', 'line', 'symbol'];

		expectedTypes.forEach(type => {
			propertyLookup.forEach((value, key) => {
				if (key.startsWith(type)) {
					expect(key).toMatch(new RegExp(`^${type}\/`));
				}
			});
		});
	});

	it('should contain the correct properties for each type', () => {
		const expectedProps = ['filter', 'maxzoom', 'minzoom', 'visibility'];

		expectedProps.forEach(prop => {
			propertyLookup.forEach((value, key) => {
				if (key.endsWith(prop)) {
					expect(value.some((p: ShortbreadProperty) => p.key === prop)).toBeTruthy();
				}
			});
		});
	});

	it('should store properties with the correct structure', () => {
		propertyLookup.forEach(properties => {
			properties.forEach((prop: ShortbreadProperty) => {
				expect(prop).toHaveProperty('key');
				expect(prop).toHaveProperty('parent');
				expect(prop).toHaveProperty('valueType');
				expect(['layer', 'layout', 'paint']).toContain(prop.parent);
			});
		});
	});
});


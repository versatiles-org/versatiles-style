import { describe, expect, it } from 'vitest';

describe('nodejs', () => {
	it('should return a style object', async () => {
		const { styles } = await import('../dist/index.js');

		expect(styles).toBeDefined();
		expect(styles.colorful).toBeDefined();
		expect(styles.colorful()).toStrictEqual({
			glyphs: 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf',
			layers: expect.any(Array),
			name: 'versatiles-colorful',
			metadata: { license: "https://creativecommons.org/publicdomain/zero/1.0/" },
			sources: expect.any(Object),
			sprite: expect.any(Array),
			version: 8,
		});
	})
})

describe('browser', () => {
	it('should return a style object', async () => {
		const { styles } = await import('../release/versatiles-style/versatiles-style.js');;

		expect(typeof styles).toBe('object');
		expect(typeof styles.colorful).toBe('function');
		expect(styles.colorful()).toStrictEqual({
			glyphs: 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf',
			layers: expect.any(Array),
			name: 'versatiles-colorful',
			metadata: { license: "https://creativecommons.org/publicdomain/zero/1.0/" },
			sources: expect.any(Object),
			sprite: expect.any(Array),
			version: 8,
		});
	})
})

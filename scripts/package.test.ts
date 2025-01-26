/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

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
		await import('../release/versatiles-style/versatiles-style.js');

		const { styles } = globalThis.VersaTilesStyle;

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

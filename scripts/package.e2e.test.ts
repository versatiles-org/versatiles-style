import { describe, expect, it } from 'vitest';

describe('nodejs', () => {
	it('should return a style object', async () => {
		const { osm } = await import('../dist/index.js');

		expect(osm).toBeDefined();
		const style = osm({ theme: 'colorful' });
		expect(style.version).toBe(8);
		expect(Array.isArray(style.layers)).toBe(true);
		expect(style.layers.length).toBeGreaterThan(0);
		expect(typeof style.sources).toBe('object');
		expect(style.glyphs).toContain('{fontstack}');
	});
});

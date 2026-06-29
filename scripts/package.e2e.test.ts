import { describe, expect, it } from 'vitest';

describe('nodejs', () => {
	it('should return a style object', async () => {
		const { osm } = await import('../dist/index.js');

		expect(osm).toBeDefined();
		// Inject a fetch so the default TileJSON source resolves offline/deterministically.
		const fetch = async () =>
			new Response(JSON.stringify({ tiles: ['{z}/{x}/{y}'], minzoom: 0, maxzoom: 14 }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		const style = await osm({ theme: 'colorful', urls: { fetch } });
		expect(style.version).toBe(8);
		expect(Array.isArray(style.layers)).toBe(true);
		expect(style.layers.length).toBeGreaterThan(0);
		expect(typeof style.sources).toBe('object');
		expect(style.glyphs).toContain('{fontstack}');
	});
});

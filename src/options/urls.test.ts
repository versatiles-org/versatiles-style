import { describe, expect, it } from 'vitest';
import {
	DEFAULT_BASE,
	resolveBase,
	resolveOsmUrls,
	resolveSatelliteUrls,
	convertSatelliteUrlsToOsmUrls,
} from './urls.js';

// Dedicated coverage for the URL resolver (previously only ~55%, exercised incidentally via osm()/
// satellite()). In a non-browser environment DEFAULT_BASE is the versatiles CDN.

describe('resolveBase', () => {
	it('falls back to DEFAULT_BASE (the versatiles CDN in node)', () => {
		expect(DEFAULT_BASE).toBe('https://tiles.versatiles.org');
		expect(resolveBase()).toBe(DEFAULT_BASE);
	});

	it('returns an explicit base verbatim', () => {
		expect(resolveBase('https://cdn.example')).toBe('https://cdn.example');
	});
});

describe('resolveOsmUrls', () => {
	it('resolves all defaults against DEFAULT_BASE', () => {
		expect(resolveOsmUrls()).toStrictEqual({
			osm: 'https://tiles.versatiles.org/tiles/osm/tiles.json',
			elevation: 'https://tiles.versatiles.org/tiles/elevation/tiles.json',
			glyphsPattern: 'https://tiles.versatiles.org/assets/glyphs/{fontstack}/{range}.pbf',
			sprite: [{ id: 'basics', url: 'https://tiles.versatiles.org/assets/sprites/basics/sprites' }],
			fetch: undefined,
		});
	});

	it('applies a custom base to every relative default', () => {
		const r = resolveOsmUrls({ base: 'https://x.io' });
		expect(r.osm).toBe('https://x.io/tiles/osm/tiles.json');
		expect(r.elevation).toBe('https://x.io/tiles/elevation/tiles.json');
		expect(r.glyphsPattern).toBe('https://x.io/assets/glyphs/{fontstack}/{range}.pbf');
		expect((r.sprite as { url: string }[])[0].url).toBe('https://x.io/assets/sprites/basics/sprites');
	});

	it('passes an absolute osm URL through unchanged (ignores base)', () => {
		const r = resolveOsmUrls({ base: 'https://x.io', osm: 'https://other/tiles.json' });
		expect(r.osm).toBe('https://other/tiles.json');
		// siblings still derive from base
		expect(r.elevation).toBe('https://x.io/tiles/elevation/tiles.json');
	});

	it('accepts a sprite string (used verbatim) and a custom glyphsPattern', () => {
		const r = resolveOsmUrls({ sprite: 'https://s/sprite', glyphsPattern: 'https://g/{fontstack}/{range}.pbf' });
		expect(r.sprite).toBe('https://s/sprite');
		expect(r.glyphsPattern).toBe('https://g/{fontstack}/{range}.pbf');
	});

	it('threads a custom fetch through untouched', () => {
		const fetch = (async () => new Response('{}')) as typeof globalThis.fetch;
		expect(resolveOsmUrls({ fetch }).fetch).toBe(fetch);
	});
});

describe('resolveSatelliteUrls', () => {
	it('adds a satellite URL on top of the OSM URL set', () => {
		const r = resolveSatelliteUrls();
		expect(r.satellite).toBe('https://tiles.versatiles.org/tiles/satellite/tiles.json');
		expect(r.osm).toBe('https://tiles.versatiles.org/tiles/osm/tiles.json');
		expect(Object.keys(r).sort()).toStrictEqual(['elevation', 'fetch', 'glyphsPattern', 'osm', 'satellite', 'sprite']);
	});

	it('resolves the satellite URL against a custom base', () => {
		expect(resolveSatelliteUrls({ base: 'https://cdn.example' }).satellite).toBe(
			'https://cdn.example/tiles/satellite/tiles.json'
		);
	});

	it('passes an explicit satellite URL through unchanged', () => {
		expect(resolveSatelliteUrls({ satellite: 'https://sat/tiles.json' }).satellite).toBe('https://sat/tiles.json');
	});
});

describe('convertSatelliteUrlsToOsmUrls', () => {
	it('returns undefined for undefined input', () => {
		expect(convertSatelliteUrlsToOsmUrls(undefined)).toBeUndefined();
	});

	it('carries over shared fields and drops the satellite-only field', () => {
		const out = convertSatelliteUrlsToOsmUrls({ base: 'https://x.io', osm: 'https://o', satellite: 'https://sat' });
		expect(out).toBeDefined();
		expect(out?.base).toBe('https://x.io');
		expect(out?.osm).toBe('https://o');
		expect(out).not.toHaveProperty('satellite');
	});

	it('preserves sprite and fetch', () => {
		const fetch = (async () => new Response('{}')) as typeof globalThis.fetch;
		const sprite = 'https://s/sprite';
		const out = convertSatelliteUrlsToOsmUrls({ sprite, fetch });
		expect(out?.sprite).toBe(sprite);
		expect(out?.fetch).toBe(fetch);
	});
});

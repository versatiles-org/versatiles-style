import { describe, expect, it, vi } from 'vitest';
import { osm } from '../api/osm.js';
import { SHORTBREAD_SCHEMA } from '../shortbread/schema.js';
import type { StyleSpecification } from '../types/index.js';
import { guessOptions } from './guess.js';

const json = (body: unknown, status = 200) =>
	Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

const SHORTBREAD_TILEJSON = {
	tilejson: '3.0.0',
	tiles: ['{z}/{x}/{y}.pbf'],
	vector_layers: Object.entries(SHORTBREAD_SCHEMA).map(([id]) => ({ id, fields: {} })),
};

/** A style whose one vector source reads nothing identifying — only its TileJSON tells the schema. */
function anonymousStyle(url: string): StyleSpecification {
	return {
		version: 8,
		sources: { tiles: { type: 'vector', url } },
		layers: [
			{ id: 'bg', type: 'background', paint: { 'background-color': '#fff' } },
			{ id: 'ocean', type: 'fill', source: 'tiles', 'source-layer': 'ocean', paint: { 'fill-color': '#00f' } },
			{ id: 'a', type: 'line', source: 'tiles', 'source-layer': 'custom_a' },
			{ id: 'b', type: 'line', source: 'tiles', 'source-layer': 'custom_b' },
		],
	} as StyleSpecification;
}

describe('guessOptions', () => {
	it('downloads the style and resolves relative TileJSON URLs against it', async () => {
		const fetch = vi.fn((input: RequestInfo | URL) => {
			const url = String(input);
			if (url === 'https://example.org/styles/a/style.json') return json(anonymousStyle('../../tiles/osm.json'));
			if (url === 'https://example.org/tiles/osm.json') return json(SHORTBREAD_TILEJSON);
			return json({}, 404);
		});
		const guess = await guessOptions('styles/a/style.json', { base: 'https://example.org/', fetch });
		// the style, its TileJSON, and the font list of osm()'s default glyph server
		expect(fetch).toHaveBeenCalledTimes(3);
		expect(guess.kind).toBe('osm');
		expect(guess.report.sources[0].guess).toMatchObject({ schema: 'shortbread' });
	});

	it('takes a style object as it is', async () => {
		const fetch = vi.fn(() => json(SHORTBREAD_TILEJSON));
		const guess = await guessOptions(osm({ theme: 'gray', urls: { osm: 'https://example.org/osm.json' } }), { fetch });
		expect(guess).toMatchObject({ kind: 'osm', options: { theme: 'gray' } });
	});

	it('reads the schema from the style when a TileJSON cannot be loaded', async () => {
		const fetch = vi.fn((_input: RequestInfo | URL) => json({}, 500));
		const style = { ...osm(), sources: { 'versatiles-shortbread': { type: 'vector', url: 'mapbox://x' } } };
		const guess = await guessOptions(style as StyleSpecification, { fetch });
		expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
			'https://tiles.versatiles.org/assets/glyphs/font_families.json',
		]);
		expect(guess.kind).toBe('osm');
		expect(guess.report.warnings[0]).toMatch(/source "versatiles-shortbread": TileJSON not loaded .*not an http/);

		const failing = await guessOptions(anonymousStyle('https://example.org/tiles.json'), { fetch });
		expect(failing.report.warnings[0]).toMatch(/HTTP 500/);
		expect(failing.kind).toBe('unknown');
	});

	it("carries over fonts the default glyph server's font list has", async () => {
		const families = [
			{
				name: 'Open Sans',
				faces: [{ id: 'open_sans_bold', style: 'normal', weight: 700, width: 'normal', codeblocks: '2-7' }],
			},
		];
		const style = osm({ text: { fonts: 'open_sans_bold' }, urls: { osm: 'https://example.org/osm.json' } });
		const withList = await guessOptions(style, {
			fetch: (input) => (String(input).endsWith('/font_families.json') ? json(families) : json(SHORTBREAD_TILEJSON)),
		});
		expect(withList).toMatchObject({ kind: 'osm', options: { text: { fonts: 'open_sans_bold' } } });

		const withoutList = await guessOptions(style, {
			fetch: (input) => (String(input).endsWith('/font_families.json') ? json({}, 404) : json(SHORTBREAD_TILEJSON)),
		});
		expect(withoutList).toMatchObject({ kind: 'osm', options: { text: { fonts: 'noto_sans_bold' } } });
	});

	it('never throws', async () => {
		const unreachable = await guessOptions('https://example.org/style.json', { fetch: () => json({}, 404) });
		expect(unreachable.kind).toBe('unknown');
		expect(unreachable.report.warnings).toContainEqual(expect.stringContaining('HTTP 404'));

		expect((await guessOptions(42 as never)).kind).toBe('unknown');
		expect((await guessOptions(osm(), { nope: true } as never)).report.warnings[0]).toContain('nope');
	});
});

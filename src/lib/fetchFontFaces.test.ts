import { describe, expect, it, vi } from 'vitest';
import { fetchFontFaces, fontFamiliesUrl } from './fetchFontFaces.js';
import type { FetchLike } from '../options/';

const FAMILIES = [
	{
		name: 'Noto Sans',
		faces: [
			{ id: 'noto_sans_bold', style: 'normal', weight: 700, width: 'normal', codeblocks: '0,2-7' },
			{ id: 'noto_sans_regular', style: 'normal', weight: 400, width: 'normal', codeblocks: '0,2-7' },
		],
	},
	{
		name: 'Fira Sans',
		faces: [
			{ id: 'fira_sans_condensed_light_italic', style: 'italic', weight: 300, width: 'condensed', codeblocks: '2-7' },
			{ id: 'fira_sans_regular_italic', style: 'italic', weight: 400, width: 'normal', codeblocks: '2-7' },
			{
				id: 'fira_sans_extra_condensed_bold',
				style: 'normal',
				weight: 700,
				width: 'extra-condensed',
				codeblocks: '2-7',
			},
			{ id: 'fira_sans_regular', style: 'normal', weight: 400, width: 'normal', codeblocks: '2-7' },
			{ id: 'fira_sans_book', style: 'normal', weight: 450, width: 'normal', codeblocks: '2-7' },
		],
	},
];

/** A fetch that answers every request with `body` and `status`, recording the URLs it was asked for. */
function mockFetch(body: unknown, status = 200) {
	const urls: string[] = [];
	const fetch = vi.fn((input: RequestInfo | URL) => {
		urls.push(String(input));
		return Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));
	}) as unknown as FetchLike;
	return { fetch, urls };
}

describe('fontFamiliesUrl', () => {
	it('is font_families.json in the directory of the {fontstack} folders', () => {
		expect(fontFamiliesUrl('https://t.org/assets/glyphs/{fontstack}/{range}.pbf')).toBe(
			'https://t.org/assets/glyphs/font_families.json'
		);
	});

	it('is undefined when {fontstack} is not a path segment', () => {
		expect(fontFamiliesUrl('https://t.org/glyphs?stack={fontstack}&range={range}')).toBeUndefined();
		expect(fontFamiliesUrl('https://t.org/{fontstack}-{range}.pbf')).toBeUndefined();
	});
});

describe('fetchFontFaces', () => {
	it('reads the list next to the default glyph pattern of `base`', async () => {
		const { fetch, urls } = mockFetch(FAMILIES);
		await fetchFontFaces({ base: 'https://tiles.example.org' }, { fetch });
		expect(urls).toEqual(['https://tiles.example.org/assets/glyphs/font_families.json']);
	});

	it('resolves a relative glyphsPattern against base, and takes an absolute one as it is', async () => {
		const a = mockFetch(FAMILIES);
		await fetchFontFaces(
			{ base: 'https://tiles.example.org', glyphsPattern: '/fonts/{fontstack}/{range}.pbf' },
			{ fetch: a.fetch }
		);
		expect(a.urls).toEqual(['https://tiles.example.org/fonts/font_families.json']);

		const b = mockFetch(FAMILIES);
		await fetchFontFaces(
			{ base: 'https://ignored.org', glyphsPattern: 'https://g.org/x/{fontstack}/{range}.pbf' },
			{ fetch: b.fetch }
		);
		expect(b.urls).toEqual(['https://g.org/x/font_families.json']);
	});

	it('describes every face, sorted by family, width, weight and italic', async () => {
		const faces = await fetchFontFaces({ base: 'https://t.org' }, { fetch: mockFetch(FAMILIES).fetch });
		expect(faces?.map((f) => f.title)).toEqual([
			'Fira Sans Regular',
			'Fira Sans Italic',
			'Fira Sans 450',
			'Fira Sans Extra Condensed Bold',
			'Fira Sans Condensed Light Italic',
			'Noto Sans Regular',
			'Noto Sans Bold',
		]);
		expect(faces?.[4]).toStrictEqual({
			id: 'fira_sans_condensed_light_italic',
			family: 'Fira Sans',
			title: 'Fira Sans Condensed Light Italic',
			weight: 300,
			italic: true,
			width: 'condensed',
			codeblocks: '2-7',
		});
	});

	it('is undefined without a request when the pattern has no {fontstack} segment', async () => {
		const { fetch, urls } = mockFetch(FAMILIES);
		expect(
			await fetchFontFaces({ glyphsPattern: 'https://t.org/g?s={fontstack}&r={range}' }, { fetch })
		).toBeUndefined();
		expect(urls).toEqual([]);
	});

	it('is undefined when the server publishes no list, or something else', async () => {
		expect(
			await fetchFontFaces({ base: 'https://t.org' }, { fetch: mockFetch('Not Found', 404).fetch })
		).toBeUndefined();
		expect(await fetchFontFaces({ base: 'https://t.org' }, { fetch: mockFetch('<html>').fetch })).toBeUndefined();
		expect(await fetchFontFaces({ base: 'https://t.org' }, { fetch: mockFetch({ fonts: [] }).fetch })).toBeUndefined();
		expect(
			await fetchFontFaces(
				{ base: 'https://t.org' },
				{ fetch: mockFetch([{ name: 'X', faces: [{ id: 'x_regular' }] }]).fetch }
			)
		).toBeUndefined();
	});

	it('rejects when the request itself fails', async () => {
		const fetch = vi.fn(() => Promise.reject(new TypeError('fetch failed'))) as unknown as FetchLike;
		await expect(fetchFontFaces({ base: 'https://t.org' }, { fetch })).rejects.toThrow('fetch failed');
	});

	it('rejects unknown option keys', async () => {
		await expect(fetchFontFaces({ glyphs: 'x' } as never)).rejects.toThrow('unknown option');
		await expect(fetchFontFaces({}, { fetchFn: () => {} } as never)).rejects.toThrow('unknown option');
	});
});

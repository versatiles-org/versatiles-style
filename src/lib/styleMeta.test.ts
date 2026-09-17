import { describe, expect, it } from 'vitest';
import { osm, satellite } from '../index.js';
import type { StyleSpecification } from '../types/index.js';
import {
	METADATA_OPTIONS_KEY,
	METADATA_VERSION,
	readStyleOptions,
	STYLE_LICENSE,
	styleMetadata,
	styleName,
} from './styleMeta.js';

// v5 published a distinct `name` per style and the CC0 `metadata.license` on every one of them.
// v6 dropped both from satellite() and collapsed osm() to a single generic name (B2).
describe('style name and metadata', () => {
	it('names each palette distinctly, like v5 did', () => {
		expect(osm({ theme: 'colorful' }).name).toBe('versatiles-colorful');
		expect(osm({ theme: 'toner' }).name).toBe('versatiles-toner');
		expect(osm({ theme: 'gray-dark' }).name).toBe('versatiles-gray-dark');
		expect(satellite().name).toBe('versatiles-satellite');
	});

	it('gives every palette a different name', () => {
		const names = osm.palettes.map((p) => osm({ theme: p }).name);
		expect(new Set(names).size).toBe(names.length);
	});

	it('carries the CC0 license on every style', () => {
		for (const style of [osm(), satellite(), satellite({ osmOverlay: {} })]) {
			expect(style.metadata, 'a published style must state its license').toMatchObject({ license: STYLE_LICENSE });
		}
	});

	it('styleName prefixes the theme name', () => {
		expect(styleName('muted')).toBe('versatiles-muted');
		expect(styleName('muted-dark')).toBe('versatiles-muted-dark');
	});
});

describe('styleMetadata / readStyleOptions', () => {
	/** A style carrying whatever metadata the test wants to read back. */
	const withMetadata = (metadata: unknown): StyleSpecification =>
		({ version: 8, sources: {}, layers: [], metadata }) as unknown as StyleSpecification;

	it('round-trips the options a style was built from', () => {
		const options = osm.minimizeOptions({ theme: 'gray', text: { scale: 1.5 } });
		const style = { ...osm(options), metadata: styleMetadata('osm', options) };

		const record = readStyleOptions(style);
		expect(record).toEqual({ builder: 'osm', options, version: METADATA_VERSION });
		// and the recovered options rebuild the same style
		expect(JSON.stringify(osm(record!.options))).toBe(JSON.stringify(osm(options)));
	});

	it('keeps the license, so recording options does not cost the CC0 statement', () => {
		expect(styleMetadata('osm', { theme: 'gray' })).toMatchObject({ license: STYLE_LICENSE });
	});

	it('never records urls, which pin a style to the host that built it', () => {
		// `urls.osm` may be a whole pre-fetched TileJSON; none of it is style, all of it is environment.
		const metadata = styleMetadata('osm', {
			theme: 'gray',
			urls: { base: 'https://tiles.example.org', osm: { tiles: ['https://x/{z}/{x}/{y}'] } },
		}) as Record<string, unknown>;

		expect(metadata[METADATA_OPTIONS_KEY]).toEqual({ theme: 'gray' });
		expect(JSON.stringify(metadata)).not.toContain('tiles.example.org');
	});

	it('is not written by the builders themselves', () => {
		// Doing so would break `osm(minimizeOptions(x)) === osm(x)` — see the note on styleMetadata.
		expect(readStyleOptions(osm())).toBeUndefined();
		expect(readStyleOptions(satellite())).toBeUndefined();
	});

	it('reads a satellite record back', () => {
		const options = satellite.minimizeOptions({ raster: { opacity: 0.5 } });
		const style = { ...satellite(options), metadata: styleMetadata('satellite', options) };
		expect(readStyleOptions(style)).toEqual({ builder: 'satellite', options, version: METADATA_VERSION });
	});

	it('returns undefined for anything malformed rather than throwing', () => {
		for (const metadata of [
			undefined,
			null,
			'a string',
			{},
			{ license: STYLE_LICENSE },
			{ 'versatiles:builder': 'osm' }, // no options
			{ 'versatiles:builder': 'nonsense', 'versatiles:options': {} },
			{ 'versatiles:builder': 'osm', 'versatiles:options': 'not an object' },
			{ 'versatiles:builder': 'osm', 'versatiles:options': [] },
		]) {
			expect(readStyleOptions(withMetadata(metadata)), JSON.stringify(metadata)).toBeUndefined();
		}
	});

	it('reports version 0 for a record written before versions were stamped', () => {
		const record = readStyleOptions(
			withMetadata({ 'versatiles:builder': 'osm', 'versatiles:options': { theme: 'gray' } })
		);
		expect(record).toEqual({ builder: 'osm', options: { theme: 'gray' }, version: 0 });
	});
});

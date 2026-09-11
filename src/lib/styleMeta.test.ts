import { describe, expect, it } from 'vitest';
import { osm, satellite } from '../index.js';
import { STYLE_LICENSE, styleName } from './styleMeta.js';

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

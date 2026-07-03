import { describe, expect, it } from 'vitest';
import { osm } from './osm.js';
import { satellite } from './satellite.js';
import { getStyleVariants } from '../variants.js';

// Style generation must be deterministic: identical options → byte-identical output. This
// protects reproducible distributions (the published styles.tar.gz) and caching. Uses the
// global fetch stub from vitest.setup.ts.

describe('style generation is deterministic', () => {
	it('osm() produces byte-identical JSON across repeated builds', async () => {
		const a = JSON.stringify(await osm({ theme: 'colorful', features: { hillshade: true } }));
		const b = JSON.stringify(await osm({ theme: 'colorful', features: { hillshade: true } }));
		expect(a).toBe(b);
	});

	it('satellite() produces byte-identical JSON across repeated builds', async () => {
		const a = JSON.stringify(await satellite({ osmOverlay: { theme: 'toner' } }));
		const b = JSON.stringify(await satellite({ osmOverlay: { theme: 'toner' } }));
		expect(a).toBe(b);
	});

	it('two structurally-equal option objects yield identical output', async () => {
		const a = JSON.stringify(await osm({ theme: { palette: 'gray', darkMode: true }, text: { language: 'de' } }));
		const b = JSON.stringify(await osm({ theme: { palette: 'gray', darkMode: true }, text: { language: 'de' } }));
		expect(a).toBe(b);
	});

	it('every getStyleVariants() build is reproducible', async () => {
		const first = await Promise.all(getStyleVariants().map(async (v) => [v.name, JSON.stringify(await v.build())]));
		const second = await Promise.all(getStyleVariants().map(async (v) => [v.name, JSON.stringify(await v.build())]));
		expect(second).toStrictEqual(first);
	});
});

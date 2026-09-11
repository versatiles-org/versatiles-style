import { describe, expect, it } from 'vitest';
import { osm } from './osm.js';
import { satellite } from './satellite.js';
import { getStyleVariants } from '../variants.js';

// Style generation must be deterministic: identical options → byte-identical output. This
// protects reproducible distributions (the published styles.tar.gz) and caching. Uses the
// global fetch stub from vitest.setup.ts.

describe('style generation is deterministic', () => {
	it('osm() produces byte-identical JSON across repeated builds', () => {
		const a = JSON.stringify(osm({ theme: 'colorful', features: { hillshade: true } }));
		const b = JSON.stringify(osm({ theme: 'colorful', features: { hillshade: true } }));
		expect(a).toBe(b);
	});

	it('satellite() produces byte-identical JSON across repeated builds', () => {
		const a = JSON.stringify(satellite({ osmOverlay: { theme: 'toner' } }));
		const b = JSON.stringify(satellite({ osmOverlay: { theme: 'toner' } }));
		expect(a).toBe(b);
	});

	it('two structurally-equal option objects yield identical output', () => {
		const a = JSON.stringify(osm({ theme: 'gray-dark', text: { language: 'de' } }));
		const b = JSON.stringify(osm({ theme: 'gray-dark', text: { language: 'de' } }));
		expect(a).toBe(b);
	});

	it('every getStyleVariants() build is reproducible', () => {
		const first = getStyleVariants().map((v) => [v.name, JSON.stringify(v.build())]);
		const second = getStyleVariants().map((v) => [v.name, JSON.stringify(v.build())]);
		expect(second).toStrictEqual(first);
	});
});

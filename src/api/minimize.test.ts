import { describe, expect, it } from 'vitest';
import type { OsmOptions, SatelliteOptions } from '../options/index.js';
import { osm } from './osm.js';
import { satellite } from './satellite.js';

// `minimizeOptions` exists to be stored and rebuilt, so the property that matters is the round trip:
// whatever it drops must not change the style. Each case is checked against the full build.
const same = (a: unknown, b: unknown) => expect(JSON.stringify(a)).toBe(JSON.stringify(b));

describe('osm.minimizeOptions', () => {
	it('minimises defaults to nothing, however they are spelled', () => {
		expect(osm.minimizeOptions()).toEqual({});
		expect(osm.minimizeOptions(osm.defaults)).toEqual({});
		expect(osm.minimizeOptions({ theme: 'colorful', sky: false })).toEqual({ sky: false });
	});

	it('keeps a non-default theme', () => {
		expect(osm.minimizeOptions(osm.resolveOptions({ theme: 'gray' }))).toEqual({ theme: 'gray' });
		expect(osm.minimizeOptions(osm.resolveOptions({ theme: 'colorful-dark' }))).toEqual({ theme: 'colorful-dark' });
	});

	it("compares colours against the chosen palette's own defaults", () => {
		const muted = osm.resolveOptions({ theme: 'muted' });
		expect(osm.minimizeOptions({ ...muted, colors: { ...muted.colors, water: '#123456' } })).toEqual({
			theme: 'muted',
			colors: { water: '#123456' },
		});
	});

	it('keeps disabled and enabled toggles that differ from the default', () => {
		expect(osm.minimizeOptions({ sky: false, features: { terrain: true } })).toEqual({
			sky: false,
			features: { terrain: true },
		});
	});

	const CASES: [string, OsmOptions][] = [
		['defaults', {}],
		['dark theme', { theme: 'natural-dark' }],
		[
			'colours + recolor',
			{ theme: 'muted', colors: { land: '#ff00ff' }, recolor: { gamma: 1.5, tint: { amount: 0.3, color: '#00ff00' } } },
		],
		['text + layout', { text: { language: 'de', fontBold: 'noto_sans_regular' }, layout: { scale: { labels: 1.5 } } }],
		[
			'features + layers',
			{ features: { hillshade: true, landcover: true }, layers: { labels: false, roads: { paths: 0.5 } } },
		],
		['sky', { sky: { skyColor: '#010203' }, projection: 'mercator' }],
		['urls', { urls: { base: 'https://tiles.example.org' } }],
	];

	it.each(CASES)('%s: rebuilds the identical style', (_label, options) => {
		same(osm(osm.minimizeOptions(options)), osm(options));
	});

	it.each(CASES)('%s: rebuilds the identical style from an edited resolved object', (_label, options) => {
		const resolved = osm.resolveOptions(options);
		same(osm(osm.minimizeOptions(resolved)), osm(resolved));
	});
});

describe('satellite.minimizeOptions', () => {
	it('minimises defaults to nothing, including an overlay left at its defaults', () => {
		expect(satellite.minimizeOptions()).toEqual({});
		expect(satellite.minimizeOptions(satellite.defaults)).toEqual({});
		expect(satellite.minimizeOptions({ osmOverlay: true })).toEqual({});
		expect(satellite.minimizeOptions({ osmOverlay: { theme: 'gray' } })).toEqual({});
	});

	it('keeps what differs', () => {
		expect(
			satellite.minimizeOptions({
				...satellite.defaults,
				raster: { ...satellite.defaults.raster, contrast: 0.3 },
				osmOverlay: false,
			})
		).toEqual({
			raster: { contrast: 0.3 },
			osmOverlay: false,
		});
		expect(satellite.minimizeOptions({ osmOverlay: { theme: 'toner', text: { language: 'en' } } })).toEqual({
			osmOverlay: { theme: 'toner', text: { language: 'en' } },
		});
	});

	const CASES: [string, SatelliteOptions][] = [
		['defaults', {}],
		['raster', { raster: { opacity: 0.7, hueRotate: 20 } }],
		['overlay off', { osmOverlay: false, features: { terrain: true } }],
		[
			'overlay configured',
			{ osmOverlay: { theme: 'gray-dark', colors: { water: '#123456' }, layout: { scale: { icons: 2 } } } },
		],
	];

	it.each(CASES)('%s: rebuilds the identical style', (_label, options) => {
		same(satellite(satellite.minimizeOptions(options)), satellite(options));
	});
});

describe('toCode', () => {
	// The snippet imports from the package; run it with the real builders and a stand-in
	// `inlineSources` (the real one downloads TileJSONs) to check it builds the same style.
	function run(code: string): unknown {
		const body = code.replace(/^import .*\n/, '') + '\nreturn style;';
		const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
		const inlineSources = (style: unknown) => style;
		return new AsyncFunction('osm', 'satellite', 'inlineSources', body)(osm, satellite, inlineSources);
	}

	it('always goes through inlineSources', () => {
		expect(osm.toCode()).toBe(
			"import { osm, inlineSources } from '@versatiles/style';\n\nconst style = await inlineSources(osm());\n"
		);
		expect(satellite.toCode({ osmOverlay: false })).toContain('await inlineSources(satellite({');
	});

	it('writes identifier keys unquoted', () => {
		expect(osm.toCode({ theme: 'gray' })).toContain('theme: "gray"');
	});

	it.each([
		['osm defaults', () => osm.toCode(), () => osm()],
		[
			'osm edited resolved object',
			() => {
				const r = osm.resolveOptions({ theme: 'muted' });
				return osm.toCode({ ...r, colors: { ...r.colors, water: '#123456' }, text: { ...r.text, language: 'de' } });
			},
			() => osm({ theme: 'muted', colors: { water: '#123456' }, text: { language: 'de' } }),
		],
		[
			'satellite with overlay',
			() => satellite.toCode({ raster: { opacity: 0.7 }, osmOverlay: { theme: 'toner' } }),
			() => satellite({ raster: { opacity: 0.7 }, osmOverlay: { theme: 'toner' } }),
		],
	] as const)('%s: the snippet runs and builds the same style', async (_label, code, expected) => {
		same(await run(code()), expected());
	});
});

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

	it('writes fonts as the smallest tree, from any spelling', () => {
		expect(osm.minimizeOptions({ text: { fonts: { water: { lakes: 'x', rivers: 'x' } } } })).toEqual({
			text: { fonts: { water: 'x' } },
		});
		const edited = osm.resolveOptions({ text: { fonts: 'fira_sans_regular' } });
		expect(osm.minimizeOptions(edited)).toEqual({ text: { fonts: 'fira_sans_regular' } });
		const defaults = osm.resolveOptions();
		expect(osm.minimizeOptions({ ...defaults, text: { ...defaults.text, fonts: { ...defaults.text.fonts } } })).toEqual(
			{}
		);
		expect(osm.minimizeOptions({ text: { language: 'de', fonts: { streets: { refs: 'noto_sans_bold' } } } })).toEqual({
			text: { language: 'de' },
		});
	});

	it('keeps disabled and enabled toggles that differ from the default', () => {
		expect(osm.minimizeOptions({ sky: false, features: { terrain: true } })).toEqual({
			sky: false,
			features: { terrain: true },
		});
	});

	describe('from a resolved tree, as a UI holds it', () => {
		const roundTrip = (options: OsmOptions) => osm.minimizeOptions(osm.resolveOptions(options));

		it('collapses layer groups that all hold the same value', () => {
			expect(roundTrip({ layers: { labels: false } })).toEqual({ layers: { labels: false } });
			expect(roundTrip({ layers: false })).toEqual({ layers: false });
			expect(roundTrip({ layers: 0.5 })).toEqual({ layers: 0.5 });
			expect(roundTrip({ layers: { roads: { streets: { service: false } }, labels: { water: 0.5 } } })).toEqual({
				layers: { roads: { streets: { service: false } }, labels: { water: 0.5 } },
			});
			// spelled out leaf by leaf, the same collapse applies
			expect(osm.minimizeOptions({ layers: { labels: { water: { lakes: false, rivers: false } } } })).toEqual({
				layers: { labels: { water: false } },
			});
		});

		it('never writes `icons`, which a resolved tree only carries as an unused alias', () => {
			// resolves to icons: false with pois: true — writing `icons: false` would hide the POIs
			const options: OsmOptions = { layers: { icons: false, pois: true } };
			expect(roundTrip(options)).toEqual({ layers: { transit: { stops: false }, markings: false } });
			same(osm(roundTrip(options)), osm(options));
			expect(roundTrip({ layers: { icons: false } })).toEqual({
				layers: { transit: { stops: false }, pois: false, markings: false },
			});
		});

		it('writes terrain, hillshade and sun as `true` when they equal what `true` resolves to', () => {
			expect(roundTrip({ features: { terrain: true, hillshade: true }, sun: true })).toEqual({
				features: { terrain: true, hillshade: true },
				sun: true,
			});
			expect(roundTrip({ features: { hillshade: { exaggeration: 0.3 } }, sun: { altitude: 30 } })).toEqual({
				features: { hillshade: { exaggeration: 0.3 } },
				sun: { altitude: 30 },
			});
		});

		it('collapses resolved URLs back to `urls.base`', () => {
			expect(roundTrip({ urls: { base: 'https://tiles.example.org' } })).toEqual({
				urls: { base: 'https://tiles.example.org' },
			});
			expect(roundTrip({ urls: { base: 'https://tiles.example.org', osm: '/other/tiles.json' } })).toEqual({
				urls: { base: 'https://tiles.example.org', osm: 'https://tiles.example.org/other/tiles.json' },
			});
			expect(osm.minimizeOptions({ urls: { base: 'https://tiles.example.org', osm: '/other/tiles.json' } })).toEqual({
				urls: { base: 'https://tiles.example.org', osm: '/other/tiles.json' },
			});
			expect(roundTrip({ urls: { glyphsPattern: 'https://fonts.example.org/{fontstack}/{range}.pbf' } })).toEqual({
				urls: { glyphsPattern: 'https://fonts.example.org/{fontstack}/{range}.pbf' },
			});
			expect(roundTrip({})).toEqual({});
		});

		it('compares colours by value, not by spelling', () => {
			const defaults = osm.resolveOptions();
			const lower = Object.fromEntries(
				Object.entries(defaults.colors).map(([key, value]) => [key, value.toLowerCase()])
			);
			expect(osm.minimizeOptions({ ...defaults, colors: lower })).toEqual({});
			expect(osm.minimizeOptions({ colors: { water: defaults.colors.water.toLowerCase(), land: '#123456' } })).toEqual({
				colors: { land: '#123456' },
			});
			expect(osm.minimizeOptions({ features: { hillshade: { shadowColor: '#000' } } })).toEqual({
				features: { hillshade: true },
			});
		});
	});

	it('keeps tint and blend exactly as strong as they resolve', () => {
		// an amount left out is 0.5 when the object is there, and 0 when it is not
		expect(osm.minimizeOptions({ recolor: { tint: { color: '#00ff00', amount: 0 } } })).toEqual({});
		expect(osm.minimizeOptions({ recolor: { blend: { color: '#00ff00', amount: 0 }, gamma: 2 } })).toEqual({
			recolor: { gamma: 2 },
		});
		expect(osm.minimizeOptions({ recolor: { tint: { color: '#00ff00' } } })).toEqual({
			recolor: { tint: { color: '#00ff00', amount: 0.5 } },
		});
		expect(osm.minimizeOptions({ recolor: { blend: {} } })).toEqual({ recolor: { blend: { amount: 0.5 } } });
		const resolved = osm.resolveOptions({ recolor: { tint: { color: '#00ff00', amount: 0.3 } } });
		expect(osm.minimizeOptions(resolved)).toEqual({ recolor: { tint: { color: '#00ff00', amount: 0.3 } } });
	});

	const CASES: [string, OsmOptions][] = [
		['defaults', {}],
		['dark theme', { theme: 'natural-dark' }],
		['tint amount 0', { recolor: { tint: { color: '#00ff00', amount: 0 } } }],
		['sky off', { sky: false }],
		['icons alias', { layers: { icons: false, pois: true, transit: { rail: 0.5 } } }],
		['toggles on', { features: { terrain: true, hillshade: { anchor: 'viewport' } }, sun: true }],
		['base and one url', { urls: { base: 'https://tiles.example.org', elevation: '/dem/tiles.json' } }],
		['tint and blend without amount', { recolor: { tint: { color: '#00ff00' }, blend: {} } }],
		[
			'colours + recolor',
			{ theme: 'muted', colors: { land: '#ff00ff' }, recolor: { gamma: 1.5, tint: { amount: 0.3, color: '#00ff00' } } },
		],
		[
			'text + layout',
			{
				text: { language: 'de', fonts: { water: 'fira_sans_italic', pois: { general: 'noto_sans_regular' } } },
				layout: { scale: { labels: 1.5 } },
			},
		],
		[
			'features + layers',
			{ features: { hillshade: true, landcover: true }, layers: { labels: false, roads: { paths: 0.5 } } },
		],
		['fonts', { text: { fonts: { default: 'a', water: 'b', pois: { transit: 'c' } } } }],
		['sky', { sky: { skyColor: '#010203' }, projection: 'mercator' }],
		['urls', { urls: { base: 'https://tiles.example.org' } }],
	];

	it.each(CASES)('%s: rebuilds the identical style', (_label, options) => {
		same(osm(osm.minimizeOptions(options)), osm(options));
	});

	it.each(CASES)('%s: rebuilds the identical style from a resolved object', (_label, options) => {
		// against `osm(options)`, not `osm(resolved)`: resolving must not lose anything either
		const resolved = osm.resolveOptions(options);
		same(osm(resolved), osm(options));
		same(osm(osm.minimizeOptions(resolved)), osm(options));
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

	it('drops overlay layer groups the overlay draws nothing of', () => {
		expect(
			satellite.minimizeOptions({ osmOverlay: { layers: { land: false, water: { ocean: 0.5 }, buildings: false } } })
		).toEqual({});
		expect(satellite.minimizeOptions({ osmOverlay: { layers: { land: false, roads: { steps: false } } } })).toEqual({
			osmOverlay: { layers: { roads: { steps: false } } },
		});
		// a scalar cascades to groups the overlay does draw, so it stays
		expect(satellite.minimizeOptions({ osmOverlay: { layers: 0.5 } })).toEqual({ osmOverlay: { layers: 0.5 } });
		expect(satellite.minimizeOptions({ osmOverlay: satellite.defaults.osmOverlay })).toEqual({});
	});

	it('collapses a resolved tree: overlay layers, toggles and URLs', () => {
		const roundTrip = (options: SatelliteOptions) => satellite.minimizeOptions(satellite.resolveOptions(options));
		// land is not drawn in the overlay, so it neither blocks the collapse nor is written
		expect(
			roundTrip({ osmOverlay: { layers: { land: true, roads: false, transit: false, boundaries: false } } })
		).toEqual({ osmOverlay: { layers: { roads: false, transit: false, boundaries: false } } });
		const allOff = satellite.resolveOptions({ osmOverlay: { layers: false } });
		expect(satellite.minimizeOptions(allOff)).toEqual({ osmOverlay: { layers: false } });
		expect(roundTrip({ urls: { base: 'https://tiles.example.org' }, features: { terrain: true }, sun: true })).toEqual({
			urls: { base: 'https://tiles.example.org' },
			features: { terrain: true },
			sun: true,
		});
	});

	it("minimises overlay fonts against the overlay's all-bold fonts", () => {
		expect(satellite.minimizeOptions({ osmOverlay: { text: { fonts: 'noto_sans_bold' } } })).toEqual({});
		expect(satellite.minimizeOptions({ osmOverlay: { text: { fonts: { water: 'x' } } } })).toEqual({
			osmOverlay: { text: { fonts: { water: 'x' } } },
		});
		// osm()'s own fonts, set in the overlay: regular, with refs and POI names bold
		expect(satellite.minimizeOptions({ osmOverlay: { text: osm.resolveOptions().text } })).toEqual({
			osmOverlay: {
				text: {
					fonts: {
						default: 'noto_sans_regular',
						streets: { refs: 'noto_sans_bold' },
						pois: { general: 'noto_sans_bold' },
					},
				},
			},
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
		['sky off', { sky: false, osmOverlay: false }],
		['overlay layers off', { osmOverlay: { layers: { roads: false, labels: { places: 0.5 } } } }],
		['urls and toggles', { urls: { base: 'https://tiles.example.org' }, features: { hillshade: true }, sun: true }],
		['overlay tint amount 0', { osmOverlay: { recolor: { tint: { color: '#00ff00', amount: 0 } } } }],
		['overlay blend without amount', { osmOverlay: { recolor: { blend: { color: '#00ff00' } } } }],
		['overlay fonts', { osmOverlay: { text: { fonts: { default: 'a', places: { cities: 'b' } } } } }],
		['overlay layers', { osmOverlay: { layers: { land: false, water: 0.3, sites: false, roads: { streets: 0.5 } } } }],
	];

	it.each(CASES)('%s: rebuilds the identical style', (_label, options) => {
		same(satellite(satellite.minimizeOptions(options)), satellite(options));
	});

	it.each(CASES)('%s: rebuilds the identical style from a resolved object', (_label, options) => {
		const resolved = satellite.resolveOptions(options);
		same(satellite(resolved), satellite(options));
		same(satellite(satellite.minimizeOptions(resolved)), satellite(options));
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

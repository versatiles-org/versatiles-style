import { describe, expect, it } from 'vitest';
import { TEXT_GROUPS, type OsmOptions, type SatelliteOptions } from '../options/index.js';
import { osm } from '../index.js';
import { satellite } from '../index.js';

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

	it('writes text as the smallest tree, from any spelling', () => {
		expect(osm.minimizeOptions({ text: { water: { lakes: { font: 'x' }, rivers: { font: 'x' } } } })).toEqual({
			text: { water: { font: 'x' } },
		});
		const edited = osm.resolveOptions({ text: { font: 'fira_sans_regular' } });
		expect(osm.minimizeOptions(edited)).toEqual({ text: { font: 'fira_sans_regular' } });
		const defaults = osm.resolveOptions();
		expect(osm.minimizeOptions({ ...defaults, text: structuredClone(defaults.text) })).toEqual({});
		expect(osm.minimizeOptions({ text: { language: 'de', streets: { refs: { font: 'noto_sans_bold' } } } })).toEqual({
			text: { language: 'de' },
		});
		// swapped weights: three fonts instead of fourteen
		const swapped = osm.resolveOptions({
			text: {
				font: 'noto_sans_bold',
				streets: { refs: { font: 'noto_sans_regular' } },
				pois: { general: { font: 'noto_sans_regular' } },
			},
		});
		expect(osm.minimizeOptions(swapped)).toEqual({
			text: {
				font: 'noto_sans_bold',
				streets: { refs: { font: 'noto_sans_regular' } },
				pois: { general: { font: 'noto_sans_regular' } },
			},
		});
		// each property on its own level
		expect(
			osm.minimizeOptions(
				osm.resolveOptions({ text: { scale: 1.2, streets: { letterSpacing: 0.1 }, addresses: { haloWidth: 1 } } })
			)
		).toEqual({ text: { scale: 1.2, streets: { letterSpacing: 0.1 }, addresses: { haloWidth: 1 } } });
		// a value equal to a topic's default is not written, and the cheapest level wins
		expect(osm.minimizeOptions({ text: { transform: 'none', boundaries: { transform: 'uppercase' } } })).toEqual({
			text: { places: { transform: 'none' } },
		});
		expect(
			osm.minimizeOptions({ text: { places: { transform: 'uppercase', hamlets: { transform: 'uppercase' } } } })
		).toEqual({ text: { places: { transform: 'uppercase' } } });
	});

	describe('text on random trees', () => {
		// A small deterministic generator, so a failure names a reproducible case.
		let seed = 42;
		const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
		const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
		const VALUES = {
			font: ['noto_sans_regular', 'noto_sans_bold', 'a'],
			haloWidth: [0, 1, 2],
			transform: ['none', 'uppercase'],
		} as const;
		const style = (): Record<string, unknown> =>
			Object.fromEntries(
				Object.entries(VALUES)
					.filter(() => random() < 0.3)
					.map(([key, values]) => [key, pick<string | number>(values)])
			);
		const size = (node: unknown): number =>
			node !== null && typeof node === 'object'
				? Object.values(node).reduce<number>((sum, child) => sum + size(child), 0)
				: 1;

		function randomText(): OsmOptions['text'] {
			const text: Record<string, unknown> = style();
			if (random() < 0.3) text.addresses = style();
			for (const [group, leaves] of Object.entries(TEXT_GROUPS)) {
				if (random() < 0.4) continue;
				const node = style();
				for (const leaf of leaves) if (random() < 0.4) node[leaf] = style();
				text[group] = node;
			}
			return text as OsmOptions['text'];
		}

		const cases = Array.from({ length: 300 }, (_, i) => [i, randomText()] as const);

		it('resolves to the same text, is no larger, and is already minimal', () => {
			for (const [i, text] of cases) {
				const min = osm.minimizeOptions({ text });
				const label = `case ${i}: ${JSON.stringify(text)}`;
				expect(osm.resolveOptions(min).text, label).toStrictEqual(osm.resolveOptions({ text }).text);
				expect(size(min.text ?? {}), label).toBeLessThanOrEqual(size(text));
				expect(osm.minimizeOptions(min), label).toStrictEqual(min);
			}
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
			expect(roundTrip({ sun: { color: '#FFFFFF', intensity: 0.8 } })).toEqual({ sun: { intensity: 0.8 } });
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

		it('writes text scale and spacing on the highest node they are equal on', () => {
			expect(roundTrip({ text: { scale: 2, spacing: 1.5 }, icon: { scale: 2 } })).toEqual({
				text: { scale: 2, spacing: 1.5 },
				icon: { scale: 2 },
			});
			expect(roundTrip({ text: { streets: { scale: 2 } }, icon: { spacing: 0.5 } })).toEqual({
				text: { streets: { scale: 2 } },
				icon: { spacing: 0.5 },
			});
			expect(roundTrip({ text: { scale: 1, pitchAlignment: 'viewport' }, icon: { scale: 1 } })).toEqual({
				text: { pitchAlignment: 'viewport' },
			});
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
		['sun intensity', { sun: { intensity: 0.8 }, features: { buildings: 'extruded' } }],
		['text and icon scale', { text: { scale: 2, spacing: 1.5, pitchAlignment: 'viewport' }, icon: { spacing: 2 } }],
		[
			'label typography',
			{
				text: {
					maxWidth: 6,
					streets: { letterSpacing: 0.1, refs: { haloWidth: 1 } },
					places: { hamlets: { transform: 'none' } },
				},
			},
		],
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
				text: {
					language: 'de',
					scale: 1.5,
					water: { font: 'fira_sans_italic' },
					pois: { general: { font: 'noto_sans_regular' } },
				},
			},
		],
		[
			'features + layers',
			{ features: { hillshade: true, landcover: true }, layers: { labels: false, roads: { paths: 0.5 } } },
		],
		['fonts', { text: { font: 'a', water: { font: 'b' }, pois: { transit: { font: 'c' } } } }],
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

	it("minimises overlay text against the overlay's own label styles", () => {
		expect(satellite.minimizeOptions({ osmOverlay: { text: { font: 'noto_sans_bold', haloBlur: 0 } } })).toEqual({});
		expect(satellite.minimizeOptions({ osmOverlay: { text: { water: { font: 'x' } } } })).toEqual({
			osmOverlay: { text: { water: { font: 'x' } } },
		});
		// osm()'s own label styles, set in the overlay: regular with bold refs and POI names, and osm()'s halos
		expect(satellite.minimizeOptions({ osmOverlay: { text: osm.resolveOptions().text } })).toEqual({
			osmOverlay: {
				text: {
					font: 'noto_sans_regular',
					haloWidth: 2,
					haloBlur: 1,
					streets: { refs: { font: 'noto_sans_bold', haloWidth: 0.1 }, exits: { haloWidth: 1 } },
					pois: { general: { font: 'noto_sans_bold', haloWidth: 0.5, haloBlur: 0.5 } },
					addresses: { haloWidth: 0, haloBlur: 0 },
				},
			},
		});
	});

	const CASES: [string, SatelliteOptions][] = [
		['defaults', {}],
		['raster', { raster: { opacity: 0.7, hueRotate: 20 } }],
		['overlay off', { osmOverlay: false, features: { terrain: true } }],
		['overlay configured', { osmOverlay: { theme: 'gray-dark', colors: { water: '#123456' }, icon: { scale: 2 } } }],
		['sky off', { sky: false, osmOverlay: false }],
		['overlay text and icon', { osmOverlay: { text: { scale: 1.5, haloBlur: 1 }, icon: { spacing: 2 } } }],
		['overlay layers off', { osmOverlay: { layers: { roads: false, labels: { places: 0.5 } } } }],
		['urls and toggles', { urls: { base: 'https://tiles.example.org' }, features: { hillshade: true }, sun: true }],
		['overlay tint amount 0', { osmOverlay: { recolor: { tint: { color: '#00ff00', amount: 0 } } } }],
		['overlay blend without amount', { osmOverlay: { recolor: { blend: { color: '#00ff00' } } } }],
		['overlay fonts', { osmOverlay: { text: { font: 'a', places: { cities: { font: 'b' } } } } }],
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
			"import { osm, inlineSources } from '@versatiles/style';\n\n" +
				'const style = await inlineSources(osm({\n  urls: {\n    base: "https://tiles.versatiles.org"\n  }\n}));\n'
		);
		expect(satellite.toCode({ osmOverlay: false })).toContain('await inlineSources(satellite({');
	});

	it('always names urls.base, even where minimizeOptions leaves it out', () => {
		const base = 'https://tiles.versatiles.org'; // the default base outside a browser
		expect(osm.minimizeOptions({ urls: { base } })).toEqual({});
		expect(osm.toCode({ urls: { base } })).toContain(`base: "${base}"`);
		expect(satellite.toCode({ raster: { opacity: 0.5 } })).toContain(`base: "${base}"`);
		const custom = osm.toCode(osm.resolveOptions({ urls: { base: 'https://tiles.example.org', osm: '/x.json' } }));
		expect(custom).toContain('base: "https://tiles.example.org"');
		expect(custom).toContain('osm: "https://tiles.example.org/x.json"');
		expect(custom).not.toContain(base);
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

	describe("target: 'browser'", () => {
		/**
		 * Runs the snippet's `<script>` body against a stand-in `VersaTilesStyle` global, the way a page
		 * loading the CDN bundle would. The surgery lifts `style` out of the IIFE, which is scoped.
		 */
		function runBrowser(code: string): unknown {
			const script = code.split('<script>')[1].split('</script>')[0];
			const body = script.replace('(async () => {', 'return (async () => {').replace('})();', 'return style; })();');
			const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
			const VersaTilesStyle = { osm, satellite, inlineSources: (style: unknown) => style };
			return new AsyncFunction('VersaTilesStyle', body)(VersaTilesStyle);
		}

		it('writes the script-tag form, with no import and no top-level await', () => {
			const code = osm.toCode({ theme: 'gray' }, { target: 'browser' });
			expect(code).toContain(
				'<script src="https://tiles.versatiles.org/assets/lib/versatiles-style/versatiles-style.js">'
			);
			expect(code).toContain('VersaTilesStyle.inlineSources(VersaTilesStyle.osm({');
			expect(code).toContain('theme: "gray"');
			// a classic script is not a module: no import, and the await needs an async IIFE around it
			expect(code).not.toContain('import ');
			expect(code).toContain('(async () => {');
		});

		it.each([
			['osm', () => osm.toCode({ theme: 'muted' }, { target: 'browser' }), () => osm({ theme: 'muted' })],
			[
				'satellite',
				() => satellite.toCode({ raster: { opacity: 0.7 } }, { target: 'browser' }),
				() => satellite({ raster: { opacity: 0.7 } }),
			],
		] as const)('%s: the snippet runs and builds the same style', async (_label, code, expected) => {
			same(await runBrowser(code()), expected());
		});

		it('refuses the schemas the CDN bundle does not carry', async () => {
			const { omt } = await import('../omt/index.js');
			expect(() => omt.toCode({ theme: 'gray' }, { target: 'browser' })).toThrow(/only osm\(\) and satellite\(\)/);
		});

		it("target 'npm' is the default and unchanged", () => {
			expect(osm.toCode({ theme: 'gray' }, { target: 'npm' })).toBe(osm.toCode({ theme: 'gray' }));
		});
	});
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fetchTileJSON, inlineSources } from '../lib/index.js';
import { v5ColorKeys } from '../options/index.js';
import { osm } from '../index.js';
import { satellite } from '../index.js';

// Unknown option keys are rejected rather than silently ignored: a v5 option, a typo or a renamed v5
// colour key used to build the default style without a word. See src/options/validate.ts.
describe('unknown option keys are rejected', () => {
	it('accepts everything the library itself resolves', () => {
		expect(() => osm(osm.defaults)).not.toThrow();
		expect(() => satellite(satellite.defaults)).not.toThrow();
	});

	it('accepts the optional keys that defaults leave out', () => {
		expect(() =>
			osm({
				urls: { base: 'https://tiles.example.org' },
				sky: { skyColor: '#010203', horizonColor: '#ffffff' },
				features: {
					terrain: { exaggeration: 2 },
					hillshade: {
						exaggeration: 1,
						shadowColor: '#000',
						highlightColor: '#fff',
						accentColor: '#000',
						anchor: 'viewport',
					},
					buildings: 'extruded',
				},
				layers: { icons: false, roads: { streets: { bus: 0.5 } } },
			})
		).not.toThrow();
		expect(() =>
			satellite({ urls: { satellite: 'https://x.org/tiles.json' }, osmOverlay: { layers: false } })
		).not.toThrow();
	});

	it('does not look inside a pre-fetched TileJSON, whose fields are not options', () => {
		const tileJSON = { tilejson: '3.0.0', tiles: ['https://x.org/{z}/{x}/{y}'], vector_layers: [], custom_field: 1 };
		expect(() => osm({ urls: { osm: tileJSON as never } })).not.toThrow();
	});

	it('ignores keys set to undefined, which carry no intent', () => {
		expect(() => osm({ textScale: undefined } as never)).not.toThrow();
	});

	it('names the v6 replacement for a v5 option', () => {
		expect(() => osm({ textScale: 2 } as never)).toThrow(
			'osm: unknown option "textScale" — in v6 this is "text.scale"'
		);
		expect(() => osm({ recolor: { rotate: 90 } } as never)).toThrow(
			'"recolor.rotate" — in v6 this is "recolor.rotateHue"'
		);
		expect(() => osm({ colors: { wood: '#ff0000' } } as never)).toThrow(
			'"colors.wood" — in v6 this is "colors.natureWood"'
		);
	});

	it('names v6 replacements for satellite, including inside the overlay', () => {
		expect(() => satellite({ overlay: false } as never)).toThrow(
			'satellite: unknown option "overlay" — in v6 this is "osmOverlay"'
		);
		expect(() => satellite({ rasterOpacity: 0.5 } as never)).toThrow('in v6 this is "raster.opacity"');
		expect(() => satellite({ osmOverlay: { colors: { wood: '#ff0000' } } } as never)).toThrow(
			'"osmOverlay.colors.wood" — in v6 this is "osmOverlay.colors.natureWood"'
		);
	});

	it('says when a v5 option has no replacement', () => {
		expect(() => osm({ bounds: [0, 0, 1, 1] } as never)).toThrow('osm: unknown option "bounds" was removed in v6');
	});

	it('lists the known keys for anything else, such as a typo', () => {
		expect(() => osm({ layers: { roads: { streets: { living: false } } } } as never)).toThrow(
			'osm: unknown option "layers.roads.streets.living" — known keys here: residential, service, pedestrian, track, bus'
		);
	});

	it('points at the migration guide for a v5 name, but not for a typo', () => {
		const guide = 'See "Migration from v5" in API_DESIGN.md.';
		expect(() => osm({ textScale: 2 } as never)).toThrow(guide);
		expect(() => osm({ bounds: [0, 0, 1, 1] } as never)).toThrow(guide);
		expect(() => satellite({ rasterOpacity: 0.5 } as never)).toThrow(guide);
		// A typo is not a migration problem, so the guide would only be noise.
		expect(() => osm({ txtScale: 2 } as never)).not.toThrow(guide);
		// One v5 name among several unknown keys is enough to earn the pointer.
		expect(() => osm({ textScale: 2, nope: 1 } as never)).toThrow(guide);
	});

	it('names the replacement for an option renamed before 6.0.0, without pointing at the v5 guide', () => {
		const message = (run: () => unknown) => {
			try {
				run();
			} catch (error) {
				return (error as Error).message;
			}
			return '';
		};
		expect(message(() => osm({ layout: { scale: 2 } } as never))).toBe(
			'osm: unknown option "layout" — this is now "text.scale, text.spacing, text.pitchAlignment, icon.scale and icon.spacing"'
		);
		expect(message(() => osm({ text: { fonts: 'x' } } as never))).toBe(
			'osm: unknown option "text.fonts" — this is now "text.font, on the root or on any group or topic of text"'
		);
		expect(message(() => osm({ text: { streets: { default: 'x' } } } as never))).toBe(
			'osm: unknown option "text.streets.default" — this is now "text.streets.font"'
		);
		expect(message(() => satellite({ osmOverlay: { layout: {} } } as never))).toContain(
			'"osmOverlay.layout" — this is now "osmOverlay.text.scale'
		);
	});

	// Each resolver checks its own object, so the keys of one object are reported together; a nested
	// object is only reached once its parent is clean.
	it('reports every unknown key of an options object in one error', () => {
		expect(() => osm({ textScale: 2, baseUrl: 'x', bounds: [0, 0, 1, 1], colors: { wood: '#f00' } } as never)).toThrow(
			'osm: 3 unknown options\n' +
				'  "textScale" — in v6 this is "text.scale"\n' +
				'  "baseUrl" — in v6 this is "urls.base"\n' +
				'  "bounds" was removed in v6'
		);
	});

	it('is enforced by every function that takes options', async () => {
		expect(() => osm({ urls: { fetch: globalThis.fetch } } as never)).toThrow('osm: unknown option "urls.fetch"');
		const bad = { textScale: 2 } as never;
		expect(() => osm.resolveOptions(bad)).toThrow('unknown option');
		expect(() => osm.minimizeOptions(bad)).toThrow('unknown option');
		expect(() => osm.toCode(bad)).toThrow('unknown option');
		expect(() => satellite.resolveOptions(bad)).toThrow('unknown option');
		expect(() => satellite.minimizeOptions(bad)).toThrow('unknown option');
		expect(() => satellite.toCode(bad)).toThrow('unknown option');
		await expect(inlineSources(osm(), { fetsh: globalThis.fetch } as never)).rejects.toThrow(
			'inlineSources: unknown option "fetsh" — known keys here: fetch'
		);
		await expect(fetchTileJSON('https://x.org/tiles.json', { fetsh: globalThis.fetch } as never)).rejects.toThrow(
			'fetchTileJSON: unknown option "fetsh"'
		);
	});
});

describe('v5 colour key hints', () => {
	it('cover the 34 renamed v5 keys, each to a distinct v6 key', () => {
		const targets = Object.values(v5ColorKeys());
		expect(targets).toHaveLength(34);
		expect(new Set(targets).size).toBe(34);
		for (const key of targets) expect(osm.colorKeys).toContain(key);
	});

	// The rename table in API_DESIGN.md is written for people; the hints are the same mapping for
	// the error messages. Keep the two from drifting apart.
	it('match the rename table in API_DESIGN.md', () => {
		const doc = readFileSync(new URL('../../API_DESIGN.md', import.meta.url), 'utf8');
		const start = doc.indexOf('**Colour keys were renamed.**');
		expect(start).toBeGreaterThan(-1);
		const lines = doc.slice(start).split('\n');
		const header = lines.findIndex((line) => /^\|\s*v5\s*\|\s*v6\s*\|/.test(line));
		const rows: Record<string, string> = {};
		for (const line of lines.slice(header + 2)) {
			const m = /^\|\s*`(\w+)`\s*\|\s*`(\w+)`\s*\|\s*$/.exec(line);
			if (!m) break;
			rows[m[1]] = m[2];
		}
		expect(rows).toEqual(v5ColorKeys());
	});
});

// A non-finite number serialises to `null`, so one that survived resolution reached the built style
// as `"raster-opacity": null`, `light.position: [1.15, 210, null]`, `terrain.exaggeration: null`, or
// an `interpolate` ramp with `null` outputs — each a style MapLibre rejects, with nothing naming the
// option responsible. `NaN` is what an empty numeric input field yields (`parseFloat('')`), so a UI
// reaches this without doing anything unusual.
describe('non-finite numbers are rejected', () => {
	const cases: [string, () => unknown][] = [
		['osm.layers.buildings', () => osm({ layers: { buildings: NaN } })],
		['osm.layers', () => osm({ layers: NaN })],
		['osm.sun.altitude', () => osm({ sun: { altitude: NaN } })],
		['osm.sun.direction', () => osm({ sun: { direction: Infinity } })],
		['osm.icon.scale', () => osm({ icon: { scale: NaN } })],
		['osm.features.terrain.exaggeration', () => osm({ features: { terrain: { exaggeration: NaN } } })],
		['osm.features.hillshade.exaggeration', () => osm({ features: { hillshade: { exaggeration: -Infinity } } })],
		['satellite.raster.opacity', () => satellite({ raster: { opacity: NaN } })],
		// `recolor` and `sky` had no `checkFinite` at all. NaN reached the colour transforms, where
		// `clamp` maps it to the *minimum* — `brightness` rendered the whole map black, `gamma` white,
		// `contrast` mid-grey — and a non-finite sky blend serialised to `null`, i.e. invalid StyleJSON.
		['osm.recolor.rotateHue', () => osm({ recolor: { rotateHue: NaN } })],
		['osm.recolor.saturate', () => osm({ recolor: { saturate: NaN } })],
		['osm.recolor.brightness', () => osm({ recolor: { brightness: NaN } })],
		['osm.recolor.contrast', () => osm({ recolor: { contrast: Infinity } })],
		['osm.recolor.gamma', () => osm({ recolor: { gamma: -Infinity } })],
		['osm.recolor.tint.amount', () => osm({ recolor: { tint: { color: '#00ff00', amount: NaN } } })],
		['osm.recolor.blend.amount', () => osm({ recolor: { blend: { color: '#00ff00', amount: NaN } } })],
		['osm.sky.atmosphereBlend', () => osm({ sky: { atmosphereBlend: NaN } })],
		['osm.sky.fogGroundBlend', () => osm({ sky: { fogGroundBlend: NaN } })],
		['osm.sky.horizonFogBlend', () => osm({ sky: { horizonFogBlend: NaN } })],
		['osm.sky.skyHorizonBlend', () => osm({ sky: { skyHorizonBlend: NaN } })],
	];

	for (const [path, build] of cases) {
		it(`rejects ${path}`, () => {
			// A string matcher is a literal substring match, which is what building a regex and escaping
			// the dots was approximating — and it cannot be an incomplete escape, which that was: it
			// replaced `.` but not `\`, so a path containing a backslash would have compiled to a
			// different pattern than the one intended (CodeQL js/incomplete-sanitization).
			expect(build).toThrow(path);
		});
	}

	it('still accepts the finite values around the boundaries', () => {
		expect(() => osm({ layers: { buildings: 0 } })).not.toThrow();
		expect(() => osm({ layers: { buildings: 1 } })).not.toThrow();
		expect(() => osm({ layers: { buildings: 0.5 } })).not.toThrow();
		expect(() => osm({ sun: { altitude: 0, direction: 360 } })).not.toThrow();
		expect(() =>
			osm({
				recolor: { brightness: 0.5, gamma: 2, contrast: 0, rotateHue: 180, saturate: -1 },
				sky: { atmosphereBlend: 0, skyHorizonBlend: 1 },
			})
		).not.toThrow();
	});
});

// Colour options were the one part of the surface no resolver looked at: the value was copied through
// and the first `Color.parse` happened deep in layer building, so the builder threw an error naming only
// the string while `validateOptions` of the same object answered `{ ok: true }`. See options/parts/color-check.ts.
describe('unparseable colours are rejected', () => {
	const cases: [string, () => unknown][] = [
		['osm.colors.water', () => osm({ colors: { water: 'bananas' } })],
		['osm.sun.color', () => osm({ sun: { color: 'not-a-colour' } })],
		['osm.sky.fogColor', () => osm({ sky: { fogColor: 'nope' } })],
		['osm.sky.horizonColor', () => osm({ sky: { horizonColor: 'nope' } })],
		['osm.sky.skyColor', () => osm({ sky: { skyColor: 'nope' } })],
		['osm.features.hillshade.shadowColor', () => osm({ features: { hillshade: { shadowColor: 'zzz' } } })],
		['osm.features.hillshade.highlightColor', () => osm({ features: { hillshade: { highlightColor: 'zzz' } } })],
		['osm.features.hillshade.accentColor', () => osm({ features: { hillshade: { accentColor: 'zzz' } } })],
		['osm.recolor.tint.color', () => osm({ recolor: { tint: { color: 'xxx', amount: 0.5 } } })],
		['osm.recolor.blend.color', () => osm({ recolor: { blend: { color: 'yyy', amount: 0.5 } } })],
		['satellite.osmOverlay.colors.water', () => satellite({ osmOverlay: { colors: { water: 'bananas' } } })],
	];

	// The builder threw before this change too — `Color.parse` reached the value eventually — but named
	// only the string. What is pinned here is that the error names the *option*, so the message says
	// which field to fix.
	for (const [path, build] of cases) {
		it(`names ${path} in the thrown error`, () => {
			expect(build).toThrow(path);
		});
	}

	it('reports them as issues rather than throwing, one per bad colour', () => {
		const result = osm.validateOptions({
			colors: { water: 'bananas', land: 'pears' },
			sun: { color: 'zzz' },
		});
		expect(result.ok).toBe(false);
		expect(result.issues.map((issue) => issue.path).sort()).toStrictEqual(['colors.land', 'colors.water', 'sun.color']);
	});

	it('still accepts every colour syntax the library parses', () => {
		expect(() =>
			osm({
				colors: { water: '#abc', land: '#aabbccdd', glacier: 'rgb(1,2,3)', building: 'hsl(1,2%,3%)' },
				sun: { color: 'oklch(0.7 0.1 45)' },
				recolor: { tint: { color: 'rgba(1,2,3,0.5)', amount: 0.5 } },
			})
		).not.toThrow();
	});

	// A colour that cannot be parsed falls back to the palette's own, so the pass continues and reaches
	// the rest of the tree instead of stopping at the first bad key.
	it('does not stop the pass at the first bad colour', () => {
		const result = osm.validateOptions({ colors: { water: 'bananas' }, sun: { altitude: NaN } });
		expect(result.ok).toBe(false);
		expect(result.issues.map((issue) => issue.path).sort()).toStrictEqual(['colors.water', 'sun.altitude']);
	});
});

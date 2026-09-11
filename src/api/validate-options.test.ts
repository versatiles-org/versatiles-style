import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fetchTileJSON, inlineSources } from '../lib/index.js';
import { v5ColorKeys } from '../options/v5-hints.js';
import { osm } from './osm.js';
import { satellite } from './satellite.js';

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
			'osm: unknown option "textScale" — in v6 this is "layout.scale.labels"'
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

	// Each resolver checks its own object, so the keys of one object are reported together; a nested
	// object is only reached once its parent is clean.
	it('reports every unknown key of an options object in one error', () => {
		expect(() => osm({ textScale: 2, baseUrl: 'x', bounds: [0, 0, 1, 1], colors: { wood: '#f00' } } as never)).toThrow(
			'osm: 3 unknown options\n' +
				'  "textScale" — in v6 this is "layout.scale.labels"\n' +
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

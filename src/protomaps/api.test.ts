import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { protomaps } from './api.js';
import { PROTOMAPS_SCHEMA } from './schema.js';
import { osm } from '../index.js';

// The counterpart of `src/omt/api.test.ts`: the same four properties one-function-per-subpath claims
// — bundle isolation, purity, per-schema validation, runnable codegen — asserted for this schema too,
// plus the one thing no other schema has to answer for, the required tile source.
//
// This file exists because `@versatiles/style/protomaps` shipped without it: the subpath's whole API
// surface — `toCode`, `minimizeOptions`, `resolveOptions`, `tileset.build` and the required-URL error
// — had no test at all, while `omt` had twenty-odd. The layer modules were covered; the entry point
// was not.

/** Protomaps has no default tileset, so every call has to name one. */
const ARCHIVE = 'pmtiles://https://example.org/x.pmtiles';
const pm = (options = {}): ReturnType<typeof protomaps> => protomaps({ urls: { protomaps: ARCHIVE }, ...options });

describe('protomaps()', () => {
	it('builds a style from the Protomaps source', () => {
		const style = pm();
		expect(style.version).toBe(8);
		expect(Object.keys(style.sources)).toEqual(['protomaps']);
		expect(style.layers.length).toBeGreaterThan(200);
	});

	it('is a pure function of its options — no registration, no shared state', () => {
		expect(JSON.stringify(pm({ theme: 'muted' }))).toBe(JSON.stringify(pm({ theme: 'muted' })));
		expect(JSON.stringify(pm({ theme: 'muted' }))).not.toBe(JSON.stringify(pm({ theme: 'colorful' })));
	});

	it('reads the archive it was given', () => {
		expect(JSON.stringify(pm().sources.protomaps)).toContain('example.org');
	});
});

// The one schema with no default tileset. Protomaps ships a PMTiles archive rather than a hosted
// endpoint and its docs discourage hotlinking the daily builds, so there is nothing sensible to
// default to — and a style pointing at a placeholder would 404 silently at the first tile request.
describe('the required tile source', () => {
	it('throws when `urls.protomaps` is missing, naming the fix', () => {
		expect(() => protomaps()).toThrow(/urls\.protomaps is required/);
		expect(() => protomaps({})).toThrow(/urls\.protomaps is required/);
		// The message carries the shape of the value it wants, not just the name of the key.
		expect(() => protomaps()).toThrow(/pmtiles:\/\//);
	});

	it('still lets `defaults`, `resolveOptions` and `minimizeOptions` work without one', () => {
		// Refused in the builder rather than the resolver precisely so these stay usable: a style
		// editor has to be able to show the defaults before the user has chosen an archive.
		expect(() => protomaps.defaults).not.toThrow();
		expect(() => protomaps.resolveOptions()).not.toThrow();
		expect(() => protomaps.minimizeOptions()).not.toThrow();
		expect(protomaps.defaults.theme).toBe('colorful');
	});
});

describe('validation is per schema', () => {
	it('rejects `urls.osm`, which this schema names `urls.protomaps`', () => {
		expect(() => protomaps({ urls: { osm: 'https://example.org/x.json' } } as never)).toThrow(/urls\.osm/);
	});

	it('rejects an unknown option key', () => {
		expect(() => pm({ textScale: 2 } as never)).toThrow(/textScale/);
	});

	it('shares the whole neutral option vocabulary with osm()', () => {
		expect(() =>
			pm({
				theme: 'natural',
				colors: { water: '#123456' },
				recolor: { saturate: 0.1 },
				icon: { scale: 1.2 },
				text: { language: 'de', scale: 1.2 },
				layers: { labels: false },
				sky: true,
				projection: 'globe',
			})
		).not.toThrow();
	});
});

describe('statics', () => {
	it('carries its own layer-group map, built from its own layers', () => {
		const groups = protomaps.layerGroups;
		expect((groups.buildings as string[]).length).toBeGreaterThan(0);
		// Not Shortbread's map. Many road ids *are* shared — both schemas name a residential street
		// the same thing — so the tell is a layer only this schema emits: its coarse low-zoom
		// landcover band, which Shortbread carries as a tileset extension instead.
		expect(JSON.stringify(groups)).toContain('land-lowzoom-forest');
		expect(JSON.stringify(osm.layerGroups)).not.toContain('land-lowzoom-forest');
		expect(JSON.stringify(groups)).not.toBe(JSON.stringify(osm.layerGroups));
	});

	it('emits the same four slot anchors as every other schema', () => {
		expect(protomaps.slots).toEqual(osm.slots);
	});

	it('shares the palette statics, which are schema-neutral', () => {
		expect(protomaps.palettes).toEqual(osm.palettes);
		expect(protomaps.colorKeys).toEqual(osm.colorKeys);
	});

	it('has no `supportsLandcover` — that is a Shortbread tileset question', () => {
		expect('supportsLandcover' in protomaps).toBe(false);
		expect('supportsLandcover' in osm).toBe(true);
	});

	it('reads the colon name convention in `languages`, which is the only one Protomaps uses', () => {
		const tileJSON = {
			tilejson: '3.0.0',
			tiles: [],
			vector_layers: [{ id: 'places', fields: { name: 'x', 'name:de': 'x', 'name:fr': 'x' } }],
		};
		expect(protomaps.languages(tileJSON as never)).toEqual(['de', 'fr']);
	});

	it('hands out frozen statics, like every other entry', () => {
		expect(Object.isFrozen(protomaps.palettes)).toBe(true);
		expect(Object.isFrozen(protomaps.slots)).toBe(true);
		expect(Object.isFrozen(protomaps.layerGroups)).toBe(true);
	});
});

describe('minimizeOptions()', () => {
	it('drops everything that equals a default, but never the archive', () => {
		// The archive has no default, so it can never be dropped — a minimized options object still
		// has to build.
		expect(protomaps.minimizeOptions({ theme: 'colorful', urls: { protomaps: ARCHIVE } })).toEqual({
			urls: { protomaps: ARCHIVE },
		});
	});

	it('round-trips: the minimized options build the same style', () => {
		const options = { theme: 'muted', text: { language: 'de' }, urls: { protomaps: ARCHIVE } } as const;
		const minimized = protomaps.minimizeOptions(options);
		expect(JSON.stringify(protomaps(minimized))).toBe(JSON.stringify(protomaps(options)));
	});

	it('rejects an unknown key rather than silently minimizing it away', () => {
		expect(() => protomaps.minimizeOptions({ nope: 1 } as never)).toThrow(/nope/);
	});
});

describe('toCode()', () => {
	it('emits the subpath import, so the snippet runs where it is pasted', () => {
		const code = protomaps.toCode({ theme: 'muted', urls: { protomaps: ARCHIVE } });
		expect(code).toContain("import { protomaps } from '@versatiles/style/protomaps';");
		expect(code).toContain("import { inlineSources } from '@versatiles/style';");
		expect(code).toContain('protomaps({');
	});

	it('carries the archive through, so the snippet does not throw when run', () => {
		expect(protomaps.toCode({ urls: { protomaps: ARCHIVE } })).toContain(ARCHIVE);
	});
});

describe('bundle isolation', () => {
	// As for `omt`: the claim is that the CDN bundle cannot contain another schema, and that the import
	// graph is what enforces it rather than a build flag. So walk the graph.
	const SRC = resolve(dirname(new URL(import.meta.url).pathname), '..');

	function reachableFrom(entry: string): Set<string> {
		const seen = new Set<string>();
		const queue = [resolve(SRC, entry)];
		while (queue.length > 0) {
			const file = queue.pop()!;
			if (seen.has(file)) continue;
			seen.add(file);
			const source = readFileSync(file, 'utf8');
			for (const match of source.matchAll(/from\s+'(\.[^']+)'/g)) {
				const target = resolve(dirname(file), match[1].replace(/\.js$/, '.ts'));
				const file2 = existsSync(target) && statSync(target).isDirectory() ? resolve(target, 'index.ts') : target;
				if (existsSync(file2) && statSync(file2).isFile()) queue.push(file2);
			}
		}
		return seen;
	}

	it('the root entry does not reach any Protomaps module', () => {
		const files = [...reachableFrom('index.ts')].filter((f) => f.includes(`${'/'}protomaps${'/'}`));
		expect(files.map((f) => f.slice(SRC.length + 1))).toEqual([]);
	});

	it('the protomaps entry does reach them, so the walk means something', () => {
		const files = [...reachableFrom('protomaps/index.ts')].filter((f) => f.includes(`${'/'}protomaps${'/'}`));
		expect(files.length).toBeGreaterThan(5);
	});
});

describe('guessStyle injection', () => {
	const protomapsTiles = {
		tilejson: '3.0.0',
		tiles: ['https://example.org/{z}/{x}/{y}.pbf'],
		vector_layers: Object.keys(PROTOMAPS_SCHEMA).map((id) => ({ id })),
	};
	const shortbreadTiles = {
		tilejson: '3.0.0',
		tiles: ['https://example.org/{z}/{x}/{y}.pbf'],
		vector_layers: [{ id: 'water_polygons' }, { id: 'streets' }, { id: 'buildings' }, { id: 'place_labels' }],
	};

	it('falls back to the inspector style for Protomaps tiles when nothing is injected', async () => {
		const { guessStyle } = await import('../api/index.js');
		const style = await guessStyle(protomapsTiles as never);
		expect(style.layers.length).toBe(protomapsTiles.vector_layers.length * 3 + 1);
		expect(Object.keys(style.sources)).toEqual(['tiles']);
	});

	// `tileset.build` — the descriptor `guessStyle` calls once it has recognised the tileset. It is the
	// only path that reaches `protomaps()` without a caller-written `urls.protomaps`, so it is also the
	// proof that the detected source is threaded through rather than the (absent) default used.
	it('builds a real Protomaps style once `protomaps` is injected', async () => {
		const { guessStyle } = await import('../api/index.js');
		const style = await guessStyle(protomapsTiles as never, { schemas: [protomaps] });
		expect(style.layers.length).toBeGreaterThan(200);
		expect(Object.keys(style.sources)).toEqual(['protomaps']);
		expect(JSON.stringify(style.sources.protomaps)).toContain('example.org');
	});

	it('is additive — Shortbread still wins for Shortbread tiles', async () => {
		const { guessStyle } = await import('../api/index.js');
		const withPm = await guessStyle(shortbreadTiles as never, { schemas: [protomaps] });
		const without = await guessStyle(shortbreadTiles as never);
		expect(JSON.stringify(withPm)).toBe(JSON.stringify(without));
		expect(Object.keys(withPm.sources)).toEqual(['versatiles-shortbread']);
	});
});

// `features.terrain` and `features.hillshade` add top-level blocks and a layer respectively. Neither
// path was exercised for this schema, so neither was the elevation URL they both read.
describe('elevation features', () => {
	it('adds a terrain block reading the elevation source', () => {
		const style = pm({ features: { terrain: true } });
		expect(style.terrain).toBeDefined();
		expect(Object.keys(style.sources)).toContain('elevation');
	});

	it('adds a hillshade layer', () => {
		const style = pm({ features: { hillshade: true } });
		expect(style.layers.some((l) => l.type === 'hillshade')).toBe(true);
	});

	it('draws neither by default', () => {
		const style = pm();
		expect(style.terrain).toBeUndefined();
		expect(style.layers.some((l) => l.type === 'hillshade')).toBe(false);
	});
});

describe('sky and recolor', () => {
	it('emits a sky block by default and omits it when switched off', () => {
		expect(pm().sky).toBeDefined();
		expect(pm({ sky: false }).sky).toBeUndefined();
	});

	it('applies recolor to the built style', () => {
		const plain = pm();
		const inverted = pm({ recolor: { invertBrightness: true } });
		expect(JSON.stringify(inverted)).not.toBe(JSON.stringify(plain));
	});
});

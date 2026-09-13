import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { omt } from './api.js';
import { osm } from '../api/index.js';

// The four properties SCHEMA-SUPPORT-PLAN.md §5.3 claims for one-function-per-subpath, each asserted
// rather than argued: bundle isolation, purity, per-schema validation, runnable codegen.

describe('omt()', () => {
	it('builds a style from the OpenMapTiles source', () => {
		const style = omt();
		expect(style.version).toBe(8);
		expect(Object.keys(style.sources)).toEqual(['openmaptiles']);
		expect(style.layers.length).toBeGreaterThan(200);
	});

	it('is a pure function of its options — no registration, no shared state', () => {
		// The registry design §5.2 rejected would have made this depend on what had been registered.
		expect(JSON.stringify(omt({ theme: 'muted' }))).toBe(JSON.stringify(omt({ theme: 'muted' })));
		expect(JSON.stringify(omt({ theme: 'muted' }))).not.toBe(JSON.stringify(omt({ theme: 'colorful' })));
	});

	it('defaults its tile source to OpenFreeMap, not to the VersaTiles base', () => {
		// The CDN serves Shortbread (§5.5), so there is nothing behind `base` for this schema to read.
		expect(JSON.stringify(omt().sources.openmaptiles)).toContain('tiles.openfreemap.org');
		// Everything that is the *style's* asset rather than the tileset's still comes from `base`.
		expect(omt().glyphs).toContain('versatiles.org');
	});

	it('accepts a caller-supplied tileset', () => {
		const style = omt({ urls: { omt: 'https://example.org/omt.json' } });
		expect(JSON.stringify(style.sources.openmaptiles)).toContain('example.org');
	});
});

describe('validation is per schema', () => {
	it('rejects `features.landcover`, which is a Shortbread tileset extension', () => {
		// §5.3: a concept this schema cannot express is an unknown key that throws, never an option that
		// silently does nothing (risk 3).
		expect(() => omt({ features: { landcover: true } } as never)).toThrow(/features\.landcover/);
		// …and it stays valid on the schema that does have it.
		expect(() => osm({ features: { landcover: true } })).not.toThrow();
	});

	it('rejects `urls.osm`, which this schema names `urls.omt`', () => {
		expect(() => omt({ urls: { osm: 'https://example.org/x.json' } } as never)).toThrow(/urls\.osm/);
	});

	it('shares the whole neutral option vocabulary with osm()', () => {
		expect(() =>
			omt({
				theme: 'natural',
				colors: { water: '#123456' },
				recolor: { saturate: 0.1 },
				layout: { scale: { labels: 1.2 } },
				text: { language: 'de' },
				layers: { labels: false },
				sky: true,
				projection: 'globe',
			})
		).not.toThrow();
	});
});

describe('statics', () => {
	it('carries its own layer-group map, built from its own layers', () => {
		const groups = omt.layerGroups;
		// Not Shortbread's map: the ids inside are this schema's.
		expect((groups.buildings as string[]).length).toBeGreaterThan(0);
		expect(JSON.stringify(groups)).not.toContain('street-residential');
		expect(JSON.stringify(groups)).toContain('street-minor');
	});

	it('emits the same four slot anchors as every other schema (§6)', () => {
		expect(omt.slots).toEqual(osm.slots);
	});

	it('shares the palette statics, which are schema-neutral', () => {
		expect(omt.palettes).toEqual(osm.palettes);
		expect(omt.colorKeys).toEqual(osm.colorKeys);
	});

	it('has no `supportsLandcover` — that is a Shortbread tileset question', () => {
		expect('supportsLandcover' in omt).toBe(false);
		expect('supportsLandcover' in osm).toBe(true);
	});

	it('reads both name-field conventions in `languages`', () => {
		const tileJSON = {
			tilejson: '3.0.0',
			tiles: [],
			vector_layers: [{ id: 'place', fields: { name: 'x', name_de: 'x', 'name:fr': 'x', class: 'x' } }],
		};
		expect(omt.languages(tileJSON as never)).toEqual(['de', 'fr']);
	});
});

describe('toCode()', () => {
	it('emits the subpath import, so the snippet runs where it is pasted', () => {
		// §5.2's first objection to a registry: its `toCode` output would have lacked exactly this line.
		const code = omt.toCode({ theme: 'muted' });
		expect(code).toContain("import { omt } from '@versatiles/style/omt';");
		expect(code).toContain("import { inlineSources } from '@versatiles/style';");
		expect(code).toContain('omt({');
	});

	it('leaves osm’s single-line import alone', () => {
		expect(osm.toCode({ theme: 'muted' })).toContain("import { osm, inlineSources } from '@versatiles/style';");
	});
});

describe('bundle isolation (§5.3)', () => {
	// The claim is that the CDN bundle cannot contain another schema, and that no build flag enforces
	// it — the import graph does. So the graph is what this walks: from `src/index.ts`, following every
	// relative import, nothing under `src/omt/` may be reachable. A stray re-export from the root entry
	// would add ~12 KB gzip to every map that loads the browser build.
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
				if (existsSync(target)) queue.push(target);
			}
		}
		return seen;
	}

	it('the root entry does not reach any OpenMapTiles module', () => {
		const omtFiles = [...reachableFrom('index.ts')].filter((f) => f.includes(`${'/'}omt${'/'}`));
		expect(omtFiles.map((f) => f.slice(SRC.length + 1))).toEqual([]);
	});

	it('the root entry does not reach any other schema’s modules either', () => {
		// The check above was once passing while `src/options/omt.ts` and `src/options/protomaps.ts` sat in
		// the shared options barrel — reachable from the root, and so in the CDN bundle. Per-schema option
		// code now lives in each schema's own directory, and this asserts the whole rule rather than one
		// directory's worth of it.
		const reachable = [...reachableFrom('index.ts')].map((f) => f.slice(SRC.length + 1));
		const perSchema = reachable.filter((f) => f.startsWith('omt/') || f.startsWith('protomaps/'));
		expect(perSchema).toEqual([]);
	});

	it('the omt entry does reach them, so the walk means something', () => {
		const omtFiles = [...reachableFrom('omt/index.ts')].filter((f) => f.includes(`${'/'}omt${'/'}`));
		expect(omtFiles.length).toBeGreaterThan(5);
	});
});

describe('guessStyle injection (§5.3, risk 10)', () => {
	// Auto-dispatch is the one thing one-function-per-subpath does not get for free: `guessStyle` lives
	// in the root entry, so it cannot import every schema without reintroducing the bundle cost the
	// design exists to avoid. The caller injects instead, and pays only for what they import.
	const omtTiles = {
		tilejson: '3.0.0',
		tiles: ['https://example.org/{z}/{x}/{y}.pbf'],
		vector_layers: [{ id: 'water' }, { id: 'waterway' }, { id: 'transportation' }, { id: 'place' }],
	};
	const shortbreadTiles = {
		tilejson: '3.0.0',
		tiles: ['https://example.org/{z}/{x}/{y}.pbf'],
		vector_layers: [{ id: 'water_polygons' }, { id: 'streets' }, { id: 'buildings' }, { id: 'place_labels' }],
	};

	it('falls back to the inspector style for OpenMapTiles tiles when nothing is injected', async () => {
		const { guessStyle } = await import('../api/index.js');
		const style = await guessStyle(omtTiles as never);
		// One colour-coded fill+line+symbol per source-layer, over a background — not a real map.
		expect(style.layers.length).toBe(omtTiles.vector_layers.length * 3 + 1);
		expect(Object.keys(style.sources)).toEqual(['tiles']);
	});

	it('builds a real OpenMapTiles style once `omt` is injected', async () => {
		const { guessStyle } = await import('../api/index.js');
		const style = await guessStyle(omtTiles as never, { schemas: [omt] });
		expect(style.layers.length).toBeGreaterThan(200);
		expect(Object.keys(style.sources)).toEqual(['openmaptiles']);
		// The detected tileset is what the style reads, not the schema's default tile source.
		expect(JSON.stringify(style.sources.openmaptiles)).toContain('example.org');
	});

	it('is additive — Shortbread still wins for Shortbread tiles', async () => {
		const { guessStyle } = await import('../api/index.js');
		const withOmt = await guessStyle(shortbreadTiles as never, { schemas: [omt] });
		const without = await guessStyle(shortbreadTiles as never);
		expect(JSON.stringify(withOmt)).toBe(JSON.stringify(without));
		expect(Object.keys(withOmt.sources)).toEqual(['versatiles-shortbread']);
	});

	it('rejects an unknown option key, as every other entry point does', async () => {
		const { guessStyle } = await import('../api/index.js');
		// guessStyle never throws; an invalid argument yields a blank style.
		const style = await guessStyle(omtTiles as never, { schemata: [omt] } as never);
		expect(style).toEqual({ version: 8, sources: {}, layers: [] });
	});
});

describe('omt() subway stations', () => {
	it('draws them like stations, from z13, as Shortbread files them as stations', () => {
		const layers = omt().layers as { id: string; minzoom?: number; layout?: Record<string, unknown> }[];
		const subway = layers.find((l) => l.id === 'symbol-transit-subway')!;
		const station = layers.find((l) => l.id === 'symbol-transit-station')!;
		expect(subway.minzoom).toBe(13);
		expect(subway.minzoom).toBe(station.minzoom);
		expect(subway.layout?.['icon-size']).toEqual(station.layout?.['icon-size']);
	});
});

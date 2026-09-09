import { describe, expect, it } from 'vitest';

describe('nodejs', () => {
	it('should return a style object', async () => {
		const { osm } = await import('../dist/index.js');

		expect(osm).toBeDefined();
		// Inject a fetch so the default TileJSON source resolves offline/deterministically.
		const fetch = async () =>
			new Response(JSON.stringify({ tiles: ['{z}/{x}/{y}'], minzoom: 0, maxzoom: 14 }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		const style = await osm({ theme: 'colorful', urls: { fetch } });
		expect(style.version).toBe(8);
		expect(Array.isArray(style.layers)).toBe(true);
		expect(style.layers.length).toBeGreaterThan(0);
		expect(typeof style.sources).toBe('object');
		expect(style.glyphs).toContain('{fontstack}');
	});
});

// The published package is `dist/*` only. Anything the shipped .d.ts imports must therefore be a
// runtime `dependency` — a devDependency is not installed for consumers, so a TypeScript consumer
// would get "Cannot find module". The test above cannot catch this: it imports dist from inside the
// repo, where devDependencies do resolve.
describe('published package', () => {
	it('every module the shipped types import is a declared dependency', async () => {
		const { readFileSync } = await import('node:fs');
		const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
			dependencies?: Record<string, string>;
		};
		const declared = new Set(Object.keys(pkg.dependencies ?? {}));

		const dts = readFileSync(new URL('../dist/index.d.ts', import.meta.url), 'utf8');
		const specifiers = [...dts.matchAll(/from\s+'([^']+)'/g)]
			.map((m) => m[1])
			.filter((spec) => !spec.startsWith('.') && !spec.startsWith('node:'))
			// `@scope/name/sub` → `@scope/name`
			.map((spec) =>
				spec
					.split('/')
					.slice(0, spec.startsWith('@') ? 2 : 1)
					.join('/')
			);

		const undeclared = [...new Set(specifiers)].filter((spec) => !declared.has(spec));
		expect(undeclared, 'shipped types import packages that consumers will not have').toEqual([]);
	});
});

// The styles emit `projection: { type: 'globe' }`, which MapLibre GL JS only understands from 5.0.
// Declared optional: the package has no runtime dependency on MapLibre and works fine for anyone
// generating style JSON server-side, so it must never be auto-installed — only range-checked when
// the consumer already has it.
describe('maplibre-gl peer range', () => {
	it('is declared, optional, and requires >= 5', async () => {
		const { readFileSync } = await import('node:fs');
		const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
			peerDependencies?: Record<string, string>;
			peerDependenciesMeta?: Record<string, { optional?: boolean }>;
			dependencies?: Record<string, string>;
		};
		expect(pkg.peerDependencies?.['maplibre-gl']).toBe('>=5.0.0');
		expect(pkg.peerDependenciesMeta?.['maplibre-gl']?.optional).toBe(true);
		// A hard peer would drag ~800 KB of MapLibre into builds that never render a map.
		expect(pkg.dependencies?.['maplibre-gl']).toBeUndefined();
	});
});

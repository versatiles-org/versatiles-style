import { describe, expect, it } from 'vitest';

describe('nodejs', () => {
	it('should return a style object', async () => {
		const { osm } = await import('../dist/index.js');

		expect(osm).toBeDefined();
		// osm() does no I/O, so this runs offline as it is.
		const style = osm({ theme: 'colorful' });
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

		// Comments are stripped first: a doc example showing `import { omt } from '@versatiles/style/omt'`
		// is not a dependency, and reading one as though it were made this test fail on documentation.
		const dts = readFileSync(new URL('../dist/index.d.ts', import.meta.url), 'utf8').replace(
			/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
			''
		);
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

// The `exports` map is the package's public shape, and it is unforgiving: a subpath that resolves to
// a file the build does not emit fails only for consumers, after publication, and `files` silently
// decides whether the file ships at all. Adding a subpath means adding an entry to `ENTRIES` in
// rollup.config.js *and* a block here, so this test checks the two ended up agreeing —
// one subpath per schema is the whole API design.
describe('exports map', () => {
	it('resolves every subpath to a file the build actually emitted, with types beside it', async () => {
		const { readFileSync, existsSync } = await import('node:fs');
		const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
			exports?: Record<string, string | Record<string, string>>;
			main?: string;
			types?: string;
			sideEffects?: boolean;
		};
		const exists = (rel: string) => existsSync(new URL('../' + rel.replace(/^\.\//, ''), import.meta.url));

		const missing: string[] = [];
		for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
			if (typeof target === 'string') {
				if (!exists(target)) missing.push(`${subpath} → ${target}`);
				continue;
			}
			// `types` must be present and first: a consumer on `moduleResolution: bundler` reads the
			// conditions in order, and a types condition after `default` is never reached.
			expect(Object.keys(target)[0], `${subpath}: types must be the first condition`).toBe('types');
			for (const [condition, file] of Object.entries(target)) {
				if (!exists(file)) missing.push(`${subpath} [${condition}] → ${file}`);
			}
		}
		expect(missing, 'exports entries pointing at files the build did not emit').toEqual([]);

		// `main`/`types` stay for consumers on `moduleResolution: node10`, which cannot read `exports`.
		expect(pkg.main && exists(pkg.main), 'main').toBe(true);
		expect(pkg.types && exists(pkg.types), 'types').toBe(true);
		// Nothing in `src/` runs at import time, so bundlers may drop any entry a consumer never uses —
		// which is what keeps an unused schema subpath out of their bundle.
		expect(pkg.sideEffects).toBe(false);
	});

	it('ships every exported file inside the published `files` globs', async () => {
		const { readFileSync } = await import('node:fs');
		const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
			exports?: Record<string, string | Record<string, string>>;
			files?: string[];
		};
		// Only the shapes this package actually uses: a literal path, or a directory glob like `dist/*`.
		const shipped = (rel: string) => {
			const path = rel.replace(/^\.\//, '');
			return (pkg.files ?? []).some((glob) =>
				glob.endsWith('/*') ? path.startsWith(glob.slice(0, -1)) : glob === path
			);
		};
		const unshipped = Object.entries(pkg.exports ?? {})
			.flatMap(([subpath, target]) =>
				(typeof target === 'string' ? [target] : Object.values(target)).map((file) => ({ subpath, file }))
			)
			// package.json itself is always published, glob or not.
			.filter(({ file }) => file !== './package.json' && !shipped(file))
			.map(({ subpath, file }) => `${subpath} → ${file}`);
		expect(unshipped, 'exports entries that `files` would leave out of the tarball').toEqual([]);
	});

	// `files` is `dist/*`, which takes the whole directory — including anything the build meant to
	// clean up and did not. `build-node` removes `dist/declaration`, the per-module intermediate the
	// TypeScript plugin writes before `rollup-plugin-dts` flattens it; left behind it would add ~200
	// files of duplicate types to every install.
	//
	// That removal is `rm -r`, deliberately not `rm -rf`: `-f` exits 0 even when it could not delete
	// everything (verified — a permission error prints but does not fail), which would ship the tree
	// silently. This asserts the outcome rather than trusting the command, since the build step and
	// the `files` glob are edited in different places.
	it('leaves no intermediate declaration tree in dist', async () => {
		const { existsSync, readdirSync } = await import('node:fs');
		const dist = new URL('../dist/', import.meta.url);
		if (!existsSync(dist)) return; // nothing built yet; the exports test above already covers that
		expect(readdirSync(dist).filter((name) => name === 'declaration')).toEqual([]);
	});
});

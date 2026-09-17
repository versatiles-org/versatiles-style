import commonjs from '@rollup/plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps2';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import process from 'node:process';

const { BUILD } = process.env;
const browser = BUILD === 'browser';

/**
 * Published entry points, one per `exports` subpath in package.json.
 *
 * Adding a second schema (e.g. `@versatiles/style/omt`) means adding one
 * line here and one block to `exports`; nothing else in the build has to change. Rollup emits shared
 * code as common chunks, so a subpath only carries what the root entry does not already contain.
 *
 * The **browser** build stays single-entry by design: the UMD bundle is the CDN artifact and must
 * contain Shortbread only, which is what makes the per-schema bundle cost zero by construction
 * rather than by a build flag.
 */
const ENTRIES = [
	{ name: 'index', input: 'src/index.ts' },
	{ name: 'omt', input: 'src/omt/index.ts' },
	{ name: 'protomaps', input: 'src/protomaps/index.ts' },
	{ name: 'migrate', input: 'src/migrate/index.ts' },
];

// Where the TypeScript plugin writes an entry's declaration, mirroring `rootDir: src`.
const declarationOf = (input, dir) => `${dir}/${input.replace(/^src\//, '').replace(/\.ts$/, '.d.ts')}`;

const browserConfig = [
	{
		// `browser.ts`, not `index.ts`: the CDN bundle leaves out the authoring helpers
		// (`minimizeOptions`, `toCode`) that only a style editor needs — see that file.
		input: 'src/browser.ts',
		output: {
			file: 'release/versatiles-style/versatiles-style.js',
			format: 'umd',
			sourcemap: true,
			indent: false,
			name: 'VersaTilesStyle',
		},
		plugins: [
			terser({ compress: { pure_getters: true, passes: 3 }, sourceMap: true }),
			nodeResolve({ browser: true }),
			typescript({
				tsconfig: 'tsconfig.build.json',
				sourceMap: true,
				declaration: true,
				noEmit: true,
				outDir: 'release/versatiles-style',
				declarationDir: 'release/versatiles-style/declaration',
			}),
			commonjs(),
			sourcemaps(),
		],
		onLog(level, log, handler) {
			if (log.code === 'CIRCULAR_DEPENDENCY') return;
			handler(level, log);
		},
	},
	{
		// From the browser entry's declarations, so the shipped types describe what the bundle actually
		// has. Built from `index.d.ts` it would promise `minimizeOptions`/`toCode` that are not there.
		input: 'release/versatiles-style/declaration/browser.d.ts',
		output: { file: 'release/versatiles-style/versatiles-style.d.ts', format: 'es' },
		plugins: [dts()],
	},
];

const nodeConfig = [
	{
		input: Object.fromEntries(ENTRIES.map(({ name, input }) => [name, input])),
		// A declared dependency, installed beside the package: `migrate` evaluates expressions with it at
		// runtime, and bundling it would ship a second copy to every consumer who also has MapLibre.
		external: [/^@maplibre\/maplibre-gl-style-spec/],
		output: {
			dir: 'dist',
			format: 'es',
			// No sourcemaps in the npm package. The node build is not minified, so stack traces into
			// `dist` are already readable, and the maps that used to ship carried no `sourcesContent`
			// and pointed at `../src/**.ts`, which `files` does not publish — 396 KB that resolved to
			// nothing. The browser bundle still emits one: it *is* minified, and devtools needs it.
			sourcemap: false,
			indent: true,
			entryFileNames: '[name].js',
			chunkFileNames: 'chunks/[name]-[hash].js',
		},
		plugins: [
			nodeResolve({ browser: false }),
			typescript({
				tsconfig: 'tsconfig.build.json',
				sourceMap: false,
				declaration: true,
				noEmit: true,
				outDir: 'dist',
				declarationDir: 'dist/declaration',
			}),
			commonjs(),
		],
		onLog(level, log, handler) {
			if (log.code === 'CIRCULAR_DEPENDENCY') return;
			handler(level, log);
		},
	},
	// `rollup-plugin-dts` is single-entry, so each subpath gets its own flattening pass. Types shared
	// between entries are therefore inlined into each `.d.ts` rather than chunked — a few KB of
	// duplication in the type files only, which never reaches the runtime bundle.
	...ENTRIES.map(({ name, input }) => ({
		input: declarationOf(input, 'dist/declaration'),
		output: { file: `dist/${name}.d.ts`, format: 'es' },
		plugins: [dts()],
	})),
];

export default browser ? browserConfig : nodeConfig;

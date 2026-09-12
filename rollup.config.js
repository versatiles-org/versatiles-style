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
 * Adding a second schema (see SCHEMA-SUPPORT-PLAN.md §5.3 — `@versatiles/style/omt`) means adding one
 * line here and one block to `exports`; nothing else in the build has to change. Rollup emits shared
 * code as common chunks, so a subpath only carries what the root entry does not already contain.
 *
 * The **browser** build stays single-entry by design: the UMD bundle is the CDN artifact and must
 * contain Shortbread only, which is what makes the per-schema bundle cost zero by construction
 * rather than by a build flag.
 */
const ENTRIES = [{ name: 'index', input: 'src/index.ts' }];

// Where the TypeScript plugin writes an entry's declaration, mirroring `rootDir: src`.
const declarationOf = (input, dir) => `${dir}/${input.replace(/^src\//, '').replace(/\.ts$/, '.d.ts')}`;

const browserConfig = [
	{
		input: 'src/index.ts',
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
		input: 'release/versatiles-style/declaration/index.d.ts',
		output: { file: 'release/versatiles-style/versatiles-style.d.ts', format: 'es' },
		plugins: [dts()],
	},
];

const nodeConfig = [
	{
		input: Object.fromEntries(ENTRIES.map(({ name, input }) => [name, input])),
		output: {
			dir: 'dist',
			format: 'es',
			sourcemap: true,
			indent: true,
			entryFileNames: '[name].js',
			chunkFileNames: 'chunks/[name]-[hash].js',
		},
		plugins: [
			nodeResolve({ browser: false }),
			typescript({
				tsconfig: 'tsconfig.build.json',
				sourceMap: true,
				declaration: true,
				noEmit: true,
				outDir: 'dist',
				declarationDir: 'dist/declaration',
			}),
			commonjs(),
			sourcemaps(),
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

import commonjs from '@rollup/plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps2';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import process from 'node:process';

const { BUILD } = process.env;
const browser = BUILD === 'browser';

const config = [
	{
		input: 'src/index.ts',
		output: {
			file: browser ? 'release/versatiles-style/versatiles-style.js' : 'dist/index.js',
			format: browser ? 'umd' : 'es',
			sourcemap: true,
			indent: !browser,
			name: 'VersaTilesStyle'
		},
		plugins: [
			browser && terser({ compress: { pure_getters: true, passes: 3 }, sourceMap: true }),
			nodeResolve({ browser }),
			typescript({
				tsconfig: 'tsconfig.json',
				include: ['src/**/*.ts'],
				exclude: ['**/*.test.ts'],
				sourceMap: true,
				declaration: true,
				noEmit: true,
				outDir: browser ? 'release/versatiles-style' : 'dist',
				declarationDir: browser ? 'release/versatiles-style/declaration' : 'dist/declaration',
			}),
			commonjs(),
			sourcemaps(),
		],
		onLog(level, log, handler) {
			if (log.code === 'CIRCULAR_DEPENDENCY') return;
			handler(level, log);
		}
	}, {
		input: browser ? 'release/versatiles-style/declaration/index.d.ts' : 'dist/declaration/index.d.ts',
		output: {
			file: browser ? 'release/versatiles-style/versatiles-style.d.ts' : 'dist/index.d.ts',
			format: 'es'
		},
		plugins: [dts()],
	}
]

export default config;

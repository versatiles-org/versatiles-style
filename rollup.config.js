import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
	{
		input: './src/index.ts',
		output: {
			file: './release/versatiles-style/versatiles-style.js',
			format: 'umd',
			sourcemap: true,
			name: 'VersaTilesStyle'
		},
		plugins: [
			typescript({ tsconfig: './tsconfig.browser.json' }),
			commonjs({ extensions: ['.js', '.ts'] }),
			nodeResolve(),
			terser(),
		],
		onLog(level, log, handler) {
			if (log.code === 'CIRCULAR_DEPENDENCY') return;
			handler(level, log);
		}
	},
	{
		input: './release/versatiles-style/index.d.ts',
		output: [{ file: './release/versatiles-style/versatiles-style.d.ts', format: 'es' }],
		plugins: [dts()],
	},
]

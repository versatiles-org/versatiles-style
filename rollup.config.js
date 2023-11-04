import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default {
	input: 'src/index.ts',
	output: {
		file: 'dist/versatiles-styles.js',
		format: 'umd',
		sourcemap: true,
		name: 'versatiles_styles'
	},
	watch: {
	  include: ['src/**'],
	  exclude: ['node_modules/**']
	},
	plugins: [
		typescript({
			compilerOptions: {
				module: 'esnext',
				moduleResolution: 'bundler',
				declaration: false,
			}
		}),
		commonjs({ extensions: ['.js', '.ts'] }),
		nodeResolve(),
		terser(),
	]
}

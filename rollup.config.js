import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
	input: './src/index.js',
	output: {
		file: 'dist/versatiles-styles.js',
		format: 'umd',
		name: 'versatiles_styles'
	},
	plugins: [
		commonjs(),
		nodeResolve(),
		terser(),
	]
}

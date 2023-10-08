import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
	input: './src/index.js',
	output: {
		file: 'dist/shortbread_baker.js',
		format: 'es'
	},
	plugins: [
		commonjs(),
		nodeResolve(),
		terser(),
	]
}

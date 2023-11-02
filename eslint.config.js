import parser from '@typescript-eslint/parser';
import eslint_plugin from '@typescript-eslint/eslint-plugin';

export default [
	{
		files: ['src/**/*.ts', 'bin/**/*.ts', '/*.js'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {},
			parser,
		},
		plugins: {
			'@typescript-eslint': eslint_plugin
		},
		rules: {
			'indent': ['warn', 'tab', { 'SwitchCase': 1 }],
			'linebreak-style': ['warn', 'unix'],
			'quotes': ['warn', 'single'],
			'no-extra-semi': ['warn'],
			'@typescript-eslint/no-explicit-any': ['off']
		}
	}
]
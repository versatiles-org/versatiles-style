import parser from '@typescript-eslint/parser';
import eslint_plugin from '@typescript-eslint/eslint-plugin';

export default [
	{
		files: ['src/**/*.ts', 'bin/**/*.ts', '*.js'],
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
			'indent': ['error', 'tab', { 'SwitchCase': 1 }],
			'linebreak-style': ['error', 'unix'],
			'quotes': ['error', 'single'],
			'no-extra-semi': ['error'],
			'@typescript-eslint/no-explicit-any': ['warn']
		}
	}
]
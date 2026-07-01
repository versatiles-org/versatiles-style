import js from '@eslint/js';
import ts from 'typescript-eslint';
import parser from '@typescript-eslint/parser';
import eslint_plugin from '@typescript-eslint/eslint-plugin';

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	{
		ignores: ['**/dist/**/*.*', '**/coverage/**/*.*', '**/release/**/*.*', '**/docs/**/*.*'],
	},
	{
		files: ['**/scripts/**/*.ts', '**/src/**/*.ts'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				browser: true,
				es6: true,
				node: true,
			},
			parser,
			parserOptions: {
				sourceType: 'module',
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'@typescript-eslint': eslint_plugin,
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		rules: {
			eqeqeq: ['error', 'always', { null: 'ignore' }],
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},
	{
		// Ban the absolute `.darken()` / `.lighten()` Color methods in style-building code: they
		// shift luminosity in a fixed direction and therefore break under dark-mode palettes.
		// Use `.blend(x, fg)` (toward the pure-black/white foreground) to darken and `.blend(x, bg)`
		// (toward the pure-white/black background) to lighten, so both palettes work. The Color
		// library itself (which defines/tests these methods) is exempt.
		files: ['**/scripts/**/*.ts', '**/src/**/*.ts'],
		ignores: ['**/src/color/**/*.ts'],
		rules: {
			'no-restricted-properties': [
				'error',
				{
					property: 'darken',
					message: 'Do not use .darken() — it breaks dark mode. Use .blend(x, fg) instead.',
				},
				{
					property: 'lighten',
					message: 'Do not use .lighten() — it breaks dark mode. Use .blend(x, bg) instead.',
				},
			],
		},
	},
];

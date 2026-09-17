import js from '@eslint/js';
import ts from 'typescript-eslint';
import parser from '@typescript-eslint/parser';
import eslint_plugin from '@typescript-eslint/eslint-plugin';

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	{
		ignores: ['**/dist/**/*.*', '**/coverage/**/*.*', '**/release/**/*.*', '**/docs/**/*.*', '**/.icon-sources/**/*.*'],
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
	{
		// `src/options/parts/` is a barrel over the option modules that `osm`/`satellite`/
		// `osm-overlay` compose from. It only stays acyclic while nothing inside it imports it —
		// a cycle here would not fail loudly, it would surface as a temporal-dead-zone error at a
		// module-level initialiser like `DEFAULT_BASE`, far from the import that caused it.
		files: ['**/src/options/parts/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					// An exact path, not a pattern: as a glob, `'.'` also matches `'./keys.js'` and would
					// forbid every sibling import. Spelling the barrel `'.'` is how a cycle last got in,
					// so it needs covering separately.
					paths: [
						{
							name: '.',
							message:
								'This is the src/options/parts/ barrel, which re-exports this module; importing it creates a cycle. Import the specific module instead.',
						},
					],
					patterns: [
						{
							group: ['**/parts.js', '**/parts.ts', './index.js'],
							message:
								'This module is re-exported by src/options/parts/, so importing parts.js (or the index barrel) from it creates a cycle. Import the specific module instead.',
						},
					],
				},
			],
		},
	},
	{
		// From outside `src/options/`, the option surface is reached through its barrel and nothing else.
		// Deep imports are not wrong so much as pointless here: every one of them sits in a file that
		// already imports the barrel, so it adds a second edge to the graph and buys no tree-shaking —
		// the barrel is loaded either way. `src/browser.ts` keeps the minimizer out of the CDN bundle by
		// not reaching this directory at all, which is a property of that entry, not of the specifier.
		files: ['**/src/**/*.ts'],
		ignores: ['**/src/options/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['**/options/*.js', '**/options/parts/**'],
							message:
								'Import from the barrel (`../options/`) instead — it re-exports this module, and the file importing it almost certainly imports the barrel already.',
						},
					],
				},
			],
		},
	},
	{
		// Tests: `osm()` and `satellite()` are synchronous in v6, so an `await` on their result (or on any
		// other non-Promise) is noise that also hides which calls really are async. `require-await` catches
		// the `async` keywords left behind once those awaits are gone.
		files: ['**/*.test.ts'],
		rules: {
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/require-await': 'error',
		},
	},
];

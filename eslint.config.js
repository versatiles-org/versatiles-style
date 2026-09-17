import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import parser from '@typescript-eslint/parser';
import eslint_plugin from '@typescript-eslint/eslint-plugin';

/**
 * Rules that exist only for this repository. Defining the plugin inline is what flat config is for:
 * one small rule, no dependency, no package to publish and version.
 */
const localPlugin = {
	rules: {
		/**
		 * A relative specifier names a file, with its extension: `'../types/index.js'` — never the
		 * directory it sits in, as `'../types/'` or `'../types'`.
		 *
		 * The short forms are not valid ESM. Node rejects them with `ERR_UNSUPPORTED_DIR_IMPORT`, and they
		 * work here only because `moduleResolution` is `bundler` and everything reaching the outside world
		 * goes through Rollup, Vite or esbuild first. They are also the one place the tree drops the
		 * explicit `.js` that every other specifier carries, and they have no unambiguous spelling for a
		 * module's own barrel: that is `'.'` or `'./'`, and those are what let a cycle into
		 * `src/options/parts/` once and then matched every sibling import when a lint rule forbade them.
		 *
		 * The fix is read off disk rather than guessed, because both endings occur: a directory takes
		 * `/index.js`, a module that merely lost its extension takes `.js`.
		 */
		'no-directory-import': {
			meta: {
				type: 'problem',
				fixable: 'code',
				schema: [],
				docs: { description: 'Require relative imports to name a file, with its `.js` extension.' },
			},
			create(context) {
				const check = (node) => {
					const value = node.source?.value;
					if (typeof value !== 'string' || !value.startsWith('.')) return;
					if (value.endsWith('.js') || value.endsWith('.json')) return;
					const target = resolve(dirname(context.filename), value);
					let fixed;
					if (existsSync(join(target, 'index.ts'))) fixed = `${value.replace(/\/?$/, '/')}index.js`;
					else if (existsSync(`${target}.ts`)) fixed = `${value}.js`;
					context.report({
						node: node.source,
						message: fixed
							? `Import the file itself, with its extension: '${fixed}'.`
							: `A relative import must name a file with its '.js' extension; '${value}' does not resolve to one.`,
						fix: fixed ? (fixer) => fixer.replaceText(node.source, `'${fixed}'`) : undefined,
					});
				};
				return { ImportDeclaration: check, ExportNamedDeclaration: check, ExportAllDeclaration: check };
			},
		},
	},
};

export default [
	js.configs.recommended,
	...ts.configs.recommended,
	{
		ignores: ['**/dist/**/*.*', '**/coverage/**/*.*', '**/release/**/*.*', '**/docs/**/*.*', '**/.icon-sources/**/*.*'],
	},
	{
		// Plain ESM run by bare `node`, outside the TypeScript project: `scripts/ci/smoke.mjs` imports
		// the *installed* package, so it cannot be compiled or type-checked against this repo's source.
		// It needs the Node globals declared explicitly, since the block below only covers `.ts`.
		files: ['**/scripts/**/*.mjs'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				console: 'readonly',
				process: 'readonly',
			},
		},
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
		files: ['**/src/**/*.ts', '**/scripts/**/*.ts'],
		plugins: { local: localPlugin },
		rules: { 'local/no-directory-import': 'error' },
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

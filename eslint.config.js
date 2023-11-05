import parser from '@typescript-eslint/parser';
import eslint_plugin from '@typescript-eslint/eslint-plugin';

export default [
	{
		files: [
			'src/**/*.ts',
			'scripts/**/*.ts',
		],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				browser: true,
				es6: true,
				node: true
			},
			parser,
			parserOptions: {
				sourceType: 'module',
				project: './tsconfig.json'
			},
		},
		plugins: {
			'@typescript-eslint': eslint_plugin
		},
		rules: {
			// https://github.com/typescript-eslint/typescript-eslint/blob/29c2e688afa7d9b8873d97c3961b65805d87cf2a/packages/eslint-plugin/src/configs/eslint-recommended.ts
			'constructor-super': 'off', // ts(2335) & ts(2377)
			'getter-return': 'off', // ts(2378)
			'no-const-assign': 'off', // ts(2588)
			'no-dupe-args': 'off', // ts(2300)
			'no-dupe-class-members': 'off', // ts(2393) & ts(2300)
			'no-dupe-keys': 'off', // ts(1117)
			'no-func-assign': 'off', // ts(2630)
			'no-import-assign': 'off', // ts(2632) & ts(2540)
			'no-new-symbol': 'off', // ts(7009)
			'no-obj-calls': 'off', // ts(2349)
			'no-redeclare': 'off', // ts(2451)
			'no-setter-return': 'off', // ts(2408)
			'no-this-before-super': 'off', // ts(2376) & ts(17009)
			'no-undef': 'off', // ts(2304) & ts(2552)
			'no-unreachable': 'off', // ts(7027)
			'no-unsafe-negation': 'off', // ts(2365) & ts(2322) & ts(2358)s
			'no-var': 'error', // ts transpiles let/const to var, so no need for vars any more
			'prefer-const': 'error', // ts provides better types with const
			'prefer-rest-params': 'error', // ts provides better types with rest args over arguments
			'prefer-spread': 'error', // ts transpiles spread to apply, so no need for manual apply

			// https://github.com/typescript-eslint/typescript-eslint/blob/29c2e688afa7d9b8873d97c3961b65805d87cf2a/packages/eslint-plugin/src/configs/all.ts
			'@typescript-eslint/adjacent-overload-signatures': 'error',
			'@typescript-eslint/array-type': 'error',
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/ban-ts-comment': 'error',
			'@typescript-eslint/ban-tslint-comment': 'error',
			'@typescript-eslint/ban-types': 'error',
			'@typescript-eslint/block-spacing': 'error',
			'brace-style': 'off',
			'@typescript-eslint/brace-style': 'error',
			'@typescript-eslint/class-literal-property-style': 'error',
			'comma-spacing': 'off',
			'@typescript-eslint/comma-spacing': 'error',
			'@typescript-eslint/consistent-generic-constructors': 'error',
			'@typescript-eslint/consistent-indexed-object-style': 'error',
			'@typescript-eslint/consistent-type-assertions': 'error',
			'@typescript-eslint/consistent-type-definitions': 'error',
			'@typescript-eslint/consistent-type-exports': 'error',
			'@typescript-eslint/consistent-type-imports': 'error',
			'default-param-last': 'off',
			'@typescript-eslint/default-param-last': 'error',
			'dot-notation': 'off',
			'@typescript-eslint/dot-notation': 'error',
			'@typescript-eslint/explicit-function-return-type': 'error',
			'@typescript-eslint/explicit-member-accessibility': 'error',
			'@typescript-eslint/explicit-module-boundary-types': 'error',
			'func-call-spacing': 'off',
			'@typescript-eslint/func-call-spacing': 'error',
			'init-declarations': 'off',
			'@typescript-eslint/init-declarations': 'error',
			'key-spacing': 'off',
			'@typescript-eslint/key-spacing': 'error',
			'keyword-spacing': 'off',
			'@typescript-eslint/keyword-spacing': 'error',
			'lines-around-comment': 'off',
			'@typescript-eslint/lines-around-comment': 'error',
			'max-params': 'off',
			'@typescript-eslint/max-params': 'error',
			'@typescript-eslint/member-delimiter-style': 'error',
			'@typescript-eslint/member-ordering': 'error',
			'@typescript-eslint/method-signature-style': 'error',
			'no-array-constructor': 'off',
			'@typescript-eslint/no-array-constructor': 'error',
			'@typescript-eslint/no-base-to-string': 'error',
			'@typescript-eslint/no-confusing-non-null-assertion': 'error',
			'@typescript-eslint/no-confusing-void-expression': 'error',
			'no-dupe-class-members': 'off',
			'@typescript-eslint/no-dupe-class-members': 'error',
			'@typescript-eslint/no-duplicate-enum-values': 'error',
			'@typescript-eslint/no-duplicate-type-constituents': 'error',
			'@typescript-eslint/no-dynamic-delete': 'error',
			'no-empty-function': 'off',
			'@typescript-eslint/no-empty-function': 'error',
			'@typescript-eslint/no-empty-interface': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-extra-non-null-assertion': 'error',
			'no-extra-semi': 'off',
			'@typescript-eslint/no-extra-semi': 'error',
			'@typescript-eslint/no-extraneous-class': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-for-in-array': 'error',
			'no-implied-eval': 'off',
			'@typescript-eslint/no-implied-eval': 'error',
			'@typescript-eslint/no-import-type-side-effects': 'error',
			'@typescript-eslint/no-inferrable-types': 'error',
			'no-invalid-this': 'off',
			'@typescript-eslint/no-invalid-this': 'error',
			'@typescript-eslint/no-invalid-void-type': 'error',
			'no-loop-func': 'off',
			'@typescript-eslint/no-loop-func': 'error',
			'no-loss-of-precision': 'off',
			'@typescript-eslint/no-loss-of-precision': 'error',
			'@typescript-eslint/no-meaningless-void-operator': 'error',
			'@typescript-eslint/no-misused-new': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/no-mixed-enums': 'error',
			'@typescript-eslint/no-namespace': 'error',
			'@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
			'@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'no-redeclare': 'off',
			'@typescript-eslint/no-redeclare': 'error',
			'@typescript-eslint/no-redundant-type-constituents': 'error',
			'@typescript-eslint/no-require-imports': 'error',
			'no-restricted-imports': 'off',
			'@typescript-eslint/no-restricted-imports': 'error',
			'no-shadow': 'off',
			'@typescript-eslint/no-shadow': 'error',
			'@typescript-eslint/no-this-alias': 'error',
			'no-throw-literal': 'off',
			'@typescript-eslint/no-throw-literal': 'error',
			'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
			'@typescript-eslint/no-unnecessary-condition': 'error',
			'@typescript-eslint/no-unnecessary-qualifier': 'error',
			'@typescript-eslint/no-unnecessary-type-arguments': 'error',
			'@typescript-eslint/no-unnecessary-type-assertion': 'error',
			'@typescript-eslint/no-unnecessary-type-constraint': 'error',
			'@typescript-eslint/no-unsafe-argument': 'error',
			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'@typescript-eslint/no-unsafe-declaration-merging': 'error',
			'@typescript-eslint/no-unsafe-enum-comparison': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-return': 'error',
			'no-unused-expressions': 'off',
			'@typescript-eslint/no-unused-expressions': 'error',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'error',
			'no-useless-constructor': 'off',
			'@typescript-eslint/no-useless-constructor': 'error',
			'@typescript-eslint/no-useless-empty-export': 'error',
			'@typescript-eslint/no-var-requires': 'error',
			'@typescript-eslint/non-nullable-type-assertion-style': 'error',
			'padding-line-between-statements': 'off',
			'@typescript-eslint/padding-line-between-statements': 'error',
			'@typescript-eslint/parameter-properties': 'error',
			'@typescript-eslint/prefer-as-const': 'error',
			'@typescript-eslint/prefer-enum-initializers': 'error',
			'prefer-destructuring': 'off',
			'@typescript-eslint/prefer-destructuring': 'error',
			'@typescript-eslint/prefer-for-of': 'error',
			'@typescript-eslint/prefer-function-type': 'error',
			'@typescript-eslint/prefer-includes': 'error',
			'@typescript-eslint/prefer-literal-enum-member': 'error',
			'@typescript-eslint/prefer-namespace-keyword': 'error',
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
			'@typescript-eslint/prefer-optional-chain': 'error',
			'@typescript-eslint/prefer-readonly': 'error',
			'@typescript-eslint/prefer-reduce-type-parameter': 'error',
			'@typescript-eslint/prefer-regexp-exec': 'error',
			'@typescript-eslint/prefer-return-this-type': 'error',
			'@typescript-eslint/prefer-string-starts-ends-with': 'error',
			'@typescript-eslint/prefer-ts-expect-error': 'error',
			'@typescript-eslint/promise-function-async': 'error',
			'@typescript-eslint/require-array-sort-compare': 'error',
			'require-await': 'off',
			'@typescript-eslint/require-await': 'error',
			'@typescript-eslint/restrict-plus-operands': 'error',
			'@typescript-eslint/restrict-template-expressions': 'error',
			'no-return-await': 'off',
			'@typescript-eslint/return-await': 'error',
			'semi': 'off',
			'@typescript-eslint/semi': 'error',
			'@typescript-eslint/sort-type-constituents': 'error',
			'space-before-blocks': 'off',
			'@typescript-eslint/space-before-blocks': 'error',
			'space-infix-ops': 'off',
			'@typescript-eslint/space-infix-ops': 'error',
			'@typescript-eslint/strict-boolean-expressions': 'error',
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'@typescript-eslint/triple-slash-reference': 'error',
			'@typescript-eslint/type-annotation-spacing': 'error',
			'@typescript-eslint/typedef': 'error',
			'@typescript-eslint/unbound-method': 'error',
			'@typescript-eslint/unified-signatures': 'error',

			// my specials:
			'indent': 'off',
			'@typescript-eslint/indent': ['error', 'tab', { 'SwitchCase': 1 }],

			'linebreak-style': ['error', 'unix'],

			'quotes': 'off',
			'@typescript-eslint/quotes': ['error', 'single'],

			'object-curly-spacing': 'off',
			'@typescript-eslint/object-curly-spacing': ['error', 'always'],

			'comma-dangle': 'off',
			'@typescript-eslint/comma-dangle': ['error', 'always-multiline'],

			'lines-between-class-members': 'off',
			'@typescript-eslint/lines-between-class-members': ['error'],

			'@typescript-eslint/naming-convention': 'error',

			'no-magic-numbers': 'off',
			'@typescript-eslint/no-magic-numbers': 'off',

			'no-extra-parens': 'off',
			'@typescript-eslint/no-extra-parens': ['error', 'all', { 'conditionalAssign': false, 'nestedBinaryExpressions': false, 'ternaryOperandBinaryExpressions': false }],

			'space-before-function-paren': 'off',
			'@typescript-eslint/space-before-function-paren': ['error', 'never'],

			'no-use-before-define': 'off',
			'@typescript-eslint/no-use-before-define': ['error', { 'functions': false }],

			'@typescript-eslint/prefer-readonly-parameter-types': 'off',

			'class-methods-use-this': 'off',
			'@typescript-eslint/class-methods-use-this': 'off',
		}
	}
]
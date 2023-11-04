/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
	testEnvironment: 'node',
	preset: 'ts-jest/presets/js-with-ts',
	transform: {
		// '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
		// '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
		'^.+\\.[jt]sx?$': [
			'ts-jest',
			{
				useESM: true,
				tsconfig: 'tsconfig.json',
			},
		],
	},
	transformIgnorePatterns: ['node_modules/(?!@angular|@ngx-translate|brace-expansion)'],
	resolver: 'jest-ts-webcompat-resolver',
	modulePathIgnorePatterns: ['js'],
	extensionsToTreatAsEsm: ['.ts'],
	//moduleFileExtensions: ['ts', 'js', 'jsx'],
	//moduleDirectories: ['node_modules'],
	//testRegex: '.*.test.ts',
	//verbose: true
};
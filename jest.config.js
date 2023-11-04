/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
	testEnvironment: 'node',
	transform: {
		// '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
		// '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				useESM: true,
				tsconfig: 'tsconfig.json',
			},
		],
	},
	resolver: 'jest-ts-webcompat-resolver',
	modulePathIgnorePatterns: ['js'],
	extensionsToTreatAsEsm: ['.ts'],
	//moduleFileExtensions: ['ts', 'js', 'jsx'],
	//moduleDirectories: ['node_modules'],
	//testRegex: '.*.test.ts',
	//verbose: true
};
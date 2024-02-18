import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
	verbose: true,
	testEnvironment: 'node',
	transform: {
		'^.+\\.ts$': ['ts-jest', { useESM: true }]
	},
	testMatch: [
		'**/src/**/*.test.ts',
		'!**/src/**/*.mock.test.ts',
	],
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
	coveragePathIgnorePatterns: [
		'/dist/'
	],
	collectCoverageFrom: [
		'**/src/**/*.ts',
		'!**/src/**/*.test.ts',
		'!**/node_modules/**',
		'!jest*.ts',
	]
}

export default config;

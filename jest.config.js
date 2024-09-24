export default {
	verbose: true,
	testEnvironment: 'node',
	transform: {
		'^.+\\.ts$': ['ts-jest', { useESM: true }]
	},
	testMatch: [
		'**/src/**/*.test.ts',
		'**/scripts/**/*.test.ts',
		'!**/src/**/*.mock.test.ts',
	],
	extensionsToTreatAsEsm: ['.ts'],
	moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
	coveragePathIgnorePatterns: [
		'/dist/'
	],
	collectCoverageFrom: [
		'**/src/**/*.ts',
		'**/scripts/**/*.ts',
		'!**/*.test.ts',
		'!**/node_modules/**',
		'!jest*.ts',
	]
}

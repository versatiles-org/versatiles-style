import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'node',
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.node.json', useESM: true }]
	},
	testRegex: 'src/.*\\.test\\.ts',
	extensionsToTreatAsEsm: ['.ts'],
	collectCoverage: false,
	resolver: 'jest-ts-webcompat-resolver',
}

export default config;

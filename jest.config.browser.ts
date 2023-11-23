import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'jsdom',
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.node.json', useESM: true }]
	},
	testRegex: 'browser_test/browser.test.ts',
}

export default config;

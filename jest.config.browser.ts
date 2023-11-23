import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'jsdom',
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.node.json', useESM: true }]
	},
	testRegex: 'src/browser.test.ts',
}

export default config;

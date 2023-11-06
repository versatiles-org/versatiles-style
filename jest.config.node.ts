import type { Config } from 'jest';

const config: Config = {
	testEnvironment: 'node',
	transform: {},
	testRegex: 'dist/.*\\.test\\.js',
}

export default config;

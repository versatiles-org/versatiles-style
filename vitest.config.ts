import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['lcov', 'text'],
			exclude: ['node_modules/**', 'dist/**', 'release/**', '**/*.test.ts', '**/*.config.*'],
		},
	},
});

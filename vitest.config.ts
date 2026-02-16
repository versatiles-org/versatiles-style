import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['lcov', 'text'],
			exclude: ['node_modules/**', 'dist/**', 'release/**', '**/*.test.ts', '**/*.config.*'],
		},
		projects: [
			{
				test: {
					name: 'unit',
					include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
					exclude: ['**/*.e2e.test.ts'],
				},
			},
			{
				test: {
					name: 'e2e',
					include: ['**/*.e2e.test.ts'],
				},
			},
		],
	},
});

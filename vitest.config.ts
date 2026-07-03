import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['lcov', 'text'],
			exclude: ['node_modules/**', 'dist/**', 'release/**', '**/*.test.ts', '**/*.config.*'],
			// Regression ratchet: set a few points below the current numbers so an accidental
			// coverage drop fails `npm run test-coverage` without being brittle. Raise over time.
			thresholds: {
				statements: 94,
				branches: 90,
				functions: 96,
				lines: 95,
			},
		},
		projects: [
			{
				test: {
					name: 'unit',
					include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
					exclude: ['**/*.e2e.test.ts'],
					setupFiles: ['./vitest.setup.ts'],
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

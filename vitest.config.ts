import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['lcov', 'text'],
			exclude: ['node_modules/**', 'dist/**', 'release/**', '**/*.test.ts', '**/*.config.*'],
			// Reported, not enforced. The thresholds that used to sit here were a ratchet a few points
			// under the then-current numbers, which meant any refactor that deleted well-covered code —
			// or added a module the suite reaches only indirectly — failed CI on a number nobody had
			// chosen. The lcov report still goes to Coveralls, so the trend stays visible.
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

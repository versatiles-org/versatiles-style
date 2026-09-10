import { describe, expect, it, vi } from 'vitest';

console.log = vi.fn();

vi.mock('fs', { spy: true });
vi.mock('child_process', { spy: true });

vi.mock('./config/sprites', () => ({
	default: {
		ratios: [1, 2],
		spritesheets: {
			base: {
				// Sprite name → source path: the source keeps its upstream filename (`alcohol-shop`)
				// while the sprite name follows our convention (`alcohol_shop`).
				icon: {
					size: 22,
					icons: { airfield: 'maki/airfield', airport: 'maki/airport', alcohol_shop: 'maki/alcohol-shop' },
				},
				pattern: {
					size: 12,
					useSDF: true,
					icons: {
						hatched_thin: 'versatiles/hatched_thin',
						striped: 'versatiles/striped',
						hatched: 'versatiles/hatched',
					},
				},
			},
		},
	},
}));

describe('Sprite Generation and Packaging', () => {
	it('successfully generates and packages sprites', async () => {
		const cp = await import('child_process');
		const fs = await import('fs');
		vi.clearAllMocks();

		// Prevent tests from modifying the release directory
		vi.mocked(fs.rmSync).mockImplementation(() => undefined);
		vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
		vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

		await import('./build-sprites.js');

		const readCalls = vi.mocked(fs.readFileSync).mock.calls.filter((call) => /\.svg$/.test(String(call[0])));
		expect(readCalls.length).toBe(6);
		expect(vi.mocked(cp.spawn)).toHaveBeenCalledTimes(2);
		expect(vi.mocked(fs.writeFileSync).mock.calls).toStrictEqual([
			[expect.stringMatching(/\/release\/sprites\/base\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/base\.json$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/base@2x\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/base@2x\.json$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/index\.json$/), '["base"]'],
		]);
	}, 20000);
});

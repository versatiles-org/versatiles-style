import { describe, expect, it, vi } from 'vitest';

console.log = vi.fn();

vi.mock('fs', { spy: true });
vi.mock('child_process', { spy: true });

vi.mock('./config-sprites', () => ({
	default: {
		ratios: [1, 2, 3, 4],
		spritesheets: {
			basics: {
				icon: { size: 22, names: ['airfield', 'airport', 'alcohol_shop'] },
				pattern: { size: 12, useSDF: true, names: ['hatched_thin', 'striped', 'warning'] },
			},
		},
	},
}));

describe('Sprite Generation and Packaging', () => {
	it('successfully generates and packages sprites', async () => {
		const cp = await import('child_process');
		const fs = await import('fs');
		vi.clearAllMocks();

		await import('./build-sprites.js');

		const readCalls = vi.mocked(fs.readFileSync).mock.calls.filter((call) => /\.svg$/.test(String(call[0])));
		expect(readCalls.length).toBe(6);
		expect(vi.mocked(cp.spawn)).toHaveBeenCalledTimes(4);
		expect(vi.mocked(fs.writeFileSync).mock.calls).toStrictEqual([
			[expect.stringMatching(/\/release\/sprites\/basics\/sprites\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/basics\/sprites\.json$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/basics\/sprites@2x\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/basics\/sprites@2x\.json$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/basics\/sprites@3x\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/basics\/sprites@3x\.json$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/basics\/sprites@4x\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/basics\/sprites@4x\.json$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/index\.json$/), '["basics"]'],
		]);
	}, 20000);
});

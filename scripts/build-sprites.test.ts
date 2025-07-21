import { jest } from '@jest/globals';

console.log = jest.fn();

const fs0 = await import('fs');
const cp0 = await import('child_process');

jest.unstable_mockModule('fs', () => ({
	...fs0,
	existsSync: jest.fn(fs0.existsSync),
	mkdirSync: jest.fn(fs0.mkdirSync),
	readFileSync: jest.fn(fs0.readFileSync),
	rmSync: jest.fn(fs0.rmSync),
	writeFileSync: jest.fn(fs0.writeFileSync),
}));

jest.unstable_mockModule('child_process', () => ({
	spawn: jest.fn(cp0.spawn),
}));

jest.unstable_mockModule('./config-sprites', () => ({
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

const fs = await import('fs');
const cp = await import('child_process');

describe('Sprite Generation and Packaging', () => {
	it('successfully generates and packages sprites', async () => {
		await import('./build-sprites.js');

		expect(jest.mocked(fs.readFileSync)).toHaveBeenCalledTimes(6);
		expect(jest.mocked(cp.spawn)).toHaveBeenCalledTimes(4);
		expect(jest.mocked(fs.writeFileSync).mock.calls).toStrictEqual([
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
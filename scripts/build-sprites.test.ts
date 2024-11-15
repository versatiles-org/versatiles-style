import { jest } from '@jest/globals';

console.log = jest.fn();

const fs0 = await import('node:fs');
const cp0 = await import('node:child_process');

jest.unstable_mockModule('node:fs', () => ({
	existsSync: jest.fn(fs0.existsSync),
	mkdirSync: jest.fn(fs0.mkdirSync),
	readFileSync: jest.fn(fs0.readFileSync),
	rmSync: jest.fn(fs0.rmSync),
	writeFileSync: jest.fn(fs0.writeFileSync),
}));

jest.unstable_mockModule('node:child_process', () => ({
	spawn: jest.fn(cp0.spawn),
}));

jest.unstable_mockModule('./config-sprites', () => ({
	default: {
		ratios: [1, 2, 3, 4],
		sets: {
			icons: { size: 22, names: ['airfield', 'airport', 'alcohol_shop'] },
			pattern: { size: 12, useSDF: true, names: ['hatched_thin', 'striped', 'warning'] },
		},
	},
}));

const fs = await import('node:fs');
const cp = await import('node:child_process');

describe('Sprite Generation and Packaging', () => {
	it('successfully generates and packages sprites', async () => {
		await import('./build-sprites.js');

		expect(jest.mocked(fs.readFileSync)).toHaveBeenCalledTimes(6);
		expect(jest.mocked(cp.spawn)).toHaveBeenCalledTimes(4);
		expect(jest.mocked(fs.writeFileSync).mock.calls).toStrictEqual([
			[expect.stringMatching(/\/release\/sprites\/sprites\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/sprites\.json$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/sprites@2x\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/sprites@2x\.json$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/sprites@3x\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/sprites@3x\.json$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/sprites@4x\.png$/), expect.any(Buffer)],
			[expect.stringMatching(/\/release\/sprites\/sprites@4x\.json$/), expect.any(Buffer)],
		]);

	}, 20000);
});
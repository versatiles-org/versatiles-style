/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/consistent-type-imports */

import { jest } from '@jest/globals';
import type { Pack } from 'tar-stream';

console.log = jest.fn();

const fs0 = await import('node:fs');
async function getMockedFs(): Promise<typeof import('node:fs')> {
	jest.unstable_mockModule('node:fs', () => ({
		createWriteStream: jest.fn(fs0.createWriteStream),
		// @ts-expect-error too lazy
		existsSync: jest.fn(filename => fs0.existsSync(filename)),
		mkdirSync: jest.fn(fs0.mkdirSync),
		readFileSync: jest.fn(fs0.readFileSync),
		rmSync: jest.fn(fs0.rmSync),
		writeFileSync: jest.fn(fs0.writeFileSync),
	}));
	return import('node:fs');
}

const cp0 = await import('node:child_process');
async function getMockedCp(): Promise<typeof import('node:child_process')> {
	jest.unstable_mockModule('node:child_process', () => ({
		spawnSync: jest.fn(cp0.spawnSync),
	}));
	return import('node:child_process');
}

const tar0 = await import('tar-stream');
async function getMockedTar(): Promise<typeof import('tar-stream')> {
	jest.unstable_mockModule('tar-stream', () => {
		const pack = jest.fn(() => {
			const packInstance = tar0.pack();
			jest.spyOn(packInstance, 'entry');
			return packInstance;
		});
		return { default: { pack }, pack };
	});
	return import('tar-stream');
}


jest.unstable_mockModule('./config-sprites', () => ({
	default: {
		ratio: { '': 1, '@2x': 2, '@3x': 3, '@4x': 4 },
		sets: {
			icon: { size: 22, names: ['airfield', 'airport', 'alcohol_shop'] },
			pattern: { size: 12, names: ['hatched_thin', 'striped', 'warning'] },
		},
	},
}));

describe('Sprite Generation and Packaging', () => {
	it('successfully generates and packages sprites', async () => {
		const fs = await getMockedFs();
		const cp = await getMockedCp();
		const tar = await getMockedTar();

		await import('./build-sprites');

		expect(jest.mocked(fs.createWriteStream).mock.calls).toStrictEqual([
			[expect.stringMatching(/release\/sprites\.tar\.gz$/)],
		]);

		expect(jest.mocked(fs.readFileSync)).toHaveBeenCalledTimes(10);
		expect(jest.mocked(fs.writeFileSync)).toHaveBeenCalledTimes(4);
		expect(jest.mocked(cp.spawnSync)).toHaveBeenCalledTimes(4);

		const packInstances = jest.mocked(tar.pack).mock.results;
		expect(packInstances.length).toBe(1);

		const packInstance = packInstances[0].value as Pack;
		expect(jest.mocked(packInstance.entry).mock.calls).toStrictEqual([
			[expect.objectContaining({ name: 'sprites.png' }), expect.any(Buffer)],
			[expect.objectContaining({ name: 'sprites.json' }), expect.any(Buffer)],
			[expect.objectContaining({ name: 'sprites@2x.png' }), expect.any(Buffer)],
			[expect.objectContaining({ name: 'sprites@2x.json' }), expect.any(Buffer)],
			[expect.objectContaining({ name: 'sprites@3x.png' }), expect.any(Buffer)],
			[expect.objectContaining({ name: 'sprites@3x.json' }), expect.any(Buffer)],
			[expect.objectContaining({ name: 'sprites@4x.png' }), expect.any(Buffer)],
			[expect.objectContaining({ name: 'sprites@4x.json' }), expect.any(Buffer)],
		]);

	}, 20000);
});
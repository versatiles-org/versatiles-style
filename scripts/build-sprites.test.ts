/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/consistent-type-imports */

import { jest } from '@jest/globals';
import type { Pack } from 'tar-stream';



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

const tar0 = await import('tar-stream');
async function getMockedCp(): Promise<typeof import('node:child_process')> {
	jest.unstable_mockModule('node:child_process', () => ({
		spawnSync: jest.fn().mockReturnValue({ status: 0 }),
	}));
	return import('node:child_process');
}

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

describe('Sprite Generation and Packaging', () => {
	it('successfully generates and packages sprites', async () => {
		const fs = await getMockedFs();
		const cp = await getMockedCp();
		const tar = await getMockedTar();

		await import('./build-sprites');

		expect(jest.mocked(fs.createWriteStream).mock.calls).toStrictEqual([
			[expect.stringMatching(/release\/sprites\.tar\.gz$/)],
		]);

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
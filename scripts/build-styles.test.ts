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
		const tar = await getMockedTar();

		await import('./build-styles.js');

		expect(jest.mocked(fs.createWriteStream).mock.calls).toStrictEqual([
			[expect.stringMatching(/release\/styles\.tar\.gz$/)],
		]);

		expect(jest.mocked(fs.readFileSync)).toHaveBeenCalledTimes(0);
		expect(jest.mocked(fs.writeFileSync)).toHaveBeenCalledTimes(0);

		const packInstances = jest.mocked(tar.pack).mock.results;
		expect(packInstances.length).toBe(1);

		const packInstance = packInstances[0].value as Pack;

		const files = ['colorful', 'eclipse', 'graybeard', 'neutrino'].flatMap(style => [
			`${style}.json`,
			`${style}.en.json`,
			`${style}.de.json`,
			`${style}.nolabel.json`,
		]);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		const calls = files.map(name => [expect.objectContaining({ name }), expect.any(String)]);

		expect(jest.mocked(packInstance.entry).mock.calls).toStrictEqual(calls);

	}, 20000);
});
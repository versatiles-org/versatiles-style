import { describe, expect, it, vi } from 'vitest';
import type { Pack } from 'tar-stream';

console.log = vi.fn();

vi.mock('fs', { spy: true });
vi.mock(import('tar-stream'), async (originalImport) => {
	const tar = await originalImport();
	const pack = vi.fn(() => {
		const packInstance = tar.pack();
		vi.spyOn(packInstance, 'entry');
		return packInstance;
	});
	return { default: { pack }, pack } as unknown as typeof tar;
});

vi.mock('./config-sprites', () => ({
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
		vi.clearAllMocks();
		const fs = await import('fs');
		const tar = await import('tar-stream');

		await import('./build-styles.js');

		expect(vi.mocked(fs.createWriteStream).mock.calls).toStrictEqual([
			[expect.stringMatching(/release\/styles\.tar\.gz$/)],
		]);

		const packInstances = vi.mocked(tar.pack).mock.results;
		expect(packInstances.length).toBe(1);

		const packInstance = packInstances[0].value as Pack;

		const { calls } = vi.mocked(packInstance.entry).mock;
		const generatedFiles = calls.map((call) => call[0].name).sort();

		const expectedFiles = ['colorful', 'eclipse', 'graybeard', 'neutrino', 'shadow'].flatMap((style) => [
			`${style}/style.json`,
			`${style}/en.json`,
			`${style}/de.json`,
			`${style}/nolabel.json`,
		]);
		expectedFiles.push('empty/style.json');
		expectedFiles.push('satellite/style.json', 'satellite/en.json', 'satellite/de.json', 'satellite/nooverlay.json');
		expectedFiles.sort();

		expect(generatedFiles).toStrictEqual(expectedFiles);
	}, 20000);
});

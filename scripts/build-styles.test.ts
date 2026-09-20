import { describe, expect, it, vi } from 'vitest';
import type { TarEntry } from './lib/tarball.js';

console.log = vi.fn();

/**
 * What `build-styles.ts` handed to `writeTarball`, captured instead of written.
 *
 * This used to mock `tar-stream` and `fs.createWriteStream` and assert on `pack.entry()` calls. That
 * reached through the script into the mechanics of how it writes, and it only passed because of the
 * defect this test now guards: the write was a bare `pack.pipe(...).pipe(...)`, which returns before
 * any of it has happened, so nothing ever waited for a `PassThrough` that nothing drained. Awaiting
 * the write correctly — as the script now does — made the old test hang until its timeout.
 *
 * Mocking the one function the script calls to write is both simpler and the actual contract: these
 * entries, under this name.
 */
const captured = vi.hoisted(() => ({ calls: [] as { path: string; entries: readonly TarEntry[] }[] }));

vi.mock('./lib/tarball.js', () => ({
	writeTarball: vi.fn((path: string, entries: readonly TarEntry[]) => {
		captured.calls.push({ path, entries });
		return Promise.resolve(1_000_000); // a plausible size; the script only prints it
	}),
}));

// Nothing here may touch `release/`.
vi.mock('fs', { spy: true });

describe('build-styles', () => {
	it('packs every style variant into styles.tar.gz', async () => {
		const fs = await import('fs');
		vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

		await import('./build-styles.js');

		expect(captured.calls.length).toBe(1);
		expect(captured.calls[0].path).toMatch(/release\/styles\.tar\.gz$/);

		const generatedFiles = captured.calls[0].entries.map((entry) => entry.name).sort();

		// v6 themes, light and dark, plus the v5 names kept alive so their published URLs do not 404 (B1).
		const palettes = ['colorful', 'natural', 'muted', 'gray', 'toner'].flatMap((p) => [p, `${p}-dark`]);
		const legacy = ['eclipse', 'graybeard', 'neutrino', 'shadow'];
		const expectedFiles = [...palettes, ...legacy].flatMap((style) => [
			`${style}/style.json`,
			`${style}/en.json`,
			`${style}/de.json`,
			`${style}/nolabel.json`,
			`${style}-terrain/style.json`,
			`${style}-terrain/en.json`,
			`${style}-terrain/de.json`,
		]);
		['satellite', 'terrain'].forEach((style) => {
			expectedFiles.push(`${style}/style.json`, `${style}/overlay.json`, `${style}/en.json`, `${style}/de.json`);
		});
		// v5 published `empty` as a single style.
		expectedFiles.push('empty/style.json');
		expectedFiles.sort();

		expect(generatedFiles).toStrictEqual(expectedFiles);

		// The count the script asks `writeTarball` to verify has to be the number of entries it passed,
		// or the check it added would pass vacuously.
		expect(captured.calls[0].entries.length).toBe(expectedFiles.length);
		// Importing the script builds every variant for real — ~1.3s alone, but over 5s on a loaded CI
		// runner sharing cores with the rest of the suite, which is what failed the v6.0.1 release on
		// the default 5s timeout. Same headroom as `build-sprites.test.ts`.
	}, 30000);
});

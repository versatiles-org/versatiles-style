import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { listTarball, writeTarball } from './tarball.js';

const DIR = mkdtempSync(resolve(tmpdir(), 'versatiles-tarball-'));
const dest = (name: string): string => resolve(DIR, name);

afterAll(() => rmSync(DIR, { recursive: true, force: true }));

describe('writeTarball', () => {
	it('writes entries that read back unchanged', async () => {
		const path = dest('round-trip.tar.gz');
		await writeTarball(path, [
			{ name: 'a.json', body: '{"a":1}' },
			{ name: 'b.txt', body: Buffer.from('hello') },
		]);
		expect(await listTarball(path)).toEqual(['a.json', 'b.txt']);
	});

	// The defect this module exists for: `tar -cf - nope.* | gzip -9 > out.tar.gz` exits 0 and writes a
	// valid 45-byte archive of nothing, because the pipeline's status is gzip's and npm runs without
	// `pipefail`. An empty archive is never a thing anyone wanted, so it is an error rather than a file.
	it('refuses to write an empty archive', async () => {
		await expect(writeTarball(dest('empty.tar.gz'), [])).rejects.toThrow(/no entries/);
	});

	// The check that catches a silently dropped file — the same one `release.yml` makes for the sprite
	// sheets, where a size floor alone could not tell "a sheet is missing" from "the icons got smaller".
	it('enforces an expected entry count', async () => {
		const entries = [
			{ name: 'a', body: 'a' },
			{ name: 'b', body: 'b' },
		];
		await expect(writeTarball(dest('count.tar.gz'), entries, { entries: 3 })).rejects.toThrow(
			/holds 2 entries, expected 3/
		);
		await expect(writeTarball(dest('count-ok.tar.gz'), entries, { entries: 2 })).resolves.toBeGreaterThan(0);
	});

	// The backstop for entries that are present but empty, which a count cannot see.
	it('enforces a size floor', async () => {
		await expect(
			writeTarball(dest('small.tar.gz'), [{ name: 'a', body: '' }], { minBytes: 1_000_000 })
		).rejects.toThrow(/expected at least 1000000/);
	});

	it('returns the size on disk, and the file is complete when it resolves', async () => {
		const path = dest('size.tar.gz');
		// Large and compressible, so the write is big enough to span more than one chunk: an un-awaited
		// pipeline is most likely to be caught short exactly here.
		const size = await writeTarball(path, [{ name: 'big.txt', body: 'x'.repeat(5_000_000) }]);
		expect(size).toBe(statSync(path).size);
		expect(await listTarball(path)).toEqual(['big.txt']);
	});
});

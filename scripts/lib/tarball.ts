/**
 * Writing a release tarball, and being sure it was written.
 *
 * Every published `.tar.gz` used to be produced either by a shell pipeline in `package.json` or by an
 * un-awaited stream, and both fail quietly:
 *
 *   - `tar -cf - versatiles-style.* | gzip -9 > out.tar.gz` exits **0** when the glob matches nothing.
 *     The pipeline's status is `gzip`'s, npm scripts run without `pipefail`, and `gzip` is perfectly
 *     happy to compress an empty stream — so a missing build produced a valid 45-byte archive of
 *     nothing, and the release job uploaded it as a success.
 *   - `pack.pipe(createGzip()).pipe(createWriteStream(dest))` returns before any of it has happened. A
 *     write error surfaces as an unhandled stream error rather than a non-zero exit, and the process
 *     can exit before the file is complete.
 *
 * So packing goes through here instead: entries are given up front (an empty set is an error, not an
 * empty archive), the pipeline is awaited to completion, and the result is read back and checked.
 * `release.yml` already guards `sprites.tar.gz` this way — 13 files and a size floor — which is the
 * check that caught a lost sprite sheet. This is the same idea for the other two, close enough to the
 * writing that no CI step has to remember to do it.
 */
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { createGunzip, createGzip } from 'node:zlib';
import tar from 'tar-stream';

/** One file in the archive. */
export type TarEntry = { name: string; body: Buffer | string };

export type TarballExpectation = {
	/** Exactly this many entries must be present. A count is what catches a silently dropped file. */
	entries?: number;
	/** The archive must be at least this many bytes on disk — a backstop for present-but-empty files. */
	minBytes?: number;
};

/**
 * Write `entries` to `destination` as a gzipped tar, then verify it.
 *
 * Returns the size on disk. Throws — rather than writing something unusable — if `entries` is empty,
 * if the write fails, or if the result does not match `expect`.
 */
export async function writeTarball(
	destination: string,
	entries: readonly TarEntry[],
	expect: TarballExpectation = {}
): Promise<number> {
	if (entries.length === 0) {
		throw new Error(`writeTarball: refusing to write ${destination} with no entries — the build produced nothing`);
	}

	const pack = tar.pack();
	for (const { name, body } of entries) pack.entry({ name }, body);
	pack.finalize();

	// Awaited, so a write error is this function's rejection and the file is complete when it returns.
	await pipeline(pack, createGzip({ level: 9 }), createWriteStream(destination));

	const { size } = await stat(destination);
	if (expect.minBytes !== undefined && size < expect.minBytes) {
		throw new Error(`writeTarball: ${destination} is ${size} bytes, expected at least ${expect.minBytes}`);
	}
	if (expect.entries !== undefined) {
		const found = await listTarball(destination);
		if (found.length !== expect.entries) {
			throw new Error(
				`writeTarball: ${destination} holds ${found.length} entries, expected ${expect.entries} — ${found.join(', ')}`
			);
		}
	}
	return size;
}

/** The entry names in a gzipped tar, read back from disk. */
export async function listTarball(path: string): Promise<string[]> {
	const names: string[] = [];
	const extract = tar.extract();
	extract.on('entry', (header, stream, next) => {
		names.push(header.name);
		stream.on('end', next);
		stream.resume();
	});
	// A stream, not the Buffer `readFile` gives: `pipeline` would iterate a Buffer as individual bytes
	// and hand `gunzip` a number per write, which it rejects with ERR_INVALID_ARG_TYPE.
	await pipeline(createReadStream(path), createGunzip(), extract);
	return names.sort();
}

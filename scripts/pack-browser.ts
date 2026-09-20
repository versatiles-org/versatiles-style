/**
 * Pack the built browser bundle into `release/versatiles-style.tar.gz`, then drop the intermediate
 * declaration tree.
 *
 * This was a shell one-liner in `package.json`, and it could not report failure:
 *
 * ```
 * (cd release/versatiles-style; tar -cf - versatiles-style.* | gzip -9 > ../versatiles-style.tar.gz)
 * ```
 *
 * Two independent ways for that to pass while doing nothing (both reproduced):
 *
 *   - The glob matching nothing is not an error. `tar` writes a diagnostic and exits non-zero, but the
 *     pipeline's status is `gzip`'s, and npm scripts run without `pipefail` — so the command exits 0
 *     having written a valid 45-byte gzip of an empty archive.
 *   - `cd` failing does not stop the subshell, because the separator is `;` rather than `&&`. The
 *     `tar` then runs in the repository root, where `versatiles-style.*` matches nothing, and the
 *     first case takes over from there.
 *
 * The result is the file the CDN serves and the release job uploads, and nothing downstream checked
 * it — `release.yml` verifies `sprites.tar.gz` (entry count and a size floor) but neither of the other
 * two archives. So the check lives here now, next to the writing, where it cannot be forgotten by a
 * workflow that packs a new artifact.
 */
import { readFile, rm } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT } from './lib/paths.js';
import { writeTarball } from './lib/tarball.js';

const BUNDLE_DIR = resolve(ROOT, 'release/versatiles-style');
const DESTINATION = resolve(ROOT, 'release/versatiles-style.tar.gz');

/** The bundle, its sourcemap and its types — what `rollup -c --environment BUILD:browser` emits. */
const EXPECTED = ['versatiles-style.d.ts', 'versatiles-style.js', 'versatiles-style.js.map'];

/** Well under the real figure (~89 KB), so adding to the bundle never trips it. */
const MIN_BYTES = 20_000;

const present = (await readdir(BUNDLE_DIR)).filter((name) => name.startsWith('versatiles-style.')).sort();

// Named explicitly rather than counted: "three files" would be satisfied by the wrong three, and the
// sourcemap going missing is exactly the kind of loss a count does not describe.
const missing = EXPECTED.filter((name) => !present.includes(name));
if (missing.length > 0) {
	throw new Error(
		`pack-browser: ${BUNDLE_DIR} is missing ${missing.join(', ')} — found ${present.join(', ') || 'nothing'}. ` +
			'Run `npm run build-browser`, which builds the bundle before packing it.'
	);
}

const entries = await Promise.all(
	present.map(async (name) => ({ name, body: await readFile(resolve(BUNDLE_DIR, name)) }))
);

const size = await writeTarball(DESTINATION, entries, { entries: present.length, minBytes: MIN_BYTES });

// Only once the tarball is written and verified: the declaration tree is rollup's scratch space, and
// removing it earlier would take the types with it if the pack failed and had to be rerun.
await rm(resolve(BUNDLE_DIR, 'declaration'), { recursive: true, force: true });

console.log(`Packed ${present.length} files into versatiles-style.tar.gz (${(size / 1024).toFixed(1)} KB).`);

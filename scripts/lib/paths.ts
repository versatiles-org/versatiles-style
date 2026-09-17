/**
 * Where scripts put what they generate.
 *
 * Everything a script writes goes under `.cache/` at the repository root — renders, reports,
 * downloaded styles, sampled tiles. One gitignored directory, so `scripts/` holds source and
 * nothing else, and a stale run is cleared with a single `rm -rf .cache`.
 *
 * The rule this encodes: a script never writes next to its own source. Output that lands in
 * `scripts/` has to be gitignored path by path, and the ignore rules drift out of step with the
 * code that writes them — `scripts/migrate-compare.ts` used to write into `scripts/migrate-compare/`,
 * one character away from being mistaken for its own module directory.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/** Repository root, two levels up from `scripts/lib/`. */
export const ROOT = resolve(import.meta.dirname, '../..');

/** The one directory scripts write to. Gitignored. */
export const CACHE_ROOT = resolve(ROOT, '.cache');

/**
 * `.cache/<name>/…`, created if absent.
 *
 * Pass the segments as arguments rather than as a joined string, so a caller cannot smuggle a
 * `..` past the root by accident.
 */
export function cacheDir(...segments: string[]): string {
	const dir = resolve(CACHE_ROOT, ...segments);
	if (dir !== CACHE_ROOT && !dir.startsWith(CACHE_ROOT + '/')) {
		throw new Error(`cacheDir: ${segments.join('/')} escapes ${CACHE_ROOT}`);
	}
	mkdirSync(dir, { recursive: true });
	return dir;
}

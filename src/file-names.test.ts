import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * Every source file is named in lower-case kebab-case: `satellite-overlay.ts`, `fetch-font-faces.ts`.
 *
 * Nothing enforced it before this test, and the tree had drifted to three styles — 54 kebab-case names,
 * 10 camelCase (`guessStyle.ts`, `loadTileSource.ts`) and one snake_case (`vector_layer.ts`). A file name
 * is not an identifier: the function `guessStyle` lives in `guess-style.ts`.
 *
 * The suffixes that mark a file's role (`.test`, `.e2e.test`, `.d`) are not part of its name. Fixtures
 * and snapshots are data whose names are not ours to choose, and are skipped.
 */

const ROOT = resolve(import.meta.dirname, '..');
const DIRECTORIES = ['src', 'scripts', 'dev'];
const CODE = /\.(ts|js|mjs)$/;
const SKIPPED = new Set(['node_modules', 'fixtures', '__snapshots__']);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The name a file is judged by: its base name without the extension and the role suffixes. */
function stem(file: string): string {
	return file
		.replace(/^.*\//, '')
		.replace(CODE, '')
		.replace(/(\.e2e)?\.test$/, '')
		.replace(/\.d$/, '');
}

/** The files among `files` whose name is not kebab-case. */
function misnamed(files: readonly string[]): string[] {
	return files.filter((file) => !KEBAB.test(stem(file)));
}

function codeFiles(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (SKIPPED.has(entry.name) || entry.name.startsWith('.')) return [];
		const path = resolve(directory, entry.name);
		if (entry.isDirectory()) return codeFiles(path);
		return entry.isFile() && CODE.test(entry.name) ? [relative(ROOT, path)] : [];
	});
}

describe('file names', () => {
	const files = DIRECTORIES.flatMap((directory) => codeFiles(resolve(ROOT, directory)));

	it('covers the tree, so the check below means something', () => {
		expect(files.length).toBeGreaterThan(250);
		expect(files).toContain('src/api/guess-style.ts');
	});

	it('are all kebab-case', () => {
		// on failure: the files to rename
		expect(misnamed(files)).toStrictEqual([]);
	});

	it('reject camelCase, snake_case and capitals, and look past the role suffixes', () => {
		expect(
			misnamed([
				'src/a/guess-style.ts',
				'src/a/guess-style.test.ts',
				'scripts/b/gljs-render.e2e.test.ts',
				'src/c/index.ts',
				'scripts/ci/smoke.mjs',
				'src/a/guessStyle.ts',
				'src/a/vector_layer.test.ts',
				'src/a/Index.ts',
				'src/a/double--dash.ts',
			])
		).toStrictEqual(['src/a/guessStyle.ts', 'src/a/vector_layer.test.ts', 'src/a/Index.ts', 'src/a/double--dash.ts']);
	});
});

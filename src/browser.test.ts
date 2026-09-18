import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import * as browser from './browser.js';

/**
 * The CDN bundle's surface, and what it is allowed to pull in.
 *
 * Two groups of exports are deliberately npm-only, because they serve tooling rather than pages: the
 * authoring helpers (`minimizeOptions`, `toCode`, `validateOptions`) and font discovery. Nothing in the style-building
 * path uses either. (`getStyleVariants` was a third until it moved out of `src` altogether, to
 * `scripts/lib/variants.ts` — the strongest form of this guarantee, and the reason it is not listed
 * here: a module outside `src` cannot be reached by anything in it.)
 *
 * Deleting an export is not enough to keep them out, which is why this test walks the import graph as
 * well as checking the exports. Both `minimize.ts` and `fontCovers.ts` kept contributing bytes after
 * their exports moved, because both do work when the module is evaluated — a constant built by calling
 * three resolvers, a script table built with `Object.freeze` — and a bundler must assume module-level
 * work matters. So a stray import from anywhere the browser entry can reach puts them back, silently
 * and without failing anything else.
 *
 * **This file must not import `./index.js`.** That entry attaches the authoring helpers with
 * `Object.assign` onto the very object `./browser.js` exports, so importing both here would add the
 * methods to the object this test says should not have them.
 */

const SRC = dirname(new URL(import.meta.url).pathname);

/**
 * Modules the browser entry may not even reach, and the export that used to bring each one in.
 *
 * `options/minimize.ts` and `api/code.ts` are deliberately absent from this list: the `options` and
 * `api` barrels re-export them, so they stay *reachable* while contributing nothing once their
 * bindings go unused. That they contribute nothing is the real invariant, and it is checked against
 * the built bundle in `scripts/browser-bundle.e2e.test.ts`, which is the only place it can be seen.
 */
const FORBIDDEN = [
	['lib/fontCovers.ts', 'fontCovers, fontScripts, languageScript, textScripts, FONT_SCRIPTS'],
	['lib/fetchFontFaces.ts', 'fetchFontFaces'],
] as const;

/** Exports that exist on the npm entry and must not exist here. */
const NPM_ONLY = [
	'assertTileJSONSpecification',
	'assertRasterTileJSONSpecification',
	'isTileJSONSpecification',
	'isRasterTileJSONSpecification',
	'fetchFontFaces',
	'fontCovers',
	'fontScripts',
	'languageScript',
	'textScripts',
	'FONT_SCRIPTS',
] as const;

/**
 * Every module reachable from `entry` by following relative imports, as the bundler sees them: a
 * type-only import is erased before the bundle is built, so it cannot pull anything in.
 */
function reachableFrom(entry: string): Set<string> {
	const seen = new Set<string>();
	const queue = [resolve(SRC, entry)];
	while (queue.length > 0) {
		const file = queue.pop()!;
		if (seen.has(file)) continue;
		seen.add(file);
		const source = readFileSync(file, 'utf8');
		for (const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(type\s+)?([\s\S]*?)from\s+'(\.[^']+)'/g)) {
			const [, typeKeyword, clause, specifier] = match;
			if (typeKeyword) continue;
			const braced = /\{([\s\S]*)\}/.exec(clause);
			if (braced) {
				const names = braced[1]
					.split(',')
					.map((name) => name.trim())
					.filter(Boolean);
				if (names.length > 0 && names.every((name) => name.startsWith('type '))) continue;
			}
			let target = resolve(dirname(file), specifier.replace(/\.js$/, '.ts'));
			if (existsSync(target) && statSync(target).isDirectory()) target = resolve(target, 'index.ts');
			if (existsSync(target) && statSync(target).isFile()) queue.push(target);
		}
	}
	return new Set([...seen].map((file) => relative(SRC, file)));
}

describe('the browser entry', () => {
	const reached = reachableFrom('browser.ts');

	it('reaches the style builders, so the walk means something', () => {
		// a positive control: a resolver that followed nothing would pass every check below
		expect(reached).toContain('api/osm.ts');
		expect(reached).toContain('shortbread/layers/index.ts');
		expect(reached.size).toBeGreaterThan(50);
	});

	it.each(FORBIDDEN)('never reaches %s (it came in with %s)', (module) => {
		expect([...reached].filter((file) => file === module)).toStrictEqual([]);
	});

	it.each(NPM_ONLY)('does not export %s', (name) => {
		expect(name in browser).toBe(false);
	});

	it('exports the style builders and the runtime helpers a page needs', () => {
		for (const name of [
			'osm',
			'satellite',
			'guessStyle',
			'guessSchema',
			'inspectorStyle',
			'inlineSources',
			'fetchTileJSON',
		]) {
			expect(typeof (browser as Record<string, unknown>)[name], name).toBe('function');
		}
		expect(typeof browser.Color).toBe('function');
	});

	it('leaves the authoring helpers off osm() and satellite()', () => {
		for (const fn of [browser.osm, browser.satellite]) {
			expect('minimizeOptions' in fn).toBe(false);
			expect('toCode' in fn).toBe(false);
			expect('validateOptions' in fn).toBe(false);
		}
		// what stays on them: everything a page builds a style with
		expect('defaults' in browser.osm).toBe(true);
		expect('colors' in browser.osm).toBe(true);
		expect('slots' in browser.osm).toBe(true);
	});

	it('still builds a style', () => {
		expect(browser.osm({ theme: 'gray' }).layers.length).toBeGreaterThan(200);
	});
});

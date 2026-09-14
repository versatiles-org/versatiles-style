/**
 * Vendor the glyph names the VersaTiles glyph server publishes, as a TypeScript type.
 *
 *   npm run vendor-fonts               # print the module
 *   npm run vendor-fonts -- --write    # write it to src/options/font-names.ts
 *   npm run vendor-fonts -- --check    # is the vendored list still current?
 *   npm run vendor-fonts -- --url https://…/assets/glyphs/font_families.json --check
 *
 * `text.fonts` takes any string, because a custom glyph server names its faces its own way. The
 * generated `KnownFontName` union only makes the VersaTiles faces autocomplete in an editor: it is a
 * type, so nothing reads it at run time and it costs the bundle nothing. A UI that offers faces to pick
 * from must ask the server it styles for (`fetchFontFaces`), not this snapshot.
 *
 * Like `vendor-schema`, this is a script and not a test: the list lives on the glyph server, and the
 * test suite stays offline. Re-run `--check` when the fonts repository publishes a release.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = 'src/options/font-names.ts';
const DEFAULT_URL = 'https://tiles.versatiles.org/assets/glyphs/font_families.json';

type FontFamily = { name: string; faces: { id: string }[] };

/** Every face id in `font_families.json`, sorted, after checking the document's shape. */
function namesOf(families: unknown, url: string): string[] {
	if (!Array.isArray(families)) throw new Error(`${url}: expected an array of font families`);
	const names = new Set<string>();
	for (const family of families as FontFamily[]) {
		if (!Array.isArray(family?.faces)) throw new Error(`${url}: family ${JSON.stringify(family?.name)} has no faces`);
		for (const face of family.faces) {
			if (typeof face?.id !== 'string' || !/^[a-z0-9_]+$/.test(face.id)) {
				throw new Error(`${url}: unexpected face id ${JSON.stringify(face?.id)} in ${JSON.stringify(family.name)}`);
			}
			names.add(face.id);
		}
	}
	if (names.size === 0) throw new Error(`${url} lists no faces`);
	return [...names].sort();
}

function emit(names: string[], url: string): string {
	return [
		'/**',
		' * The glyph names the VersaTiles glyph server publishes — for autocompletion of `text.fonts` only.',
		' * `FontName` still accepts any string, because a custom glyph server names its faces its own way.',
		' *',
		` * Generated from ${url}`,
		' * by `npm run vendor-fonts`. Do not edit by hand; re-run the script instead, and use',
		' * `npm run vendor-fonts -- --check` to find out whether this file has gone stale.',
		' */',
		'export type KnownFontName =',
		...names.map((name, i) => `\t| '${name}'${i === names.length - 1 ? ';' : ''}`),
		'',
	].join('\n');
}

/** The names in an already-generated module. It holds only a type, so it is read as text. */
function vendoredNames(): string[] | undefined {
	try {
		const code = readFileSync(resolve(ROOT, OUT), 'utf8');
		return [...code.matchAll(/^\s*\| '([a-z0-9_]+)'/gm)].map((m) => m[1]).sort();
	} catch {
		return undefined;
	}
}

async function main(): Promise<void> {
	const args = process.argv.slice(2).filter((a) => a !== '--');
	const urlIndex = args.indexOf('--url');
	const url = urlIndex >= 0 ? args[urlIndex + 1] : DEFAULT_URL;
	if (!url) throw new Error('--url needs a value');

	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
	const live = namesOf(await response.json(), url);

	if (args.includes('--check')) {
		const vendored = vendoredNames();
		if (!vendored) {
			console.error(`✗ ${OUT} does not exist — run with --write first.`);
			process.exit(1);
		}
		const added = live.filter((n) => !vendored.includes(n));
		const removed = vendored.filter((n) => !live.includes(n));
		if (added.length === 0 && removed.length === 0) {
			console.log(`✓ ${OUT} matches ${url} (${live.length} faces).`);
			return;
		}
		console.error(`✗ ${OUT} is stale against ${url}:\n`);
		for (const n of added) console.error(`  + ${n}`);
		for (const n of removed) console.error(`  - ${n}`);
		console.error('\nRe-vendor with: npm run vendor-fonts -- --write');
		process.exit(1);
	}

	const code = emit(live, url);
	if (!args.includes('--write')) {
		process.stdout.write(code);
		return;
	}
	const existed = vendoredNames() !== undefined;
	writeFileSync(resolve(ROOT, OUT), code);
	console.log(`${existed ? 'Updated' : 'Created'} ${OUT}: ${live.length} faces. Run \`npm run format\`.`);
}

await main();

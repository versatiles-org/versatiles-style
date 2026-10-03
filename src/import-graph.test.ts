import { afterAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
	ENTRIES,
	avoidableDeepImports,
	directoryGraph,
	findCycles,
	importGraph,
	redundantDeepImports,
} from '../scripts/lib/import-graph.js';

/**
 * The source tree has no import cycles — neither between modules nor between directories.
 *
 * This is a guard with a history. Every cycle fixed in this repository announced itself somewhere other
 * than where it was caused: a `TypeError: mapTopics is not a function` thrown from a module-level
 * initialiser three directories away; a Rollup warning about chunk order; a constant that read as
 * `undefined` only when the entry happened to be imported first. None of them failed a test, because
 * each was harmless until an unrelated import changed the evaluation order.
 *
 * Both checks are on the *runtime* graph. A type-only import is erased before anything runs, so it
 * cannot take part in an initialisation cycle; several directories do still point at each other through
 * types alone, and that is fine.
 *
 * The directory check is the stricter one, and deliberately so. A cycle between two directories is
 * usually a design question — which layer is below the other — while a cycle inside one is usually a
 * detail. Keeping directories acyclic is also what lets a module import a barrel (`../options/`) rather
 * than naming a file to dodge a loop, which is the readable form and the one that stays correct when
 * the loop it was dodging is fixed elsewhere.
 */

describe('the import graph', () => {
	const graph = importGraph();

	it('covers the whole source tree, so the checks below mean something', () => {
		// a positive control: a resolver that followed nothing would report no cycles very convincingly
		expect(graph.size).toBeGreaterThan(100);
		for (const entry of ENTRIES) expect([...graph.keys()]).toContain(entry);
		expect([...graph.get('index.ts')!].length).toBeGreaterThan(3);
	});

	it('detects a cycle when there is one', () => {
		// the detector itself, on a graph with a known loop — so a broken Tarjan cannot pass silently
		const synthetic = new Map([
			['a.ts', new Set(['b.ts'])],
			['b.ts', new Set(['c.ts'])],
			['c.ts', new Set(['a.ts'])],
			['d.ts', new Set(['a.ts'])],
		]);
		expect(findCycles(synthetic)).toStrictEqual([['a.ts', 'b.ts', 'c.ts']]);
	});

	it('has no module cycles', () => {
		// on failure the array below *is* the cycle: every module in it can reach every other
		expect(findCycles(graph)).toStrictEqual([]);
	});

	it('has no deep import that the barrel beside it already covers', () => {
		// `import { minimizeOsmOptions } from '../options/minimize.js'` two lines above a `from '../options/index.js'`
		// that re-exports it. The module is loaded either way, so the deep specifier adds an edge and saves
		// nothing — and the edges it adds are what make the directory graph hard to read.
		//
		// This is the narrow check; the next one forbids crossing into another directory past its barrel at
		// all. What survives both is structural: `shortbread/layers/*.ts` must name `../context.js` because
		// the barrel above them imports `layers/`. See `redundantDeepImports`.
		expect(redundantDeepImports()).toStrictEqual([]);
	});

	it('crosses a directory boundary through that directory’s barrel', () => {
		// The stronger rule, and the one that keeps a directory's internal layout its own business: where a
		// barrel re-exports the module, reach it by the barrel rather than by naming a file inside.
		//
		// That holds whether or not the barrel re-exports the module: one it leaves out is reported too, so
		// the fix is to re-export it there — the rule used to skip such modules, which is how
		// `options/parts/colors.ts` reached `themes/color-keys.ts` directly.
		//
		// Two shapes are out of scope, not exempted, because the barrel is genuinely unavailable there: a
		// child reaching up into its own parent (`shortbread/layers/roads.ts` → `../context.js`, which
		// through `shortbread/index.ts` would be a cycle), and test files, which name the module under test
		// on purpose. What is left is `DEEP_IMPORT_EXEMPTIONS` — deep imports that change what *runs*, each
		// with its reason; there are none. A stale entry there fails this test too.
		expect(avoidableDeepImports()).toStrictEqual([]);
	});

	describe('the barrel rule on a fixture tree', () => {
		// The positive control for the rule above. The real tree has nothing left for it to find, so an empty
		// result there could also mean it matches nothing; this tree has one case of every shape.
		const root = mkdtempSync(join(tmpdir(), 'import-graph-'));
		const files: Record<string, string> = {
			'a/index.ts': "export * from './listed.js';",
			'a/listed.ts': 'export const listed = 1;',
			'a/unlisted.ts': 'export const unlisted = 1;',
			'a/child/up.ts': "import { listed } from '../listed.js';", // child → parent: out of scope
			'nobarrel/leaf.ts': 'export const leaf = 1;',
			'b/sibling.ts': 'export const sibling = 1;',
			'b/user.ts': [
				"import { listed } from '../a/listed.js';",
				"import { unlisted } from '../a/unlisted.js';",
				"import { leaf } from '../nobarrel/leaf.js';",
				"import { sibling } from './sibling.js';", // sibling: fine
				"import { listed as viaBarrel } from '../a/index.js';", // the front door: fine
			].join('\n'),
			'b/user.test.ts': "import { unlisted } from '../a/unlisted.js';", // tests: out of scope
		};
		for (const [path, source] of Object.entries(files)) {
			mkdirSync(dirname(join(root, path)), { recursive: true });
			writeFileSync(join(root, path), source);
		}
		afterAll(() => rmSync(root, { recursive: true, force: true }));

		it('reports a deep import whether the barrel re-exports the module, leaves it out, or is missing', () => {
			expect(avoidableDeepImports({}, root)).toStrictEqual([
				'b/user.ts -> ../a/listed.js (use a/index.ts)',
				'b/user.ts -> ../a/unlisted.js (re-export it from a/index.ts, then use that)',
				'b/user.ts -> ../nobarrel/leaf.js (nobarrel/ has no barrel)',
			]);
		});

		it('honours an exemption, and reports one that no longer applies', () => {
			expect(
				avoidableDeepImports({ 'b/user.ts -> ../a/listed.js': 'why', 'gone.ts -> ./nowhere.js': 'stale' }, root)
			).toStrictEqual([
				'b/user.ts -> ../a/unlisted.js (re-export it from a/index.ts, then use that)',
				'b/user.ts -> ../nobarrel/leaf.js (nobarrel/ has no barrel)',
				'exemption no longer applies: gone.ts -> ./nowhere.js',
			]);
		});
	});

	it('has no directory cycles', () => {
		const directories = directoryGraph(graph);
		const pairs: string[] = [];
		for (const [from, targets] of directories) {
			for (const to of targets) {
				if (from < to && directories.get(to)?.has(from)) pairs.push(`${from} ↔ ${to}`);
			}
		}
		expect(pairs).toStrictEqual([]);
	});
});

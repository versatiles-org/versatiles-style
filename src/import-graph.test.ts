import { describe, expect, it } from 'vitest';
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
		// Deep imports as such are fine: `src/index.ts` names `shortbread/layer-groups-map.js` so the npm
		// entry does not pull in the whole schema, and `shortbread/layers/*.ts` must name `../context.js`
		// because the barrel above them imports `layers/`. Neither also imports the barrel, so neither is
		// reported. See `redundantDeepImports`.
		expect(redundantDeepImports()).toStrictEqual([]);
	});

	it('crosses a directory boundary through that directory’s barrel', () => {
		// The stronger rule, and the one that keeps a directory's internal layout its own business: where a
		// barrel re-exports the module, reach it by the barrel rather than by naming a file inside.
		//
		// Two shapes are out of scope, not exempted, because the barrel is genuinely unavailable there: a
		// child reaching up into its own parent (`shortbread/layers/roads.ts` → `../context.js`, which
		// through `shortbread/index.ts` would be a cycle), and test files, which name the module under test
		// on purpose. What is left is `DEEP_IMPORT_EXEMPTIONS` — deep imports that change what *runs*, of
		// which there is exactly one. A stale entry there fails this test too.
		expect(avoidableDeepImports()).toStrictEqual([]);
	});

	it('finds the deep imports it exempts, and says when an exemption is stale', () => {
		// The positive control for the rule above: exempt nothing and the one entry has to come back, or
		// an empty list up there would mean the check matches nothing rather than that the tree is clean.
		expect(avoidableDeepImports({})).toStrictEqual([
			'index.ts -> ./shortbread/layer-groups-map.js (use shortbread/index.ts)',
		]);
		// and an exemption for an import that no longer exists is a finding of its own
		expect(avoidableDeepImports({ 'gone.ts -> ./nowhere.js': 'stale' })).toContain(
			'exemption no longer applies: gone.ts -> ./nowhere.js'
		);
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

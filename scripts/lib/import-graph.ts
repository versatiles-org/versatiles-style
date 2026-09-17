/**
 * The import graph of the source tree, as a bundler sees it.
 *
 * Used by the tests that guard two invariants: that no module cycle exists (`src/import-graph.test.ts`)
 * and that the CDN bundle's entry cannot reach the tooling modules (`src/browser.test.ts`).
 *
 * "As a bundler sees it" is the whole point of the filtering below. A type-only import is erased before
 * anything is bundled, so it can neither pull a module into the output nor take part in an
 * initialisation cycle — counting it would report loops that cannot happen and hide the ones that can.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

export const SRC = resolve(import.meta.dirname, '../../src');

/** The package's entry points — `package.json` `exports`, plus the CDN bundle's own entry. */
export const ENTRIES = ['index.ts', 'browser.ts', 'omt/index.ts', 'protomaps/index.ts', 'migrate/index.ts'];

/**
 * Resolves a relative specifier the way the build does. Every specifier names a file — a barrel is
 * `'./x/index.js'`, never `'./x/'` — which the `local/no-directory-import` lint rule enforces, so there
 * is no directory case to follow here.
 */
function resolveSpecifier(from: string, specifier: string): string | undefined {
	const target = resolve(dirname(from), specifier.replace(/\.js$/, '.ts'));
	return existsSync(target) && statSync(target).isFile() ? target : undefined;
}

/** The modules `file` imports at runtime: `import type …`, and clauses whose every binding is a type, are erased. */
export function runtimeImports(file: string): Set<string> {
	const found = new Set<string>();
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
		const target = resolveSpecifier(file, specifier);
		if (target) found.add(target);
	}
	return found;
}

/** Every module reachable from `entries`, mapped to what it imports. Paths are relative to `src`. */
export function importGraph(entries: readonly string[] = ENTRIES): Map<string, Set<string>> {
	const graph = new Map<string, Set<string>>();
	const queue = entries.map((entry) => resolve(SRC, entry));
	while (queue.length > 0) {
		const file = queue.pop()!;
		if (graph.has(file)) continue;
		const imports = runtimeImports(file);
		graph.set(file, imports);
		queue.push(...imports);
	}
	return new Map(
		[...graph].map(([file, imports]) => [relative(SRC, file), new Set([...imports].map((i) => relative(SRC, i)))])
	);
}

/** Strongly connected components with more than one member — i.e. the cycles. Tarjan's algorithm. */
export function findCycles(graph: ReadonlyMap<string, ReadonlySet<string>>): string[][] {
	const index = new Map<string, number>();
	const low = new Map<string, number>();
	const onStack = new Set<string>();
	const stack: string[] = [];
	const cycles: string[][] = [];
	let next = 0;

	const visit = (node: string): void => {
		index.set(node, next);
		low.set(node, next);
		next++;
		stack.push(node);
		onStack.add(node);
		for (const child of graph.get(node) ?? []) {
			if (!index.has(child)) {
				visit(child);
				low.set(node, Math.min(low.get(node)!, low.get(child)!));
			} else if (onStack.has(child)) {
				low.set(node, Math.min(low.get(node)!, index.get(child)!));
			}
		}
		if (low.get(node) === index.get(node)) {
			const component: string[] = [];
			let member: string;
			do {
				member = stack.pop()!;
				onStack.delete(member);
				component.push(member);
			} while (member !== node);
			if (component.length > 1) cycles.push(component.sort());
		}
	};

	for (const node of graph.keys()) if (!index.has(node)) visit(node);
	return cycles;
}

/** Every relative specifier `file` imports or re-exports, each flagged with whether it survives to runtime. */
function allImports(file: string): { specifier: string; target: string; runtime: boolean }[] {
	const source = readFileSync(file, 'utf8');
	const found: { specifier: string; target: string; runtime: boolean }[] = [];
	for (const match of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(type\s+)?([\s\S]*?)from\s+'(\.[^']+)'/g)) {
		const [, typeKeyword, clause, specifier] = match;
		const braced = /\{([\s\S]*)\}/.exec(clause);
		const names = braced
			? braced[1]
					.split(',')
					.map((name) => name.trim())
					.filter(Boolean)
			: [];
		const runtime = !typeKeyword && !(names.length > 0 && names.every((name) => name.startsWith('type ')));
		const target = resolveSpecifier(file, specifier);
		if (target) found.push({ specifier, target, runtime });
	}
	return found;
}

/** Whether `barrel` re-exports `target`, following `export * from './other/index.js'` chains. */
function reExports(barrel: string, target: string, seen = new Set<string>()): boolean {
	if (seen.has(barrel)) return false;
	seen.add(barrel);
	for (const match of readFileSync(barrel, 'utf8').matchAll(
		/(?:^|\n)\s*export\s+(?:type\s+)?(?:\*|\{[\s\S]*?\})\s*(?:as\s+\w+\s+)?from\s+'(\.[^']+)'/g
	)) {
		const next = resolveSpecifier(barrel, match[1]);
		if (!next) continue;
		if (next === target) return true;
		if (next.endsWith('/index.ts') && reExports(next, target, seen)) return true;
	}
	return false;
}

/** Every `.ts` file under `src`, tests included. */
function sourceFiles(directory: string = SRC): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = resolve(directory, entry.name);
		if (entry.isDirectory()) return sourceFiles(path);
		return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
	});
}

/**
 * Deep imports that the barrel beside them already covers — `'../options/minimize.js'` in a file whose
 * next line reads `from '../options/index.js'`.
 *
 * Only that exact shape is reported, and every half of it matters. A barrel that does not re-export the
 * module cannot replace the deep import; and where the importing file does *not* already pull the barrel
 * in, the deep import is a real choice — `src/index.ts` names `shortbread/layer-groups-map.js` precisely
 * so that the npm entry does not drag the whole schema in behind it.
 *
 * The last half is that a *value* deep import is only redundant when the barrel is already imported at
 * runtime too. Where the file takes nothing but types from the barrel, that edge is erased and the deep
 * import is what keeps it erased: `src/themes/index.ts` reads `colorOptionsKeys` from the leaf
 * `options/parts/color-keys.js` because the options barrel reaches back into `themes`, and routing that
 * one value through it closes a runtime loop that fails as a temporal-dead-zone error three files away.
 */
export function redundantDeepImports(): string[] {
	const findings: string[] = [];
	for (const file of sourceFiles()) {
		const imports = allImports(file);
		const present = new Set(imports.map((i) => i.target));
		const atRuntime = new Set(imports.filter((i) => i.runtime).map((i) => i.target));
		for (const { specifier, target, runtime } of imports) {
			if (target.endsWith('/index.ts') || dirname(target) === dirname(file)) continue;
			const barrel = resolve(dirname(target), 'index.ts');
			if (!existsSync(barrel) || !reExports(barrel, target)) continue;
			if (!(runtime ? atRuntime.has(barrel) : present.has(barrel))) continue;
			findings.push(`${relative(SRC, file)} imports '${specifier}', but already imports ${relative(SRC, barrel)}`);
		}
	}
	return findings.sort();
}

/** The same graph one level up: `options/parts/urls.ts` counts as `options`. Self-edges are dropped. */
export function directoryGraph(graph: ReadonlyMap<string, ReadonlySet<string>>): Map<string, Set<string>> {
	const directoryOf = (file: string): string => {
		const parts = file.split('/');
		return parts.length > 1 ? parts[0] : '.';
	};
	const directories = new Map<string, Set<string>>();
	for (const [file, imports] of graph) {
		const from = directoryOf(file);
		const targets = directories.get(from) ?? new Set<string>();
		for (const imported of imports) {
			const to = directoryOf(imported);
			if (to !== from) targets.add(to);
		}
		directories.set(from, targets);
	}
	return directories;
}

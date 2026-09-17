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

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

export const SRC = resolve(import.meta.dirname, '../../src');

/** The package's entry points — `package.json` `exports`, plus the CDN bundle's own entry. */
export const ENTRIES = ['index.ts', 'browser.ts', 'omt/index.ts', 'protomaps/index.ts', 'migrate/index.ts'];

/** Resolves a relative specifier the way the build does, following a directory to its barrel. */
function resolveSpecifier(from: string, specifier: string): string | undefined {
	let target = resolve(dirname(from), specifier.replace(/\.js$/, '.ts'));
	if (existsSync(target) && statSync(target).isDirectory()) target = resolve(target, 'index.ts');
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

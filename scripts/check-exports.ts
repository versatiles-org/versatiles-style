/**
 * Checks that the public library entry point (`src/index.ts`) exports every
 * locally-defined type that is reachable from its public API surface.
 *
 * Motivation: functions and types re-exported from `src/index.ts` may reference
 * other types defined under `src/` (e.g. an option sub-type). If such a type is
 * not itself re-exported, consumers of the published package cannot name it,
 * even though it appears in the public signatures. This script walks the type
 * graph starting at the exported symbols and flags any local type that is
 * reachable but not exported.
 *
 * Exits with code 1 (and a report) when something is missing, 0 otherwise.
 */
import ts from 'typescript';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const ENTRY = resolve(ROOT, 'src/index.ts');
const SRC_DIR = resolve(ROOT, 'src') + sep;

/** Type-defining symbol flags (as opposed to plain values). */
const NAMED_TYPE_FLAGS =
	ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface | ts.SymbolFlags.Enum | ts.SymbolFlags.Class;

/** Local types that are intentionally not exported and should not be reported. */
const ALLOWLIST = new Set<string>([]);

function loadProgram(): ts.Program {
	const configPath = resolve(ROOT, 'tsconfig.json');
	const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
	const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
	return ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
}

const program = loadProgram();
const checker = program.getTypeChecker();

const entry = program.getSourceFile(ENTRY);
if (!entry) throw new Error(`Could not load entry point ${ENTRY}`);
const moduleSymbol = checker.getSymbolAtLocation(entry);
if (!moduleSymbol) throw new Error(`Could not resolve module symbol for ${ENTRY}`);

function resolveAlias(sym: ts.Symbol): ts.Symbol {
	return sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
}

function keyOf(sym: ts.Symbol): string {
	const decl = sym.declarations?.[0];
	if (!decl) return `sym:${sym.getName()}`;
	const sf = decl.getSourceFile();
	return `${sf.fileName}:${decl.pos}:${sym.getName()}`;
}

function isLocal(sym: ts.Symbol): boolean {
	return (
		sym.declarations?.some((d) => {
			const f = d.getSourceFile().fileName;
			return f.startsWith(SRC_DIR) && !f.endsWith('.d.ts');
		}) ?? false
	);
}

function definedIn(sym: ts.Symbol): string {
	const f = sym.declarations?.[0]?.getSourceFile().fileName ?? '?';
	return f.startsWith(ROOT + sep) ? f.slice(ROOT.length + 1) : f;
}

/** The named type-alias/interface/enum/class symbol a type refers to, if any. */
function namedTypeSymbol(type: ts.Type): ts.Symbol | undefined {
	const sym = type.aliasSymbol ?? type.getSymbol();
	if (!sym || sym.getName() === '__type') return undefined;
	return sym.flags & NAMED_TYPE_FLAGS ? sym : undefined;
}

// ── Build the set of exported symbols and seed the walk ─────────────────────────

const exportedKeys = new Set<string>();
const queue: { sym: ts.Symbol; via: string }[] = [];
for (const raw of checker.getExportsOfModule(moduleSymbol)) {
	const sym = resolveAlias(raw);
	exportedKeys.add(keyOf(sym));
	queue.push({ sym, via: '(entry)' });
}

const visited = new Set<string>();
const missing = new Map<string, { sym: ts.Symbol; via: string }>();

function record(sym: ts.Symbol, via: string): void {
	const key = keyOf(sym);
	if (!exportedKeys.has(key) && !ALLOWLIST.has(sym.getName()) && !missing.has(key)) {
		missing.set(key, { sym, via });
	}
	if (!visited.has(key)) queue.push({ sym, via: sym.getName() });
}

function isReferenceType(type: ts.Type): boolean {
	return (
		(type.flags & ts.TypeFlags.Object) !== 0 && ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
	);
}

function walkType(type: ts.Type, isRoot: boolean, via: string, seen: Set<ts.Type>): void {
	// `seen` is scoped to a single root expansion and only guards against
	// structural cycles. Cross-symbol dedup happens via `visited`, so a named
	// type recorded here is still fully expanded later when it is dequeued.
	if (seen.has(type)) return;
	seen.add(type);

	if (!isRoot) {
		const named = namedTypeSymbol(type);
		if (named) {
			// Stop at any named type: record local ones, ignore external ones.
			if (isLocal(named)) record(named, via);
			return;
		}
	}

	// Generic arguments (both alias-level `Foo<Bar>` and reference-level).
	type.aliasTypeArguments?.forEach((t) => walkType(t, false, via, seen));
	if (isReferenceType(type)) {
		checker.getTypeArguments(type as ts.TypeReference).forEach((t) => walkType(t, false, via, seen));
	}

	if (type.isUnionOrIntersection()) {
		type.types.forEach((t) => walkType(t, false, via, seen));
		return;
	}

	// Only object types have members worth expanding.
	if ((type.flags & ts.TypeFlags.Object) === 0) return;

	for (const prop of type.getProperties()) {
		const decl = prop.valueDeclaration ?? prop.declarations?.[0] ?? entry!;
		walkType(checker.getTypeOfSymbolAtLocation(prop, decl), false, via, seen);
	}
	for (const sig of [...type.getCallSignatures(), ...type.getConstructSignatures()]) {
		for (const p of sig.getParameters()) {
			const decl = p.valueDeclaration ?? p.declarations?.[0] ?? entry!;
			walkType(checker.getTypeOfSymbolAtLocation(p, decl), false, via, seen);
		}
		walkType(sig.getReturnType(), false, via, seen);
	}
	const numIndex = type.getNumberIndexType();
	if (numIndex) walkType(numIndex, false, via, seen);
	const strIndex = type.getStringIndexType();
	if (strIndex) walkType(strIndex, false, via, seen);
}

function typesOfSymbol(sym: ts.Symbol): ts.Type[] {
	const types: ts.Type[] = [];
	if (sym.flags & NAMED_TYPE_FLAGS) types.push(checker.getDeclaredTypeOfSymbol(sym));
	const decl = sym.valueDeclaration ?? sym.declarations?.[0];
	if (decl && sym.flags & ts.SymbolFlags.Value) types.push(checker.getTypeOfSymbolAtLocation(sym, decl));
	return types;
}

while (queue.length) {
	const { sym } = queue.shift()!;
	const key = keyOf(sym);
	if (visited.has(key)) continue;
	visited.add(key);
	for (const type of typesOfSymbol(sym)) walkType(type, true, sym.getName(), new Set<ts.Type>());
}

// ── Report ──────────────────────────────────────────────────────────────────

if (missing.size === 0) {
	console.log(`✓ All ${exportedKeys.size} public exports are self-contained — no missing type exports.`);
	process.exit(0);
}

console.error(`✗ ${missing.size} type(s) are reachable from the public API but not exported by src/index.ts:\n`);
const rows = [...missing.values()].sort((a, b) => a.sym.getName().localeCompare(b.sym.getName()));
for (const { sym, via } of rows) {
	console.error(`  • ${sym.getName()}  (${definedIn(sym)})  — referenced via ${via}`);
}
console.error(`\nEither re-export these from src/index.ts, or add them to the ALLOWLIST in scripts/check-exports.ts.`);
process.exit(1);

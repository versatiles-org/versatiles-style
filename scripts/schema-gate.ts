/**
 * The schema decision gate: what would it take for another tileset schema to carry this cartography?
 *
 *   npm run schema-gate                  # every vendored schema
 *   npm run schema-gate -- omt           # just one
 *   npm run schema-gate -- omt --verbose # also list every group and every unbound layer
 *
 * This is SCHEMA-SUPPORT-PLAN.md §7 step 2 — the cheapest step in the whole plan, and the one worth
 * being willing to stop at. It runs the *existing* conformance audit with the *existing* Shortbread
 * style against another schema's vendored record, so it costs nothing and needs no cartography.
 *
 * ── The two views, and why the first one is not the answer ────────────────────
 *
 * **Raw** points the style at the other record unchanged. It always reports near-total failure,
 * because the two schemas share no layer names — it measures vocabulary, not capability. It is printed
 * because it is the honest mechanical result, and because the control run (Shortbread against
 * Shortbread, which must be clean) proves the harness works.
 *
 * **Mapped** applies the candidate mapping in `scripts/config/schema-mapping.ts` and reports, per
 * layer group, whether the concept survives the translation:
 *
 *   portable   — every source-layer it reads maps exactly; a rename and a filter rewrite.
 *   re-derive  — the concept exists but is decomposed differently or loses a field the style reads,
 *                so the cartography has to be rewritten rather than re-pointed.
 *   blocked    — a source-layer it needs has no counterpart at all. This is what §9's stop criterion
 *                counts: abandon if more than a handful of groups land here.
 *
 * The mapping is a reviewed-by-nobody hypothesis; its own header says so, and the gate validates what
 * it mechanically can (every source-layer covered, every target actually present in the record).
 */
import process from 'node:process';
import { osm } from '../src/index.js';
import { getLayerGroupMap } from '../src/shortbread/layer-groups-map.js';
import { auditSchema, auditGroupBinding, schemaUsage, type SchemaRecord } from '../src/lib/schema-audit.js';
import { SHORTBREAD_SCHEMA } from '../src/shortbread/schema.js';
import { OMT_SCHEMA } from '../src/omt/schema.js';
import { MAPPINGS, type Confidence, type LayerMapping } from './config/schema-mapping.js';

/** Every vendored schema record, keyed by the name `npm run vendor-schema` uses. */
const SCHEMAS: Record<string, SchemaRecord> = {
	shortbread: SHORTBREAD_SCHEMA,
	omt: OMT_SCHEMA,
};

/** The schema the current cartography was written for; auditing it against itself is the control. */
const NATIVE = 'shortbread';

const args = process.argv.slice(2).filter((a) => a !== '--');
const verbose = args.includes('--verbose');
const names = args.filter((a) => !a.startsWith('--'));
const targets = names.length > 0 ? names : Object.keys(SCHEMAS);

/** Built with every feature on, so no layer is missing from the audit. */
const style = osm({ features: { buildings: 'extruded', landcover: true } });
const groups = getLayerGroupMap();
const usage = schemaUsage(style);

/** Source-layer of every emitted layer, for the per-group verdict. */
const sourceLayerOf = new Map<string, string | undefined>(
	style.layers.map((l) => [l.id, (l as { 'source-layer'?: string })['source-layer']])
);

const pct = (part: number, whole: number): string => (whole === 0 ? '—' : `${Math.round((part / whole) * 100)}%`);

/** A group's verdict is the worst verdict among the source-layers its layers read. */
type Verdict = 'portable' | 're-derive' | 'blocked';
const RANK: Record<Verdict, number> = { portable: 0, 're-derive': 1, blocked: 2 };
const VERDICT_OF: Record<Confidence, Verdict> = { exact: 'portable', partial: 're-derive', none: 'blocked' };

function rawReport(name: string, schema: SchemaRecord): void {
	const audit = auditSchema(style, schema);
	const bindings = auditGroupBinding(style, schema, groups).filter((b) => b.dataLayers > 0);
	const unbound = bindings.filter((b) => b.bound === 0);
	const partial = bindings.filter((b) => b.bound > 0 && b.bound < b.dataLayers);
	const read = audit.usage.size;

	console.log(`  RAW — the style pointed at this record unchanged\n`);
	console.log(`    source-layers in the record      : ${Object.keys(schema).length}`);
	console.log(`    source-layers the style reads    : ${read}`);
	console.log(
		`    …this record lacks               : ${audit.unknownSourceLayers.length} (${pct(audit.unknownSourceLayers.length, read)})`
	);
	console.log(
		`    field reads that would fail      : ${audit.unknownFields.length} silent, ${audit.missingLanguageFields.length} language`
	);
	console.log(`    layers drawn before their data   : ${audit.drawnBeforeData.length}`);
	console.log(`    record layers nothing reads      : ${audit.unrendered.length}`);
	console.log(
		`    groups bound / partial / unbound : ${bindings.length - unbound.length - partial.length} / ${partial.length} / ${unbound.length}`
	);

	if (name === NATIVE) {
		const clean =
			audit.unknownSourceLayers.length === 0 &&
			audit.unknownFields.length === 0 &&
			audit.missingLanguageFields.length === 0 &&
			audit.drawnBeforeData.length === 0 &&
			unbound.length === 0;
		console.log(
			`\n    ${clean ? '✓ control is clean — the harness measures what it claims to' : '✗ CONTROL IS DIRTY — fix this before reading any other column'}`
		);
	}
	if (audit.unrendered.length > 0 && name !== NATIVE) {
		console.log(`\n    Source-layers ${name} carries that nothing in this style reads:\n`);
		for (const id of audit.unrendered) {
			console.log(
				`      + ${id.padEnd(22)} z${schema[id].minzoom}–${schema[id].maxzoom}, ${schema[id].fields.length} fields`
			);
		}
	}
	if (verbose && audit.unknownSourceLayers.length > 0) {
		console.log(`\n    Source-layers the style reads and ${name} lacks:\n`);
		for (const id of audit.unknownSourceLayers) {
			const readers = style.layers.filter((l) => sourceLayerOf.get(l.id) === id);
			console.log(`      - ${id.padEnd(22)} ${String(readers.length).padStart(3)} layers`);
		}
	}
}

function mappedReport(name: string, schema: SchemaRecord, mapping: Record<string, LayerMapping>): void {
	console.log(`\n  MAPPED — via scripts/config/schema-mapping.ts (a hypothesis; see its header)\n`);

	// Mechanical validation of the mapping table itself. Neither check can confirm the mapping is
	// *right*, only that it is complete and points at layers that exist.
	const uncovered = [...usage.keys()].filter((id) => !(id in mapping)).sort();
	const danglingTargets = Object.entries(mapping)
		.flatMap(([from, m]) => m.targets.filter((t) => !(t in schema)).map((t) => `${from} → ${t}`))
		.sort();
	const miscounted = Object.entries(mapping)
		.filter(([, m]) => (m.confidence === 'none') !== (m.targets.length === 0))
		.map(([from]) => from)
		.sort();
	if (uncovered.length > 0) console.log(`    ✗ not in the mapping: ${uncovered.join(', ')}`);
	if (danglingTargets.length > 0) console.log(`    ✗ targets absent from the record: ${danglingTargets.join(', ')}`);
	if (miscounted.length > 0) console.log(`    ✗ confidence disagrees with targets: ${miscounted.join(', ')}`);
	if (uncovered.length + danglingTargets.length + miscounted.length === 0) {
		console.log(`    ✓ mapping covers all ${usage.size} source-layers the style reads, and every target exists\n`);
	} else {
		console.log('');
	}

	// Per group: one verdict, plus how much of the group the blocked part actually is.
	//
	// "Worst source-layer wins" alone is too harsh: `labels.streets` reads 12 layers, of which exactly
	// one comes from `streets_polygons_labels`, so calling the whole group absent would overstate a
	// concept that is 11/12 present. A group is therefore only `blocked` when *every* data layer it
	// controls is blocked; when some are, it is `re-derive` and the loss is reported as a count.
	type GroupVerdict = {
		group: string;
		verdict: Verdict;
		layers: number;
		blockedLayers: number;
		blockedBy: string[];
		reDerive: string[];
	};
	const verdicts: GroupVerdict[] = [];
	const walk = (node: Record<string, unknown>, path: string[]): void => {
		for (const [key, value] of Object.entries(node)) {
			const here = [...path, key];
			if (Array.isArray(value)) {
				let layers = 0;
				let blockedLayers = 0;
				let worst: Verdict = 'portable';
				const blockedBy = new Set<string>();
				const reDerive = new Set<string>();
				for (const id of value as string[]) {
					const sourceLayer = sourceLayerOf.get(id);
					if (sourceLayer === undefined) continue;
					layers++;
					const confidence = mapping[sourceLayer]?.confidence ?? 'none';
					const verdict = VERDICT_OF[confidence];
					if (verdict === 'blocked') {
						blockedLayers++;
						blockedBy.add(sourceLayer);
					}
					if (verdict === 're-derive') reDerive.add(sourceLayer);
					if (RANK[verdict] > RANK[worst]) worst = verdict;
				}
				if (layers > 0) {
					verdicts.push({
						group: here.join('.'),
						// Partly blocked is re-derivable: the remaining layers still carry the concept.
						verdict: worst === 'blocked' && blockedLayers < layers ? 're-derive' : worst,
						layers,
						blockedLayers,
						blockedBy: [...blockedBy].sort(),
						reDerive: [...reDerive].sort(),
					});
				}
			} else if (value && typeof value === 'object') {
				walk(value as Record<string, unknown>, here);
			}
		}
	};
	walk(groups as Record<string, unknown>, []);
	verdicts.sort((a, b) => RANK[b.verdict] - RANK[a.verdict] || a.group.localeCompare(b.group));

	const count = (v: Verdict) => verdicts.filter((g) => g.verdict === v).length;
	const partlyBlocked = verdicts.filter((g) => g.verdict !== 'blocked' && g.blockedLayers > 0);
	console.log(`    layer groups carrying data         : ${verdicts.length}`);
	console.log(`    portable (rename + filter)         : ${count('portable')}`);
	console.log(`    re-derive (concept cut differently): ${count('re-derive')}`);
	console.log(`    BLOCKED (concept wholly absent)    : ${count('blocked')}`);

	const blocked = verdicts.filter((g) => g.verdict === 'blocked');
	if (blocked.length > 0) {
		console.log(`\n    Groups ${name} cannot carry at all — §9's stop criterion counts these:\n`);
		for (const g of blocked) {
			console.log(
				`      ✗ ${g.group.padEnd(30)} all ${String(g.layers).padStart(3)} layers   no counterpart for: ${g.blockedBy.join(', ')}`
			);
		}
	}
	if (partlyBlocked.length > 0) {
		console.log(`\n    Groups that survive but lose part of themselves:\n`);
		for (const g of partlyBlocked) {
			console.log(
				`      ~ ${g.group.padEnd(30)} ${String(g.blockedLayers).padStart(3)}/${g.layers} layers lost   no counterpart for: ${g.blockedBy.join(', ')}`
			);
		}
	}
	if (verbose) {
		console.log(`\n    Every group:\n`);
		for (const g of verdicts) {
			const mark = { portable: '✓', 're-derive': '~', blocked: '✗' }[g.verdict];
			const why = [...g.blockedBy, ...g.reDerive].join(', ');
			console.log(
				`      ${mark} ${g.group.padEnd(30)} ${String(g.layers).padStart(3)} layers   ${g.verdict.padEnd(9)} ${why}`
			);
		}
	}

	console.log(`\n    Per source-layer:\n`);
	for (const id of [...usage.keys()].sort()) {
		const m = mapping[id];
		const mark = m ? { exact: '✓', partial: '~', none: '✗' }[m.confidence] : '?';
		const to = m && m.targets.length > 0 ? m.targets.join(' + ') : '—';
		const layers = style.layers.filter((l) => sourceLayerOf.get(l.id) === id).length;
		console.log(
			`      ${mark} ${id.padEnd(24)} ${String(layers).padStart(3)} layers → ${to.padEnd(32)} ${m?.note ?? 'no mapping entry'}`
		);
	}
}

for (const name of targets) {
	const schema = SCHEMAS[name];
	if (!schema) {
		console.error(`Unknown schema "${name}". Known: ${Object.keys(SCHEMAS).join(', ')}`);
		process.exit(1);
	}
	console.log(`\n══ ${name}${name === NATIVE ? '  (control — the schema this cartography was written for)' : ''} ══\n`);
	rawReport(name, schema);
	const mapping = MAPPINGS[name];
	if (mapping) mappedReport(name, schema, mapping);
}

console.log('');

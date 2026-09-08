/**
 * Diff two sets of VersaTiles styles, property by property.
 *
 * Two modes, same engine:
 *
 *   Published v5 → working tree — did the v6 rewrite change what we ship?
 *     npm run compare                       # all mapped pairs → report.md
 *     npm run compare -- colorful --full    # one pair, list every changed layer
 *     npm run compare -- --refresh          # re-download the v5 styles
 *
 *   Baseline → working tree — did *this* change do more than I intended?
 *     npm run compare -- --save-baseline    # snapshot every variant as it is now
 *     npm run compare -- --baseline         # diff the working tree against it
 *
 * The baseline mode exists because `style-snapshot.test.ts` deliberately snapshots only the
 * shape of a style (layer ids and types), not paint/layout — so colour, opacity and zoom-ramp
 * edits pass it unnoticed. Save a baseline before a styling change, diff after, and every
 * altered property is listed for review.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm, satellite } from '../../src/index.js';
import { getStyleVariants } from '../../src/variants.js';
import { diffStyles, type StyleDiff, type ValueChange } from './diff.js';

const V5_BASE = 'https://tiles.versatiles.org/assets/styles';
const DIR = new URL('.', import.meta.url).pathname;
const CACHE_DIR = resolve(DIR, 'styles');
const BASELINE_DIR = resolve(DIR, 'baseline');

/** Examples shown per aggregated property change unless `--full` is given. */
const SAMPLE = 4;

interface Pair {
	/** Published v5 style name under `/assets/styles/<name>/style.json`. */
	v5: string;
	/** How API_DESIGN.md's migration table says to reproduce it in v6. */
	build: () => StyleSpecification | Promise<StyleSpecification>;
	note?: string;
}

const PAIRS: Pair[] = [
	{ v5: 'colorful', build: () => osm({ theme: 'colorful' }) },
	{ v5: 'graybeard', build: () => osm({ theme: { palette: 'gray' } }) },
	{ v5: 'shadow', build: () => osm({ theme: { palette: 'gray', darkMode: true } }) },
	{
		v5: 'eclipse',
		build: () => osm({ theme: { darkMode: true } }),
		note: 'migration table marks this mapping "approximate"',
	},
	{
		v5: 'satellite',
		// Bare satellite() currently emits no overlay at all (blocker A1), which would
		// make the diff meaningless. Compare against the overlay the v5 style actually has.
		build: () => satellite({ osmOverlay: {} }),
		note: 'built with `osmOverlay: {}` — bare `satellite()` produces no overlay on this branch (A1)',
	},
];

const UNMAPPED = ['neutrino', 'empty'];

async function fetchV5(name: string, refresh: boolean): Promise<StyleSpecification> {
	mkdirSync(CACHE_DIR, { recursive: true });
	const file = resolve(CACHE_DIR, `style.${name}.json`);
	if (!refresh && existsSync(file)) {
		return JSON.parse(readFileSync(file, 'utf8')) as StyleSpecification;
	}
	const url = `${V5_BASE}/${name}/style.json`;
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
	const text = await response.text();
	writeFileSync(file, text);
	return JSON.parse(text) as StyleSpecification;
}

/** Variant names contain a `/` (`colorful/style`), so baseline files nest in subdirectories. */
function baselineFile(name: string): string {
	return resolve(BASELINE_DIR, `${name}.json`);
}

function short(value: unknown, max = 90): string {
	if (value === undefined) return '_absent_';
	const s = JSON.stringify(value);
	return '`' + (s.length > max ? s.slice(0, max - 1) + '…' : s) + '`';
}

/** Group per-layer changes by property path — the only way this stays readable at 300 layers. */
function aggregate(diff: StyleDiff): Map<string, { layers: string[]; example: ValueChange }> {
	const byPath = new Map<string, { layers: string[]; example: ValueChange }>();
	for (const layer of diff.layers.changed) {
		for (const change of layer.changes) {
			const entry = byPath.get(change.path);
			if (entry) entry.layers.push(layer.id);
			else byPath.set(change.path, { layers: [layer.id], example: change });
		}
	}
	return byPath;
}

interface RenderOptions {
	title: string;
	note?: string;
	leftLabel: string;
	rightLabel: string;
	full: boolean;
}

function renderDiff(diff: StyleDiff, o: RenderOptions): string {
	const out: string[] = [];
	const L = diff.layers;
	out.push(`## \`${o.title}\``);
	if (o.note) out.push(`> ${o.note}`);
	out.push('');
	out.push(
		`Layers: **${L.leftCount} → ${L.rightCount}** ` +
			`(${L.onlyLeft.length} removed, ${L.onlyRight.length} added, ${L.changed.length} changed, ${L.reordered.length} reordered)`
	);
	out.push('');

	if (diff.root.length > 0) {
		out.push('### Root properties', '');
		out.push(`| property | ${o.leftLabel} | ${o.rightLabel} |`, '| --- | --- | --- |');
		for (const c of diff.root) out.push(`| \`${c.path}\` | ${short(c.left)} | ${short(c.right)} |`);
		out.push('');
	}

	if (diff.sources.onlyLeft.length || diff.sources.onlyRight.length || diff.sources.changed.length) {
		out.push('### Sources', '');
		if (diff.sources.onlyLeft.length)
			out.push(`- **Removed:** ${diff.sources.onlyLeft.map((s) => `\`${s}\``).join(', ')}`);
		if (diff.sources.onlyRight.length)
			out.push(`- **Added:** ${diff.sources.onlyRight.map((s) => `\`${s}\``).join(', ')}`);
		for (const s of diff.sources.changed) {
			out.push(`- \`${s.id}\`:`);
			for (const c of s.changes) out.push(`  - \`${c.path}\`: ${short(c.left)} → ${short(c.right)}`);
		}
		out.push('');
	}

	// Layers present on the left and gone on the right are the strongest regression
	// signal: something that is drawn today and would stop being drawn.
	if (L.onlyLeft.length > 0) {
		out.push(`### Layers in ${o.leftLabel} but not ${o.rightLabel} — ${L.onlyLeft.length}`, '');
		out.push(L.onlyLeft.map((id) => `\`${id}\``).join(', '), '');
	}

	if (L.onlyRight.length > 0) {
		out.push(`### Layers in ${o.rightLabel} but not ${o.leftLabel} — ${L.onlyRight.length}`, '');
		out.push(L.onlyRight.map((id) => `\`${id}\``).join(', '), '');
	}

	const byPath = aggregate(diff);
	if (byPath.size > 0) {
		out.push('### Changed properties, by frequency', '');
		out.push(`| property | layers | example (${o.leftLabel} → ${o.rightLabel}) |`, '| --- | --- | --- |');
		const rows = [...byPath.entries()].sort((a, b) => b[1].layers.length - a[1].layers.length);
		for (const [path, { layers, example }] of rows) {
			out.push(`| \`${path}\` | ${layers.length} | ${short(example.left, 50)} → ${short(example.right, 50)} |`);
		}
		out.push('');

		out.push(o.full ? '### Every changed layer' : `### Changed layers (first ${SAMPLE} per property)`, '');
		for (const [path, { layers }] of rows) {
			const shown = o.full ? layers : layers.slice(0, SAMPLE);
			const more = layers.length - shown.length;
			out.push(`- \`${path}\`: ${shown.map((id) => `\`${id}\``).join(', ')}${more > 0 ? ` _(+${more} more)_` : ''}`);
		}
		out.push('');
	}

	return out.join('\n');
}

/** Snapshot every published variant as the working tree currently builds it. */
async function saveBaseline(): Promise<void> {
	const variants = getStyleVariants();
	for (const variant of variants) {
		const style = await variant.build();
		const file = baselineFile(variant.name);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, JSON.stringify(style, null, 2));
	}
	console.log(`Baseline saved: ${variants.length} variants in ${BASELINE_DIR}`);
	console.log('Make your change, then run `npm run compare -- --baseline`.');
}

/** Diff the working tree against a saved baseline, across every published variant. */
async function compareBaseline(full: boolean, names: string[]): Promise<void> {
	if (!existsSync(BASELINE_DIR)) {
		console.error('No baseline found. Run `npm run compare -- --save-baseline` first.');
		process.exitCode = 1;
		return;
	}
	const variants = getStyleVariants().filter((v) => names.length === 0 || names.includes(v.name));
	const report: string[] = [
		'# Baseline → working tree',
		'',
		`Generated ${new Date().toISOString()}. Baseline from \`${BASELINE_DIR}\`.`,
		'',
		'Covers every published variant. An empty report means this change altered nothing that',
		'ends up in a shipped style; anything listed should be an intended consequence.',
		'',
	];

	let changedVariants = 0;
	let missing = 0;
	for (const variant of variants) {
		const file = baselineFile(variant.name);
		if (!existsSync(file)) {
			missing++;
			continue;
		}
		const before = JSON.parse(readFileSync(file, 'utf8')) as StyleSpecification;
		const after = await variant.build();
		const diff = diffStyles(before, after);
		const touched =
			diff.root.length > 0 ||
			diff.layers.changed.length > 0 ||
			diff.layers.onlyLeft.length > 0 ||
			diff.layers.onlyRight.length > 0 ||
			diff.sources.changed.length > 0;
		if (!touched) continue;
		changedVariants++;
		report.push(
			renderDiff(diff, { title: variant.name, leftLabel: 'baseline', rightLabel: 'working tree', full }),
			'---',
			''
		);
		console.log(
			`${variant.name}: ${diff.layers.changed.length} layers changed, ` +
				`-${diff.layers.onlyLeft.length} +${diff.layers.onlyRight.length}`
		);
	}

	const out = resolve(DIR, 'report-baseline.md');
	writeFileSync(out, report.join('\n'));
	if (missing > 0) console.log(`${missing} variant(s) had no baseline file — re-run --save-baseline.`);
	console.log(
		changedVariants === 0
			? '\nNo variant changed against the baseline.'
			: `\n${changedVariants} variant(s) changed. Report written to ${out}`
	);
}

/** Diff the published v5 styles against what the working tree builds. */
async function compareV5(full: boolean, refresh: boolean, names: string[]): Promise<void> {
	const pairs = names.length > 0 ? PAIRS.filter((p) => names.includes(p.v5)) : PAIRS;
	if (pairs.length === 0) {
		console.error(`No matching pair. Known: ${PAIRS.map((p) => p.v5).join(', ')}`);
		process.exitCode = 1;
		return;
	}

	const report: string[] = [
		'# v5 → v6 style diff',
		'',
		`Generated ${new Date().toISOString()} — v5 from \`${V5_BASE}\`, v6 built from this working tree.`,
		'',
		'Both sides are normalized before comparison (legacy `{stops}` functions lowered to',
		'`interpolate`/`step` expressions, colors canonicalized to hex), so only real differences',
		'are listed. See `scripts/compare/normalize.ts`.',
		'',
		`Not compared — no documented v6 equivalent: ${UNMAPPED.map((n) => `\`${n}\``).join(', ')}.`,
		'',
	];

	for (const pair of pairs) {
		process.stdout.write(`comparing ${pair.v5}… `);
		const [before, after] = await Promise.all([fetchV5(pair.v5, refresh), pair.build()]);
		const diff = diffStyles(before, after);
		report.push(
			renderDiff(diff, { title: pair.v5, note: pair.note, leftLabel: 'v5', rightLabel: 'v6', full }),
			'---',
			''
		);
		const L = diff.layers;
		console.log(
			`${L.leftCount}→${L.rightCount} layers, -${L.onlyLeft.length} +${L.onlyRight.length}, ${L.changed.length} changed`
		);
	}

	const out = resolve(DIR, 'report.md');
	writeFileSync(out, report.join('\n'));
	console.log(`\nReport written to ${out}`);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const full = args.includes('--full');
	const refresh = args.includes('--refresh');
	const names = args.filter((a) => !a.startsWith('--'));

	if (args.includes('--save-baseline')) return saveBaseline();
	if (args.includes('--baseline')) return compareBaseline(full, names);
	return compareV5(full, refresh, names);
}

await main();

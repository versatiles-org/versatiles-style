/**
 * Compare the published v5 styles against the styles this branch produces.
 *
 * Every regression found in the v6 satellite style was found by diffing real
 * output; this does the same for the vector styles, which are the main product.
 *
 *   npx tsx scripts/compare/compare.ts               # all pairs, writes report.md
 *   npx tsx scripts/compare/compare.ts colorful       # one pair
 *   npx tsx scripts/compare/compare.ts --refresh      # ignore the cached v5 styles
 *   npx tsx scripts/compare/compare.ts --full         # list every changed layer, not a sample
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm, satellite } from '../../src/index.js';
import { diffStyles, type StyleDiff, type ValueChange } from './diff.js';

const V5_BASE = 'https://tiles.versatiles.org/assets/styles';
const DIR = new URL('.', import.meta.url).pathname;
const CACHE_DIR = resolve(DIR, 'styles');
const REPORT = resolve(DIR, 'report.md');

/** Examples shown per aggregated property change unless `--full` is given. */
const SAMPLE = 4;

interface Pair {
	/** Published v5 style name under `/assets/styles/<name>/style.json`. */
	v5: string;
	/** How API_DESIGN.md's migration table says to reproduce it in v6. */
	build: () => Promise<StyleSpecification>;
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

function renderPair(pair: Pair, diff: StyleDiff, full: boolean): string {
	const out: string[] = [];
	const L = diff.layers;
	out.push(`## \`${pair.v5}\``);
	if (pair.note) out.push(`> ${pair.note}`);
	out.push('');
	out.push(
		`Layers: **${L.v5Count} → ${L.v6Count}** ` +
			`(${L.onlyV5.length} removed, ${L.onlyV6.length} added, ${L.changed.length} changed, ${L.reordered.length} reordered)`
	);
	out.push('');

	if (diff.root.length > 0) {
		out.push('### Root properties');
		out.push('');
		out.push('| property | v5 | v6 |');
		out.push('| --- | --- | --- |');
		for (const c of diff.root) out.push(`| \`${c.path}\` | ${short(c.v5)} | ${short(c.v6)} |`);
		out.push('');
	}

	if (diff.sources.onlyV5.length || diff.sources.onlyV6.length || diff.sources.changed.length) {
		out.push('### Sources');
		out.push('');
		if (diff.sources.onlyV5.length) out.push(`- **Removed:** ${diff.sources.onlyV5.map((s) => `\`${s}\``).join(', ')}`);
		if (diff.sources.onlyV6.length) out.push(`- **Added:** ${diff.sources.onlyV6.map((s) => `\`${s}\``).join(', ')}`);
		for (const s of diff.sources.changed) {
			out.push(`- \`${s.id}\`:`);
			for (const c of s.changes) out.push(`  - \`${c.path}\`: ${short(c.v5)} → ${short(c.v6)}`);
		}
		out.push('');
	}

	// Layers present in v5 and gone in v6 are the strongest regression signal:
	// something the published style draws today that this branch would stop drawing.
	if (L.onlyV5.length > 0) {
		out.push(`### Layers in v5 but not v6 — ${L.onlyV5.length}`);
		out.push('');
		out.push(L.onlyV5.map((id) => `\`${id}\``).join(', '));
		out.push('');
	}

	if (L.onlyV6.length > 0) {
		out.push(`### Layers in v6 but not v5 — ${L.onlyV6.length}`);
		out.push('');
		out.push(L.onlyV6.map((id) => `\`${id}\``).join(', '));
		out.push('');
	}

	const byPath = aggregate(diff);
	if (byPath.size > 0) {
		out.push('### Changed properties, by frequency');
		out.push('');
		out.push('| property | layers | example (v5 → v6) |');
		out.push('| --- | --- | --- |');
		const rows = [...byPath.entries()].sort((a, b) => b[1].layers.length - a[1].layers.length);
		for (const [path, { layers, example }] of rows) {
			out.push(`| \`${path}\` | ${layers.length} | ${short(example.v5, 50)} → ${short(example.v6, 50)} |`);
		}
		out.push('');

		out.push(full ? '### Every changed layer' : `### Changed layers (first ${SAMPLE} per property)`);
		out.push('');
		for (const [path, { layers }] of rows) {
			const shown = full ? layers : layers.slice(0, SAMPLE);
			const more = layers.length - shown.length;
			out.push(`- \`${path}\`: ${shown.map((id) => `\`${id}\``).join(', ')}${more > 0 ? ` _(+${more} more)_` : ''}`);
		}
		out.push('');
	}

	return out.join('\n');
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const refresh = args.includes('--refresh');
	const full = args.includes('--full');
	const names = args.filter((a) => !a.startsWith('--'));
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
		const [v5style, v6style] = await Promise.all([fetchV5(pair.v5, refresh), pair.build()]);
		const diff = diffStyles(v5style, v6style);
		report.push(renderPair(pair, diff, full), '---', '');
		const L = diff.layers;
		console.log(
			`${L.v5Count}→${L.v6Count} layers, -${L.onlyV5.length} +${L.onlyV6.length}, ${L.changed.length} changed`
		);
	}

	writeFileSync(REPORT, report.join('\n'));
	console.log(`\nReport written to ${REPORT}`);
}

await main();

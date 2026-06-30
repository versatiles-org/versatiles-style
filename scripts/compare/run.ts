import { writeFileSync } from 'fs';
import { buildStyles, compareCases } from './harness.js';
import type { CaseResult } from './harness.js';
import { compareLayerOrder } from './order.js';
import type { OrderResult } from './order.js';

// Compare the generated `colorful` style (Shortbread) against `osm-bright.json` (OMT),
// case by case, zoom by zoom — purely by resolving filters + paint/layout expressions —
// and also compare the relative draw ORDER of the catalog features.
//
// Run:  npx tsx scripts/compare/run.ts            (console report)
//       npx tsx scripts/compare/run.ts --md       (also writes scripts/compare/report.md)

const reportPath = new URL('./report.md', import.meta.url).pathname;

async function main(): Promise<void> {
	const writeMd = process.argv.includes('--md');
	const { colorful, osmBright } = await buildStyles();
	const results = compareCases(colorful, osmBright);
	const order = compareLayerOrder(colorful, osmBright);

	printReport(results);
	printOrderReport(order);
	if (writeMd) {
		writeFileSync(reportPath, renderMd(results, order));
		console.log(`\nWrote ${reportPath}`);
	}
}

function printReport(results: CaseResult[]): void {
	const byBand = new Map<string, CaseResult[]>();
	for (const r of results) {
		const list = byBand.get(r.c.band) ?? [];
		list.push(r);
		byBand.set(r.c.band, list);
	}

	let totalChecks = 0;
	let passChecks = 0;
	let acceptedDivergences = 0;
	for (const r of results)
		for (const z of r.zooms) {
			totalChecks++;
			if (z.diffs.length === 0) passChecks++;
			acceptedDivergences += z.ignored.length;
		}

	for (const [band, list] of [...byBand.entries()].sort()) {
		console.log(`\n\x1b[1m${band}\x1b[0m`);
		for (const r of list) {
			const mark = r.pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
			console.log(`  ${mark} ${r.c.name}`);
			if (!r.pass) {
				for (const z of r.zooms) {
					if (z.diffs.length === 0) continue;
					console.log(`      z${z.zoom}: ${z.diffs.join('; ')}`);
				}
			}
		}
	}

	const pct = ((100 * passChecks) / totalChecks).toFixed(1);
	console.log(
		`\n\x1b[1mStyling:\x1b[0m ${passChecks}/${totalChecks} case-zoom checks identical (${pct}%) across ${results.length} cases` +
			` — ${acceptedDivergences} accepted out-of-scope divergences`
	);
}

// Median of a numeric list (lower-median for even counts).
function median(xs: number[]): number {
	const s = [...xs].sort((a, b) => a - b);
	return s[Math.floor((s.length - 1) / 2)];
}

// Top-level bands ordered bottom→top by the median draw height of their cases in `pick`.
function bandStacking(order: OrderResult, pick: (h: OrderResult['heights'][number]) => number | null): string {
	const bands = new Map<string, number[]>();
	for (const h of order.heights) {
		const v = pick(h);
		if (v === null) continue;
		const top = h.c.band.split('.')[0];
		(bands.get(top) ?? bands.set(top, []).get(top)!).push(v);
	}
	return [...bands.entries()]
		.map(([b, xs]) => [b, median(xs)] as const)
		.sort((a, b) => a[1] - b[1])
		.map(([b]) => b)
		.join(' → ');
}

function inversionGroups(order: OrderResult): { bandPair: string; n: number; accepted: boolean }[] {
	const groups = new Map<string, { n: number; accepted: boolean }>();
	for (const inv of order.inversions) {
		const g = groups.get(inv.bandPair) ?? { n: 0, accepted: inv.accepted };
		g.n++;
		groups.set(inv.bandPair, g);
	}
	return [...groups.entries()].map(([bandPair, g]) => ({ bandPair, ...g })).sort((a, b) => b.n - a.n);
}

function printOrderReport(order: OrderResult): void {
	const pct = ((100 * order.agreeingPairs) / order.comparablePairs).toFixed(1);
	console.log(`\n\x1b[1mLayer order (z${order.zoom}):\x1b[0m`);
	console.log(`  band stacking, bottom → top:`);
	console.log(`    OSM Bright: ${bandStacking(order, (h) => h.omt)}`);
	console.log(`    colorful:   ${bandStacking(order, (h) => h.sb)}`);
	console.log(
		`  ${order.agreeingPairs}/${order.comparablePairs} feature pairs stacked identically (${pct}%)` +
			(order.unmatched.length ? `, ${order.unmatched.length} cases not present in both (excluded)` : '')
	);

	if (order.inversions.length === 0) {
		console.log('  \x1b[32m✓ no inversions\x1b[0m');
		return;
	}
	console.log(
		`  ${order.inversions.length} inversions (\x1b[31m${order.unaccepted.length} unaccepted\x1b[0m) by band-pair:`
	);
	for (const g of inversionGroups(order)) {
		const mark = g.accepted ? '\x1b[2maccepted\x1b[0m  ' : '\x1b[31mUNACCEPTED\x1b[0m';
		console.log(`    ${String(g.n).padStart(3)}  ${mark}  ${g.bandPair.replace('|', ' ⟂ ')}`);
	}
	for (const inv of order.unaccepted) {
		console.log(
			`      \x1b[31m✗\x1b[0m ${inv.a.band}/${inv.a.name} is ${inv.omt} ${inv.b.band}/${inv.b.name} in OSM Bright, reversed in colorful`
		);
	}
}

function renderMd(results: CaseResult[], order: OrderResult): string {
	const lines: string[] = ['# colorful vs OSM Bright — style equivalence report', ''];
	let total = 0;
	let pass = 0;
	for (const r of results)
		for (const z of r.zooms) {
			total++;
			if (z.diffs.length === 0) pass++;
		}
	lines.push(`**${pass}/${total} case-zoom checks identical** across ${results.length} cases.`, '');

	const byBand = new Map<string, CaseResult[]>();
	for (const r of results) (byBand.get(r.c.band) ?? byBand.set(r.c.band, []).get(r.c.band))!.push(r);

	for (const [band, list] of [...byBand.entries()].sort()) {
		lines.push(`## ${band}`, '');
		for (const r of list) {
			lines.push(`### ${r.pass ? '✓' : '✗'} ${r.c.name}`);
			for (const z of r.zooms) {
				if (z.diffs.length === 0) continue;
				lines.push(`- **z${z.zoom}**: ${z.diffs.join('; ')}`);
			}
			lines.push('');
		}
	}

	const opct = ((100 * order.agreeingPairs) / order.comparablePairs).toFixed(1);
	lines.push('# Layer order', '');
	lines.push(`Band stacking, bottom → top (z${order.zoom}):`, '');
	lines.push(`- **OSM Bright**: ${bandStacking(order, (h) => h.omt)}`);
	lines.push(`- **colorful**: ${bandStacking(order, (h) => h.sb)}`, '');
	lines.push(
		`**${order.agreeingPairs}/${order.comparablePairs} feature pairs stacked identically (${opct}%)**, ` +
			`${order.unaccepted.length} unaccepted inversions.`,
		''
	);
	for (const g of inversionGroups(order)) {
		lines.push(
			`- ${g.n}× ${g.bandPair.replace('|', ' ⟂ ')} — ${g.accepted ? 'accepted (structural)' : '**UNACCEPTED**'}`
		);
	}
	return lines.join('\n');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

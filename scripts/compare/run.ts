import { writeFileSync } from 'fs';
import { compareAll } from './harness.js';
import type { CaseResult } from './harness.js';

// Compare the generated `colorful` style (Shortbread) against `style.osm-bright.json` (OMT),
// case by case, zoom by zoom — purely by resolving filters + paint/layout expressions.
//
// Run:  npx tsx scripts/compare/run.ts            (console report)
//       npx tsx scripts/compare/run.ts --md       (also writes scripts/compare/report.md)

const reportPath = new URL('./report.md', import.meta.url).pathname;

async function main(): Promise<void> {
	const writeMd = process.argv.includes('--md');
	const results = await compareAll();

	printReport(results);
	if (writeMd) {
		writeFileSync(reportPath, renderMd(results));
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
		`\n\x1b[1mSummary:\x1b[0m ${passChecks}/${totalChecks} case-zoom checks identical (${pct}%) across ${results.length} cases` +
			` — ${acceptedDivergences} accepted out-of-scope divergences`
	);
}

function renderMd(results: CaseResult[]): string {
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
	return lines.join('\n');
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

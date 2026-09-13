import { PAIRS, SCHEMAS, pairId, type Finding, type Results, type ViewResult } from './baseline.js';
import { shareDifferences } from './score.js';

/**
 * The HTML report: every view, worst first, with the three renders side by side, a diff heatmap per
 * pair, and the colour classes whose coverage differs. Images are referenced by the file names
 * `compare.ts` writes next to it.
 */

export const imageName = (view: string, pass: string, what: string) => `${view}-${pass}-${what}.png`;

const escape = (s: string) =>
	s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const percent = (v: number | undefined) => (v === undefined ? '–' : `${(v * 100).toFixed(1)} %`);

/** The worst geometry difference of a view, for sorting. Incomplete views go last. */
const worst = (v: ViewResult) => (v.complete ? Math.max(0, ...Object.values(v.geometry)) : -1);

export function renderReport(results: Results, findings: Finding[] | undefined, passes: readonly string[]): string {
	const byView = new Map<string, Finding[]>();
	for (const finding of findings ?? []) byView.set(finding.view, [...(byView.get(finding.view) ?? []), finding]);
	const regressions = (findings ?? []).filter((f) => f.kind === 'regression').length;

	let html = `<!doctype html><meta charset="utf-8"><title>Schema comparison</title>
<style>
	body { font: 14px/1.4 system-ui, sans-serif; margin: 2em; color: #222; }
	table { border-collapse: collapse; margin: 0.5em 0; }
	td, th { padding: 2px 10px; text-align: right; border-bottom: 1px solid #ddd; }
	td:first-child, th:first-child { text-align: left; }
	.images { display: flex; gap: 6px; flex-wrap: wrap; }
	figure { margin: 0; } figcaption { font-size: 12px; color: #666; }
	img { width: 256px; height: 256px; image-rendering: pixelated; border: 1px solid #ccc; }
	.regression { color: #b00; } .improvement { color: #070; } .incomplete { color: #a60; }
	section { border-top: 2px solid #333; margin-top: 2em; }
</style>
<h1>Schema comparison</h1>
<p>Builds: ${SCHEMAS.map((s) => `<b>${s}</b> ${escape(results.builds[s] ?? '?')}`).join(' · ')}</p>
<p>${results.views.length} views · ${results.views.filter((v) => !v.complete).length} incomplete · ${
		findings === undefined ? 'no baseline' : `<span class="regression">${regressions} regressions</span>`
	}</p>
<table><tr><th>view</th>${PAIRS.map((p) => `<th>geometry ${pairId(p)}</th>`).join('')}</tr>`;

	const sorted = [...results.views].sort((a, b) => worst(b) - worst(a));
	for (const v of sorted) {
		html += `<tr><td><a href="#${v.view}">${v.view}</a>${v.complete ? '' : ' <span class="incomplete">incomplete</span>'}</td>${PAIRS.map(
			(p) => `<td>${percent(v.geometry[pairId(p)])}</td>`
		).join('')}</tr>`;
	}
	html += '</table>';

	for (const v of sorted) {
		html += `<section id="${v.view}"><h2>${v.view}</h2>`;
		if (v.note) html += `<p><i>${escape(v.note)}</i></p>`;
		for (const finding of byView.get(v.view) ?? []) {
			html += `<div class="${finding.kind}">${finding.kind}: ${escape(finding.message)}</div>`;
		}
		if (!v.complete) {
			html += `<details class="incomplete"><summary>${v.failures.length} resources failed</summary><pre>${escape(
				v.failures.slice(0, 50).join('\n')
			)}</pre></details>`;
		}

		for (const pass of passes) {
			html += `<h3>${pass}</h3><div class="images">`;
			for (const schema of SCHEMAS) {
				html += `<figure><img loading="lazy" src="${imageName(v.view, pass, schema)}"><figcaption>${schema}</figcaption></figure>`;
			}
			if (pass !== 'sentinel') {
				for (const pair of PAIRS) {
					const id = pairId(pair);
					const share = v[pass as 'geometry' | 'full'][id];
					html += `<figure><img loading="lazy" src="${imageName(v.view, pass, id)}"><figcaption>${id}: ${percent(share)}</figcaption></figure>`;
				}
			}
			html += '</div>';
		}

		if (v.classes.shortbread) {
			const rows = new Map<string, number>();
			for (const [a, b] of PAIRS) {
				if (!v.classes[a] || !v.classes[b]) continue;
				for (const d of shareDifferences(v.classes[a], v.classes[b]))
					rows.set(d.name, Math.max(rows.get(d.name) ?? 0, d.delta));
			}
			if (rows.size > 0) {
				html += `<table><tr><th>colour class differing ≥ 1 %</th>${SCHEMAS.map((s) => `<th>${s}</th>`).join('')}</tr>`;
				for (const [name] of [...rows].sort((x, y) => y[1] - x[1])) {
					html += `<tr><td>${escape(name)}</td>${SCHEMAS.map((s) => `<td>${percent(v.classes[s]?.[name] ?? 0)}</td>`).join('')}</tr>`;
				}
				html += '</table>';
			}
		}
		if (v.groups) {
			// Groups that draw something somewhere, and do not draw it in the same place everywhere.
			const rows = Object.entries(v.groups)
				.map(([group, pairs]) => ({ group, pairs, worst: Math.min(...Object.values(pairs).map((o) => o!.iou)) }))
				.filter(({ pairs, worst }) => worst < 0.9 && Object.values(pairs).some((o) => Math.max(o!.a, o!.b) >= 0.005))
				.sort((x, y) => x.worst - y.worst);
			if (rows.length > 0) {
				html += `<table><tr><th>layer group drawn alone: overlap (IoU) &lt; 90 %</th>${SCHEMAS.map((s) => `<th>${s} area</th>`).join('')}${PAIRS.map((p) => `<th>IoU ${pairId(p)}</th>`).join('')}</tr>`;
				for (const { group, pairs } of rows) {
					const area = (s: string) => {
						const pair = PAIRS.find((p) => (p as readonly string[]).includes(s))!;
						const o = pairs[pairId(pair)];
						return o ? (pair[0] === s ? o.a : o.b) : undefined;
					};
					html += `<tr><td>${escape(group)}</td>${SCHEMAS.map((s) => `<td>${percent(area(s))}</td>`).join('')}${PAIRS.map(
						(p) => `<td>${percent(pairs[pairId(p)]?.iou)}</td>`
					).join('')}</tr>`;
				}
				html += '</table>';
			}
		}
		html += '</section>';
	}
	return html;
}

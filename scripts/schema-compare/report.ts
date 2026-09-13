import { PAIRS, SCHEMAS, pairId, type Finding, type Results, type Schema, type ViewResult } from './baseline.js';
import { DIFFERING_AREA, DIFFERING_IOU, differingGroups, groupArea, oddOneOut, worstIou } from './groups.js';
import { shareDifferences } from './score.js';

/**
 * The HTML report of a run: screenshots, their diffs and the measurements — nothing interpreted.
 *
 * It exists to answer two questions at a glance: *where* do the schemas draw differently, and did the
 * last change to a style make that *better or worse*. So every number is shown next to its change against
 * the baseline, and the views are ordered worst first. Images are referenced by the names `compare.ts`
 * writes next to the report (`imageName`).
 */

export const imageName = (view: string, pass: string, what: string) => `${view}-${pass}-${what}.png`;

export type ReportInput = {
	results: Results;
	/** The accepted results, for the changes; absent before the first `--save-baseline`. */
	baseline?: Results;
	/** Regressions and improvements against the baseline. */
	findings?: Finding[];
	passes: readonly string[];
};

const SCHEMA_NAMES: Record<Schema, string> = { shortbread: 'Shortbread', omt: 'OpenMapTiles', protomaps: 'Protomaps' };
const PAIR_LABELS: Record<string, string> = {
	'shortbread~omt': 'SB ~ OMT',
	'shortbread~protomaps': 'SB ~ PM',
	'omt~protomaps': 'OMT ~ PM',
};
const PASS_TITLES: Record<string, string> = {
	geometry: 'Geometry, no labels',
	full: 'With labels',
	sentinel: 'Colour classes',
};

const escape = (s: string) =>
	s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** A share as a percentage: one decimal below 10, none above, `<0.1` for traces. */
export function formatPercent(share: number | undefined): string {
	if (share === undefined) return '–';
	const p = share * 100;
	if (p === 0) return '0';
	if (p < 0.1) return '<0.1';
	return p.toFixed(p < 10 ? 1 : 0);
}

/**
 * The change from `then` to `now` in percentage points, coloured by whether it brings the schemas closer
 * together: lower is better for differences, higher for overlaps. Under 0.1 points is shown as no change.
 */
export function formatDelta(now: number | undefined, then: number | undefined, higherIsBetter = false): string {
	if (now === undefined || then === undefined) return '';
	const points = (now - then) * 100;
	if (Math.abs(points) < 0.1) return '<span class="delta same">±0</span>';
	const better = higherIsBetter ? points > 0 : points < 0;
	return `<span class="delta ${better ? 'better' : 'worse'}">${points > 0 ? '+' : '−'}${Math.abs(points).toFixed(1)}</span>`;
}

/** The change of a count; fewer is better. */
export function formatCountDelta(now: number, then: number | undefined): string {
	if (then === undefined) return '';
	if (now === then) return '<span class="delta same">±0</span>';
	return `<span class="delta ${now < then ? 'better' : 'worse'}">${now > then ? '+' : '−'}${Math.abs(now - then)}</span>`;
}

const mean = (values: (number | undefined)[]) => {
	const defined = values.filter((v): v is number => v !== undefined);
	return defined.length === 0 ? undefined : defined.reduce((a, b) => a + b, 0) / defined.length;
};

/** The worst geometry difference of a view, for sorting. Incomplete views go last. */
const worst = (v: ViewResult) => (v.complete ? Math.max(0, ...Object.values(v.geometry)) : -1);

/** A table cell whose background deepens with the share of differing pixels. */
function heatCell(now: number | undefined, then: number | undefined): string {
	if (now === undefined) return '<td class="num">–</td>';
	const level = Math.min(1, Math.sqrt(now / 0.5));
	return `<td class="num heat" style="--h:${level.toFixed(3)}">${formatPercent(now)} ${formatDelta(now, then)}</td>`;
}

/** The headline numbers: mean differing pixels per pair, and how many layer groups differ. */
function summary(results: Results, accepted: Map<string, ViewResult>, passes: readonly string[]): string {
	const complete = results.views.filter((v) => v.complete);
	// Changes compare like with like: only views complete now and in the baseline.
	const comparable = complete.filter((v) => accepted.get(v.view)?.complete);
	const hasBaseline = accepted.size > 0;

	let html = '';
	for (const pass of ['geometry', 'full'] as const) {
		if (!passes.includes(pass)) continue;
		const tiles = PAIRS.map(pairId).map((pair) => {
			const now = mean(complete.map((v) => v[pass][pair]));
			const delta = hasBaseline
				? formatDelta(
						mean(comparable.map((v) => v[pass][pair])),
						mean(comparable.map((v) => accepted.get(v.view)![pass][pair]))
					)
				: '';
			return `<div class="tile">
				<p class="tile-label">${PASS_TITLES[pass]} · ${PAIR_LABELS[pair]}</p>
				<p class="tile-value">${formatPercent(now)}<small>%</small> ${delta}</p>
				<p class="tile-sub">mean share of differing pixels</p>
			</div>`;
		});
		html += `<div class="tiles">${tiles.join('')}</div>`;
	}

	if (complete.some((v) => v.groups)) {
		const count = (views: (ViewResult | undefined)[]) =>
			views.reduce((n, v) => n + differingGroups(v?.groups).length, 0);
		const measured = comparable.filter((v) => v.groups && accepted.get(v.view)?.groups);
		const delta =
			measured.length > 0 ? formatCountDelta(count(measured), count(measured.map((v) => accepted.get(v.view)))) : '';
		html += `<p class="group-total"><b>${count(complete)}</b> layer groups differ across all views ${delta}
			<span class="dim">— overlap below ${DIFFERING_IOU * 100} %, covering at least ${DIFFERING_AREA * 100} % of the picture</span></p>`;
	}
	return html;
}

function overviewTable(views: ViewResult[], accepted: Map<string, ViewResult>, byView: Map<string, Finding[]>): string {
	const pairs = PAIRS.map(pairId);
	const withGroups = views.some((v) => v.groups);
	const rows = views.map((v) => {
		const base = accepted.get(v.view);
		const findings = byView.get(v.view) ?? [];
		const worse = findings.filter((f) => f.kind === 'regression').length;
		const better = findings.length - worse;
		const status = [
			v.complete ? '' : '<span class="chip incomplete">incomplete</span>',
			worse ? `<span class="chip worse">${worse} worse</span>` : '',
			better ? `<span class="chip better">${better} better</span>` : '',
		].join('');
		const groups = !withGroups
			? ''
			: `<td class="num">${v.groups ? differingGroups(v.groups).length : '–'} ${
					v.groups && base?.groups
						? formatCountDelta(differingGroups(v.groups).length, differingGroups(base.groups).length)
						: ''
				}</td>`;
		return `<tr>
			<td><a class="mono" href="#${escape(v.view)}">${escape(v.view)}</a></td>
			${pairs.map((p) => heatCell(v.geometry[p], base?.geometry[p])).join('')}
			${groups}
			<td class="status">${status}</td>
		</tr>`;
	});
	return `<div class="table-wrap"><table class="overview">
		<thead><tr><th>view</th>${pairs.map((p) => `<th class="num">${PAIR_LABELS[p]}</th>`).join('')}${
			withGroups ? '<th class="num">groups differing</th>' : ''
		}<th></th></tr></thead>
		<tbody>${rows.join('')}</tbody>
	</table></div>`;
}

function passImages(v: ViewResult, base: ViewResult | undefined, pass: string): string {
	const renders = SCHEMAS.map(
		(s) =>
			`<figure><img loading="lazy" src="${imageName(v.view, pass, s)}" width="512" height="512" alt="${SCHEMA_NAMES[s]}, ${PASS_TITLES[pass] ?? pass}"><figcaption>${SCHEMA_NAMES[s]}</figcaption></figure>`
	);
	const diffs =
		pass === 'geometry' || pass === 'full'
			? PAIRS.map(pairId).map(
					(pair) =>
						`<figure><img loading="lazy" src="${imageName(v.view, pass, pair)}" width="512" height="512" alt="Differing pixels ${PAIR_LABELS[pair]}"><figcaption>${PAIR_LABELS[pair]} <b>${formatPercent(v[pass][pair])} %</b> ${formatDelta(v[pass][pair], base?.[pass][pair])}</figcaption></figure>`
				)
			: [];
	return `<div class="pass"><h4>${PASS_TITLES[pass] ?? pass}</h4><div class="images">${[...renders, ...diffs].join('')}</div></div>`;
}

/** Colour classes whose share of the picture differs by at least 1 % between two schemas, now or before. */
function classTable(v: ViewResult, base: ViewResult | undefined): string {
	const measured = (view: ViewResult | undefined): view is ViewResult =>
		!!view && SCHEMAS.every((s) => view.classes[s]);
	if (!measured(v)) return '';
	const spread = (view: ViewResult | undefined, name: string) => {
		if (!measured(view)) return undefined;
		const shares = SCHEMAS.map((s) => view.classes[s]![name] ?? 0);
		return Math.max(...shares) - Math.min(...shares);
	};
	const names = new Set<string>();
	for (const view of [v, base]) {
		if (!measured(view)) continue;
		for (const [a, b] of PAIRS) shareDifferences(view.classes[a]!, view.classes[b]!).forEach((d) => names.add(d.name));
	}
	if (names.size === 0) return '';
	const rows = [...names]
		.sort((x, y) => (spread(v, y) ?? 0) - (spread(v, x) ?? 0))
		.map(
			(name) => `<tr>
				<td>${escape(name)}</td>
				${SCHEMAS.map((s) => `<td class="num">${formatPercent(v.classes[s]![name] ?? 0)}</td>`).join('')}
				<td class="num strong">${formatPercent(spread(v, name))} ${formatDelta(spread(v, name), spread(base, name))}</td>
			</tr>`
		);
	return `<div class="measure"><h4>Colour classes, % of the picture</h4><div class="table-wrap"><table>
		<thead><tr><th>class</th>${SCHEMAS.map((s) => `<th class="num">${SCHEMA_NAMES[s]}</th>`).join('')}<th class="num">spread</th></tr></thead>
		<tbody>${rows.join('')}</tbody>
	</table></div></div>`;
}

/** Layer groups that differ, drawn alone: their areas, their overlap, and the overlay pictures. */
function groupSection(v: ViewResult, base: ViewResult | undefined): string {
	if (!v.groups) return '';
	const groups = v.groups;
	const now = differingGroups(groups);
	// Groups that differed in the baseline and no longer do stay listed, greyed: that is what a fix looks like.
	const resolved = differingGroups(base?.groups).filter((g) => !now.includes(g) && groups[g]);
	if (now.length === 0 && resolved.length === 0) {
		return '<div class="measure"><h4>Layer groups drawn alone</h4><p class="dim">No group differs.</p></div>';
	}

	const rows = [...now, ...resolved].map((group) => {
		const pairs = groups[group];
		const area = groupArea(pairs)!;
		const then = base?.groups?.[group];
		return `<tr${now.includes(group) ? '' : ' class="resolved"'}>
			<td class="mono">${escape(group)}</td>
			${SCHEMAS.map((s) => `<td class="num">${formatPercent(area[s])}</td>`).join('')}
			<td>${SCHEMA_NAMES[oddOneOut(pairs)]}</td>
			<td class="num strong">${formatPercent(worstIou(pairs))} ${then ? formatDelta(worstIou(pairs), worstIou(then), true) : ''}</td>
		</tr>`;
	});
	const overlays = now.map((group) => {
		const pairs = groups[group];
		return `<figure><img loading="lazy" src="${imageName(v.view, 'group', group)}" width="512" height="512" alt="${escape(group)} drawn alone in all three schemas"><figcaption><span class="mono">${escape(group)}</span> · from ${SCHEMA_NAMES[oddOneOut(pairs)]} · overlap ${formatPercent(worstIou(pairs))} %</figcaption></figure>`;
	});
	return `<div class="measure"><h4>Layer groups drawn alone, % of the picture</h4><div class="table-wrap"><table>
		<thead><tr><th>group</th>${SCHEMAS.map((s) => `<th class="num">${SCHEMA_NAMES[s]}</th>`).join('')}<th>overlaps least</th><th class="num">lowest overlap</th></tr></thead>
		<tbody>${rows.join('')}</tbody>
	</table></div>${overlays.length > 0 ? `<div class="images overlays">${overlays.join('')}</div>` : ''}</div>`;
}

function viewSection(
	v: ViewResult,
	base: ViewResult | undefined,
	findings: Finding[],
	passes: readonly string[]
): string {
	const zoom = /-z(\d+)$/.exec(v.view)?.[1];
	const list = findings.map(
		(f) => `<li class="${f.kind === 'regression' ? 'worse' : 'better'}">${escape(f.message)}</li>`
	);
	return `<section class="view" id="${escape(v.view)}">
		<header class="view-head">
			<h3>${escape(v.view)}</h3>
			${zoom ? `<span class="mono dim">zoom ${zoom}</span>` : ''}
			${v.complete ? '' : '<span class="chip incomplete">incomplete, not judged</span>'}
			${base ? '' : '<span class="chip">not in baseline</span>'}
		</header>
		${list.length > 0 ? `<ul class="findings">${list.join('')}</ul>` : ''}
		${
			v.failures.length > 0
				? `<details class="failures"><summary>${v.failures.length} resources failed</summary><pre>${escape(v.failures.slice(0, 50).join('\n'))}</pre></details>`
				: ''
		}
		${passes.map((pass) => passImages(v, base, pass)).join('')}
		${classTable(v, base)}
		${groupSection(v, base)}
	</section>`;
}

export function renderReport({ results, baseline, findings, passes }: ReportInput): string {
	const accepted = new Map((baseline?.views ?? []).map((v) => [v.view, v]));
	const byView = new Map<string, Finding[]>();
	for (const finding of findings ?? []) byView.set(finding.view, [...(byView.get(finding.view) ?? []), finding]);
	const worse = (findings ?? []).filter((f) => f.kind === 'regression').length;
	const better = (findings ?? []).length - worse;
	const incomplete = results.views.filter((v) => !v.complete).length;
	const sorted = [...results.views].sort((a, b) => worst(b) - worst(a));

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tile Schema Parity</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;600&display=swap">
<style>${STYLE}</style>
</head>
<body>
<div class="page">
	<header class="masthead">
		<div>
			<p class="eyebrow">versatiles-style · npm run schema-compare</p>
			<h1>Tile Schema Parity</h1>
			<p class="lede">The same places drawn by <code>osm()</code>, <code>omt()</code> and <code>protomaps()</code> with identical options.${
				baseline
					? ' Numbers carry their change against the baseline: <span class="delta better">green</span> means the schemas moved closer together, <span class="delta worse">red</span> further apart.'
					: ' There is no baseline yet, so no changes are shown.'
			}</p>
			<p class="run">${results.views.length} views · ${incomplete} incomplete${
				findings
					? ` · <span class="delta worse">${worse} worse</span> · <span class="delta better">${better} better</span>`
					: ''
			}</p>
		</div>
		<dl class="builds">
			${SCHEMAS.map((s) => `<div><dt>${SCHEMA_NAMES[s]}</dt><dd>${escape(results.builds[s] ?? '?')}</dd></div>`).join('')}
		</dl>
	</header>

	<section class="summary">${summary(results, accepted, passes)}</section>

	<section>
		<h2>Views, worst first</h2>
		<p class="dim">Share of pixels that differ after a 5 px blur (ΔE &gt; 10), labels off.</p>
		${overviewTable(sorted, accepted, byView)}
	</section>

	<section class="guide">
		<p><strong>Diff images</strong>The first schema of the pair, faded, with the pixels that differ in red.</p>
		<p><strong>Colour classes</strong>Rendered with a palette that gives every colour key its own colour. The spread is the largest minus the smallest share across the three schemas.</p>
		<p><strong>Group overlays</strong>One layer group drawn alone, seen from the schema that overlaps least with the other two.
			<span class="legend"><span><i class="sw sw-missing"></i>missing there</span><span><i class="sw sw-only"></i>only there</span><span><i class="sw sw-shared"></i>all three</span><span><i class="sw sw-partial"></i>one of the others</span></span></p>
	</section>

	${sorted.map((v) => viewSection(v, accepted.get(v.view), byView.get(v.view) ?? [], passes)).join('')}
</div>
</body>
</html>
`;
}

const STYLE = `
:root {
	--ground: #f2f4f1;
	--surface: #ffffff;
	--ink: #18211d;
	--muted: #5b6862;
	--rule: #d6dcd7;
	--rule-strong: #b9c2bc;
	--accent: #0e6b5e;
	--code-bg: #e8ece8;
	--heat: 180 45 30;
	--better: #1f7a3a;
	--worse: #b42318;
	--chip-bg: #e7ebe8;
	color-scheme: light;
}
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) {
		--ground: #111614;
		--surface: #18201c;
		--ink: #e4eae6;
		--muted: #97a39d;
		--rule: #2a332f;
		--rule-strong: #3d4843;
		--accent: #5cc3b2;
		--code-bg: #222b27;
		--heat: 240 110 80;
		--better: #6fd38f;
		--worse: #ff9a8a;
		--chip-bg: #252d29;
		color-scheme: dark;
	}
}
:root[data-theme="dark"] {
	--ground: #111614;
	--surface: #18201c;
	--ink: #e4eae6;
	--muted: #97a39d;
	--rule: #2a332f;
	--rule-strong: #3d4843;
	--accent: #5cc3b2;
	--code-bg: #222b27;
	--heat: 240 110 80;
	--better: #6fd38f;
	--worse: #ff9a8a;
	--chip-bg: #252d29;
	color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--ground); color: var(--ink); font: 400 15px/1.55 "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif; }
.page { max-width: 1320px; margin: 0 auto; padding: 48px 24px 96px; }
h1, h2, h3 { font-family: "Barlow Semi Condensed", "Arial Narrow", system-ui, sans-serif; margin: 0; text-wrap: balance; }
h1 { font-size: 48px; line-height: 1; font-weight: 700; }
h2, h3 { font-size: 26px; font-weight: 600; }
h4 { margin: 0 0 8px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: var(--muted); }
p { margin: 0; }
a { color: var(--accent); text-underline-offset: 2px; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
code, .mono { font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace; font-size: 0.88em; }
code { background: var(--code-bg); padding: 1px 5px; border-radius: 3px; }
.dim { color: var(--muted); }
.num { text-align: right; font-variant-numeric: tabular-nums; font-family: "IBM Plex Mono", ui-monospace, Menlo, monospace; font-size: 13px; white-space: nowrap; }
.strong { font-weight: 600; }
section { margin-top: 44px; }

.masthead { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 28px; align-items: end; padding-bottom: 28px; border-bottom: 2px solid var(--ink); }
.eyebrow { font: 500 12px/1 "IBM Plex Mono", ui-monospace, monospace; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 14px; }
.lede { font-size: 16px; margin-top: 14px; max-width: 68ch; }
.run { margin-top: 12px; font-size: 14px; }
.builds { margin: 0; }
.builds div { display: grid; grid-template-columns: 118px minmax(0, 1fr); gap: 12px; padding: 7px 0; border-top: 1px solid var(--rule); }
.builds dt { font-weight: 600; }
.builds dd { margin: 0; overflow-wrap: anywhere; color: var(--muted); font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 12.5px; }

.delta { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 12px; font-weight: 500; white-space: nowrap; }
.delta.better { color: var(--better); }
.delta.worse { color: var(--worse); }
.delta.same { color: var(--muted); }

.summary { display: grid; gap: 14px; }
.tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.tile { background: var(--surface); border: 1px solid var(--rule); border-radius: 4px; padding: 14px 16px; }
.tile-label { font-size: 12px; color: var(--muted); }
.tile-value { font: 600 34px/1.1 "Barlow Semi Condensed", sans-serif; font-variant-numeric: tabular-nums; margin-top: 4px; display: flex; align-items: baseline; gap: 8px; }
.tile-value small { font-size: 18px; margin-left: -6px; color: var(--muted); }
.tile-value .delta { font-size: 14px; }
.tile-sub { font-size: 12px; color: var(--muted); }
.group-total b { font: 600 22px "Barlow Semi Condensed", sans-serif; margin-right: 4px; }

.table-wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th { text-align: left; font-size: 11.5px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); padding: 7px 10px; border-bottom: 1px solid var(--rule-strong); white-space: nowrap; }
td { padding: 6px 10px; border-bottom: 1px solid var(--rule); }
.overview { margin-top: 10px; }
.heat { background: rgb(var(--heat) / calc(var(--h) * 0.55)); }
.status { white-space: nowrap; }
.chip { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 7px 2px; border-radius: 999px; background: var(--chip-bg); color: var(--muted); margin-right: 4px; }
.chip.worse, .chip.incomplete { color: var(--worse); }
.chip.better { color: var(--better); }

.guide { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; padding: 20px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
.guide p { font-size: 13.5px; color: var(--muted); }
.guide strong { display: block; color: var(--ink); margin-bottom: 2px; }
.legend { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 6px; color: var(--ink); }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.sw { width: 11px; height: 11px; border-radius: 2px; display: inline-block; }
.sw-missing { background: #2358d8; }
.sw-only { background: #e0621f; }
.sw-shared { background: #3f4b46; }
.sw-partial { background: #a7b0ab; }

.view { padding-top: 28px; border-top: 2px solid var(--ink); scroll-margin-top: 12px; }
.view-head { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: baseline; margin-bottom: 14px; }
.findings { margin: 0 0 14px; padding-left: 18px; font-size: 13.5px; }
.findings .worse { color: var(--worse); }
.findings .better { color: var(--better); }
.failures { margin-bottom: 14px; font-size: 13px; color: var(--worse); }
.failures pre { white-space: pre-wrap; font-size: 11px; color: var(--muted); }
.pass { margin-top: 16px; }
.images { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
.images figure { margin: 0; }
.images img { display: block; width: 100%; height: auto; max-width: 100%; border: 1px solid var(--rule); border-radius: 3px; background: var(--surface); }
.images figcaption { font-size: 12px; color: var(--muted); margin-top: 3px; }
.images figcaption b { color: var(--ink); font-family: "IBM Plex Mono", ui-monospace, monospace; font-weight: 500; }
.images.overlays { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 12px; }
.measure { margin-top: 22px; }
.measure table { max-width: 900px; }
tr.resolved td { color: var(--muted); }

@media (max-width: 1000px) {
	.images { grid-template-columns: repeat(3, minmax(0, 1fr)); }
	.images.overlays { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.masthead, .guide { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
	.page { padding: 28px 16px 64px; }
	h1 { font-size: 36px; }
	.tiles { grid-template-columns: minmax(0, 1fr); }
	.images, .images.overlays { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.builds div { grid-template-columns: minmax(0, 1fr); gap: 2px; }
}
`;

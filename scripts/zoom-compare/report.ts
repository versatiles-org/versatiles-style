/**
 * The HTML report of `compare.ts`: measurements, screenshots and diffs, nothing written by hand — the
 * report is an instrument to re-run after a change, not a write-up (interpretation belongs elsewhere).
 */

/** A change across a zoom boundary, next to the same comparison just below it. */
export type Pair = {
	/** `z − ε` against `z`: share of pixels changed, and the largest channel difference. */
	share: number;
	max: number;
	/** `z − 2ε` against `z − ε`: the same, with no boundary in between. */
	controlShare: number;
	controlMax: number;
};

export const SET_NAMES = ['all', 'noSymbols', 'sameTiles', 'styleOnly', 'landcoverAlone', 'dark'] as const;
export type SetName = (typeof SET_NAMES)[number];

const SET_TITLES: Record<SetName, string> = {
	all: 'all layers',
	noSymbols: 'without symbols',
	sameTiles: 'without symbols, same tiles on both sides',
	styleOnly: 'without symbols, dashes and patterns, same tiles on both sides',
	landcoverAlone: 'the land cover fills alone',
	dark: 'all layers, dark theme',
};

export type BoundaryRow = { place: string; zoom: number; sets: Partial<Record<SetName, Pair>> };

export type BoundRow = {
	id: string;
	type: string;
	bound: 'minzoom' | 'maxzoom';
	zoom: number;
	/** Rendered alone over the background: the place where it changes most. */
	place: string;
	share: number;
	max: number;
};

export type ReportData = {
	version: string;
	width: number;
	height: number;
	epsilon: number;
	changedAbove: number;
	projection: string;
	landcover: boolean;
	themes: { light: string; dark?: string };
	places: { name: string; center: [number, number] }[];
	boundaries: BoundaryRow[];
	bounds: BoundRow[];
	failures: string[];
};

const esc = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

export const boundaryImage = (
	place: string,
	zoom: number,
	variant: 'before' | 'after' | 'diff' | 'landcover-before' | 'landcover-after'
) => `${place}.z${zoom}.${variant}.png`;

/** How much a boundary changes beyond its control. */
export const excess = (pair: Pair) => pair.share - pair.controlShare;

/**
 * The most the style alone may change across a boundary, beyond its control: half a percentage point. The first
 * full measurement was 0.12 points at most (issue #146). Labels, tile data and dashes aren't in this set, so
 * this says nothing about them, and a layer whose data starts exactly at a boundary is the invariant's to catch.
 */
export const STYLE_ONLY_LIMIT = 0.005;

/** The largest change of the style alone beyond its control, with where it is. */
export function largestStyleChange(rows: readonly BoundaryRow[]): { row: BoundaryRow; excess: number } | undefined {
	let largest: { row: BoundaryRow; excess: number } | undefined;
	for (const row of rows) {
		const pair = row.sets.styleOnly;
		if (pair && (!largest || excess(pair) > largest.excess)) largest = { row, excess: excess(pair) };
	}
	return largest;
}

function setsPresent(rows: readonly BoundaryRow[]): SetName[] {
	return SET_NAMES.filter((name) => rows.some((row) => row.sets[name] !== undefined));
}

function cells(pair: Pair | undefined): string {
	if (!pair) return '<td>–</td><td>–</td><td>–</td>';
	return `<td>${pct(pair.share)}</td><td>${pct(pair.controlShare)}</td><td>${pair.max}</td>`;
}

function setHeader(sets: readonly SetName[]): string {
	return sets.map((name) => `<th colspan="3">${esc(SET_TITLES[name])}</th>`).join('');
}

function subHeader(sets: readonly SetName[]): string {
	return sets.map(() => '<th>boundary</th><th>control</th><th>max Δ</th>').join('');
}

/** Per boundary zoom, the place where each set changes most. */
export function worstPerZoom(rows: readonly BoundaryRow[]): BoundaryRow[] {
	const zooms = [...new Set(rows.map((row) => row.zoom))].sort((a, b) => a - b);
	return zooms.map((zoom) => {
		const sets: BoundaryRow['sets'] = {};
		for (const name of SET_NAMES) {
			for (const row of rows) {
				const pair = row.zoom === zoom ? row.sets[name] : undefined;
				const current = sets[name];
				if (pair && (!current || pair.share > current.share)) sets[name] = pair;
			}
		}
		return { place: 'largest of all places', zoom, sets };
	});
}

function summary(rows: readonly BoundaryRow[], baseline: readonly BoundaryRow[] | undefined): string {
	const sets = setsPresent(rows);
	const before = baseline && new Map(worstPerZoom(baseline).map((row) => [row.zoom, row]));
	const body = worstPerZoom(rows).map((row) => {
		const old = before?.get(row.zoom)?.sets.all;
		const baselineCell = before ? `<td>${old ? pct(old.share) : '–'}</td>` : '';
		return `<tr><td>${row.zoom}</td>${sets.map((name) => cells(row.sets[name])).join('')}${baselineCell}</tr>`;
	});
	return `<table><thead><tr><th rowspan="2">zoom</th>${setHeader(sets)}${before ? '<th rowspan="2">all layers, baseline</th>' : ''}</tr>
<tr>${subHeader(sets)}</tr></thead><tbody>
${body.join('\n')}
</tbody></table>`;
}

function perPlace(rows: readonly BoundaryRow[]): string {
	const sets = setsPresent(rows);
	const body = rows.map(
		(row) =>
			`<tr><td>${esc(row.place)}</td><td>${row.zoom}</td>${sets.map((name) => cells(row.sets[name])).join('')}</tr>`
	);
	return `<table><thead><tr><th rowspan="2">place</th><th rowspan="2">zoom</th>${setHeader(sets)}</tr>
<tr>${subHeader(sets)}</tr></thead><tbody>
${body.join('\n')}
</tbody></table>`;
}

function boundsTable(rows: readonly BoundRow[]): string {
	const sorted = [...rows].sort((a, b) => b.share - a.share);
	const body = sorted.map(
		(row) =>
			`<tr><td><code>${esc(row.id)}</code></td><td>${esc(row.type)}</td><td>${row.bound}</td><td>${row.zoom}</td><td>${pct(row.share)}</td><td>${row.max}</td><td>${esc(row.place)}</td></tr>`
	);
	return `<table><thead><tr><th>layer</th><th>type</th><th>bound</th><th>zoom</th><th>px changed</th><th>max Δ</th><th>at</th></tr></thead><tbody>
${body.join('\n')}
</tbody></table>`;
}

function images(rows: readonly BoundaryRow[], count: number): string {
	const worst = rows
		.filter((row) => row.sets.all !== undefined)
		.sort((a, b) => excess(b.sets.all as Pair) - excess(a.sets.all as Pair))
		.slice(0, count);
	return worst
		.map((row) => {
			const pair = row.sets.all as Pair;
			const figure = (variant: 'before' | 'after' | 'diff', caption: string) =>
				`<figure><img src="${boundaryImage(row.place, row.zoom, variant)}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
			return `<h3>${esc(row.place)}, z${row.zoom}: ${pct(pair.share)} (control ${pct(pair.controlShare)})</h3><div class="grid">
${figure('before', `z${row.zoom} − ε`)}
${figure('after', `z${row.zoom}`)}
${figure('diff', 'changed pixels')}
</div>`;
		})
		.join('\n');
}

export function renderReport(data: ReportData, baseline?: readonly BoundaryRow[]): string {
	const places = data.places.map((p) => `${esc(p.name)} (${p.center.join(', ')})`).join(', ');
	const style = largestStyleChange(data.boundaries);
	return `<!doctype html>
<meta charset="utf-8">
<title>Zoom boundaries</title>
<style>
	body { font: 14px system-ui, sans-serif; margin: 16px; background: #fff; color: #111 }
	table { border-collapse: collapse; margin-bottom: 16px }
	td, th { border: 1px solid #ccc; padding: 3px 8px; text-align: right }
	td:first-child { text-align: left }
	.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-width: 1560px }
	img { width: 100%; image-rendering: pixelated }
	figure { margin: 0 }
	figcaption { font-size: 12px; color: #555 }
	.fail { color: #b00 }
</style>
<h1>Zoom boundaries</h1>
<p>MapLibre GL JS ${esc(data.version)} in headless Chromium (SwiftShader), ${data.width}×${data.height}, pixel ratio 1,
symbol fade off, projection ${esc(data.projection)}, <code>features.landcover</code> ${data.landcover ? 'on' : 'off'}, theme ${esc(data.themes.light)}${data.themes.dark ? `, dark theme ${esc(data.themes.dark)}` : ''}.
Places: ${places}.</p>
<p>Boundary: z − ${data.epsilon} against z. Control: z − ${2 * data.epsilon} against z − ${data.epsilon}. Shares count
pixels with a channel changed by more than ${data.changedAbove}. Same tiles: every vector source ends at z − 1.</p>
${data.failures.length ? `<p class="fail">${data.failures.length} render failures — see results.json</p>` : ''}
${style ? `<p>Style only, largest change beyond its control: ${pct(style.excess)} at ${esc(style.row.place)}, z${style.row.zoom} (limit ${pct(STYLE_ONLY_LIMIT)}).</p>` : ''}
<h2>Per boundary, largest of all places</h2>
${summary(data.boundaries, baseline)}
<h2>Layers with a hard zoom bound, each alone over the background</h2>
${data.bounds.length ? boundsTable(data.bounds) : '<p>None measured.</p>'}
<h2>Largest changes beyond their control, all layers</h2>
${images(data.boundaries, 12)}
<h2>Per boundary and place</h2>
${perPlace(data.boundaries)}
`;
}

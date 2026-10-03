/**
 * The HTML report of `compare.ts`: measurements, screenshots and diffs, nothing written by hand — the
 * report is an instrument to re-run after a change, not a write-up (interpretation belongs elsewhere).
 */

export type ZoomRow = {
	zoom: number;
	/** Summed brightness of the isolated layer over every place, `line-opacity` (option off). */
	off: number;
	/** The same with `line-layer-opacity` (option on). */
	on: number;
	/** Covered pixels with the option off, and those of them drawn more than once. */
	covered: number;
	over: number;
	/** Brightest pixel over all places, off and on. */
	maxOff: number;
	maxOn: number;
};

export type LayerTable = { id: string; places: string[]; rows: ZoomRow[] };

export type ViewRow = {
	id: string;
	layers: string[];
	/** Full overlay over imagery: share of pixels changed by the option, and the largest change. */
	share: number;
	max: number;
	/** Isolated listed layers: covered pixels drawn more than once with the option off. */
	covered: number;
	over: number;
};

export type ReportData = {
	version: string;
	width: number;
	height: number;
	layers: LayerTable[];
	views: ViewRow[];
	failures: string[];
};

const esc = (text: string) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

export const viewImage = (view: string, kind: 'full' | 'iso', variant: 'off' | 'on' | 'diff') =>
	`${view}.${kind}.${variant}.png`;

function layerTable(table: LayerTable): string {
	const rows = table.rows
		.map(
			(r) => `<tr><td>${r.zoom}</td><td>${r.off}</td><td>${r.on}</td><td>${r.on ? (r.off / r.on).toFixed(3) : '–'}</td>
<td>${r.covered ? pct(r.over / r.covered) : '–'}</td><td>${r.maxOff}</td><td>${r.maxOn}</td></tr>`
		)
		.join('\n');
	return `<h3><code>${esc(table.id)}</code></h3>
<p>Places: ${table.places.map(esc).join(', ')}</p>
<table><thead><tr><th>zoom</th><th>brightness, off<br>(line-opacity)</th><th>brightness, on<br>(line-layer-opacity)</th><th>off / on</th>
<th>covered px drawn more than once, off</th><th>brightest px, off</th><th>brightest px, on</th></tr></thead><tbody>
${rows}
</tbody></table>`;
}

function viewSection(view: ViewRow): string {
	const figure = (kind: 'full' | 'iso', variant: 'off' | 'on' | 'diff', caption: string) =>
		`<figure><img src="${viewImage(view.id, kind, variant)}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;
	return `<section id="${esc(view.id)}"><h3>${esc(view.id)}</h3><div class="grid">
${figure('full', 'off', 'overlay over imagery · option off')}
${figure('full', 'on', 'overlay over imagery · option on')}
${figure('full', 'diff', 'changed by more than 8')}
${figure('iso', 'off', `${view.layers.map(esc).join(' + ')} alone, white on black · off`)}
${figure('iso', 'on', `${view.layers.map(esc).join(' + ')} alone, white on black · on`)}
</div></section>`;
}

export function renderReport(data: ReportData): string {
	const views = data.views
		.map(
			(v) => `<tr><td><a href="#${esc(v.id)}">${esc(v.id)}</a></td><td>${pct(v.share)}</td><td>${v.max}</td>
<td>${v.covered ? pct(v.over / v.covered) : '–'}</td></tr>`
		)
		.join('\n');
	return `<!doctype html>
<meta charset="utf-8">
<title>Overlay layer opacity</title>
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
<h1><code>satellite({ osmOverlay: { layerOpacity } })</code>, off vs. on</h1>
<p>MapLibre GL JS ${esc(data.version)} in headless Chromium (SwiftShader), ${data.width}×${data.height}, pixel ratio 1.
Isolated renders draw only the named layers, recoloured white over black, so a pixel's brightness is its line
coverage. "Drawn more than once": covered pixels (value &gt; 4) brighter than the brightest pixel of the same view
with the option on, plus 3.</p>
${data.failures.length ? `<p class="fail">${data.failures.length} render failures — see results.json</p>` : ''}
<h2>Weight per zoom</h2>
${data.layers.map(layerTable).join('\n')}
<h2>Views</h2>
<table><thead><tr><th>view</th><th>px changed, overlay over imagery</th><th>max Δ</th><th>covered px drawn more than once, off</th></tr></thead><tbody>
${views}
</tbody></table>
${data.views.map(viewSection).join('\n')}
`;
}

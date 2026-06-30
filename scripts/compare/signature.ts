import type { Draw } from './evaluate.js';
import type { Geom } from './types.js';

// Reduce a style's resolved draws for one feature into a comparable "visual signature",
// then diff the OMT signature against the Shortbread one. The signature models what a human
// would actually see: the composited fill color of an area, the casing+fill bands of a line,
// or the text/halo/icon of a label — independent of how many layers produce that result.

export interface RGBA {
	r: number;
	g: number;
	b: number;
	a: number;
}

export function parseRGBA(s: string): RGBA {
	const m = s.match(/^rgba?\(([^)]+)\)/);
	if (m) {
		const p = m[1].split(',').map((x) => parseFloat(x.trim()));
		return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 };
	}
	const hex = s.replace('#', '');
	if (hex.length === 3) return { r: h(hex[0] + hex[0]), g: h(hex[1] + hex[1]), b: h(hex[2] + hex[2]), a: 1 };
	if (hex.length >= 6)
		return {
			r: h(hex.slice(0, 2)),
			g: h(hex.slice(2, 4)),
			b: h(hex.slice(4, 6)),
			a: hex.length >= 8 ? h(hex.slice(6, 8)) / 255 : 1,
		};
	return { r: 0, g: 0, b: 0, a: 1 };
}
const h = (s: string) => parseInt(s, 16);

/** `over` compositing of src (with effective alpha) onto an opaque accumulator. */
function over(acc: RGBA, src: RGBA, extraOpacity: number): RGBA {
	const a = src.a * extraOpacity;
	return {
		r: src.r * a + acc.r * (1 - a),
		g: src.g * a + acc.g * (1 - a),
		b: src.b * a + acc.b * (1 - a),
		a: 1,
	};
}

function num(v: unknown, dflt = 0): number {
	return typeof v === 'number' && isFinite(v) ? v : dflt;
}

export interface Band {
	id: string;
	color: string;
	width: number;
	opacity: number;
	dash: number[] | null;
}

export type Signature =
	| { kind: 'none' }
	| { kind: 'fill'; composite: RGBA; topColor: string | null; pattern: boolean; layers: number }
	| { kind: 'line'; casing: Band | null; fill: Band | null; count: number }
	| {
			kind: 'symbol';
			present: boolean;
			textColor: string | null;
			haloColor: string | null;
			haloWidth: number;
			textSize: number;
			font: string;
			transform: string;
			icon: boolean;
	  };

export function buildSignature(geom: Geom, draws: Draw[], bg: string): Signature {
	if (geom === 'Polygon') {
		const fills = draws.filter((d) => d.type === 'fill');
		if (fills.length === 0) return { kind: 'none' };
		let acc = parseRGBA(bg);
		let pattern = false;
		let topColor: string | null = null;
		for (const f of fills) {
			if (f.props['fill-pattern'] != null) pattern = true;
			const col = f.props['fill-color'];
			if (typeof col === 'string') {
				acc = over(acc, parseRGBA(col), num(f.props['fill-opacity'], 1));
				topColor = col;
			}
		}
		return { kind: 'fill', composite: acc, topColor, pattern, layers: fills.length };
	}

	if (geom === 'LineString') {
		const lines = draws.filter((d) => d.type === 'line');
		if (lines.length === 0) return { kind: 'none' };
		const toBand = (d: Draw): Band => ({
			id: d.id,
			color: typeof d.props['line-color'] === 'string' ? (d.props['line-color'] as string) : 'rgba(0,0,0,1)',
			width: num(d.props['line-width']),
			opacity: num(d.props['line-opacity'], 1),
			dash: Array.isArray(d.props['line-dasharray']) ? (d.props['line-dasharray'] as number[]) : null,
		});
		// Render order is bottom→top. The fill is the topmost band; the casing is the band directly
		// beneath it. (Shortbread bridges add a third, bottom-most "deck" band that OMT has no
		// equivalent for — it is near-invisible land-color and is intentionally not compared here.)
		const fill = toBand(lines[lines.length - 1]);
		const casing = lines.length > 1 ? toBand(lines[lines.length - 2]) : null;
		return { kind: 'line', casing, fill, count: lines.length };
	}

	// Point → symbol
	const syms = draws.filter((d) => d.type === 'symbol');
	if (syms.length === 0)
		return {
			kind: 'symbol',
			present: false,
			textColor: null,
			haloColor: null,
			haloWidth: 0,
			textSize: 0,
			font: '',
			transform: 'none',
			icon: false,
		};
	const s = syms[0];
	return {
		kind: 'symbol',
		present: true,
		textColor: typeof s.props['text-color'] === 'string' ? (s.props['text-color'] as string) : null,
		haloColor: typeof s.props['text-halo-color'] === 'string' ? (s.props['text-halo-color'] as string) : null,
		haloWidth: num(s.props['text-halo-width']),
		textSize: num(s.props['text-size']),
		font: Array.isArray(s.props['text-font']) ? (s.props['text-font'] as string[]).join(',') : '',
		transform: typeof s.props['text-transform'] === 'string' ? (s.props['text-transform'] as string) : 'none',
		icon: s.props['icon-image'] != null,
	};
}

// ── Comparison ──────────────────────────────────────────────────────────────────

export interface Tol {
	color: number; // max sRGB euclidean distance (0..441)
	widthRel: number; // relative width tolerance
	widthAbs: number; // absolute width floor (px)
	halo: number; // absolute halo-width tolerance
	sizeRel: number; // relative text-size tolerance
}

export const DEFAULT_TOL: Tol = { color: 16, widthRel: 0.25, widthAbs: 0.75, halo: 0.75, sizeRel: 0.2 };

function colorDist(a: string, b: string): number {
	const x = parseRGBA(a);
	const y = parseRGBA(b);
	// include alpha as a 0..255 channel so transparent vs opaque counts as a difference
	return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2 + ((x.a - y.a) * 255) ** 2);
}

function widthClose(a: number, b: number, tol: Tol): boolean {
	if (Math.abs(a - b) <= tol.widthAbs) return true;
	const m = Math.max(a, b);
	return m > 0 && Math.abs(a - b) / m <= tol.widthRel;
}

function cmpBand(label: string, a: Band | null, b: Band | null, tol: Tol, out: string[]): void {
	if (!a && !b) return;
	if (!a || !b) {
		out.push(`${label}: present on ${a ? 'OMT' : 'Shortbread'} only`);
		return;
	}
	const cd = colorDist(a.color, b.color);
	if (cd > tol.color) out.push(`${label} color Δ${cd.toFixed(0)} (omt ${a.color} / sb ${b.color})`);
	if (!widthClose(a.width, b.width, tol))
		out.push(`${label} width omt ${a.width.toFixed(1)} / sb ${b.width.toFixed(1)}`);
	const ad = a.dash ? a.dash.join(',') : '';
	const bd = b.dash ? b.dash.join(',') : '';
	if (!!a.dash !== !!b.dash) out.push(`${label} dash omt [${ad}] / sb [${bd}]`);
}

/** Compare OMT vs Shortbread signatures; returns a list of human-readable difference strings. */
export function compare(omt: Signature, sb: Signature, tol: Tol = DEFAULT_TOL): string[] {
	const out: string[] = [];

	if (omt.kind === 'none' || (omt.kind === 'symbol' && !omt.present)) {
		if (sb.kind !== 'none' && !(sb.kind === 'symbol' && !sb.present))
			out.push('no OMT representation, but Shortbread draws it');
		return out;
	}
	if (sb.kind === 'none' || (sb.kind === 'symbol' && !sb.present)) {
		out.push('OMT draws it, but Shortbread has no representation');
		return out;
	}
	if (omt.kind !== sb.kind) {
		out.push(`geometry kind mismatch: omt ${omt.kind} / sb ${sb.kind}`);
		return out;
	}

	if (omt.kind === 'fill' && sb.kind === 'fill') {
		const cd = colorDist(
			`rgba(${omt.composite.r},${omt.composite.g},${omt.composite.b},1)`,
			`rgba(${sb.composite.r},${sb.composite.g},${sb.composite.b},1)`
		);
		if (cd > tol.color)
			out.push(`fill composite Δ${cd.toFixed(0)} (omt ${fmt(omt.composite)} / sb ${fmt(sb.composite)})`);
		// fill-pattern parity (e.g. water wave) is out of scope — see project decisions — so it is
		// intentionally not diffed here.
	} else if (omt.kind === 'line' && sb.kind === 'line') {
		cmpBand('line fill', omt.fill, sb.fill, tol, out);
		cmpBand('line casing', omt.casing, sb.casing, tol, out);
	} else if (omt.kind === 'symbol' && sb.kind === 'symbol') {
		if (omt.textColor && sb.textColor) {
			const cd = colorDist(omt.textColor, sb.textColor);
			if (cd > tol.color) out.push(`text color Δ${cd.toFixed(0)} (omt ${omt.textColor} / sb ${sb.textColor})`);
		}
		if (omt.haloColor && sb.haloColor && colorDist(omt.haloColor, sb.haloColor) > tol.color)
			out.push(`halo color (omt ${omt.haloColor} / sb ${sb.haloColor})`);
		if (Math.abs(omt.haloWidth - sb.haloWidth) > tol.halo)
			out.push(`halo width omt ${omt.haloWidth} / sb ${sb.haloWidth}`);
		if (omt.textSize && sb.textSize) {
			const m = Math.max(omt.textSize, sb.textSize);
			if (Math.abs(omt.textSize - sb.textSize) / m > tol.sizeRel)
				out.push(`text size omt ${omt.textSize} / sb ${sb.textSize}`);
		}
		if (omt.transform !== sb.transform) out.push(`text transform omt ${omt.transform} / sb ${sb.transform}`);
		if (omt.icon !== sb.icon) out.push(`icon omt ${omt.icon} / sb ${sb.icon}`);
	}

	return out;
}

const fmt = (c: RGBA) => `#${[c.r, c.g, c.b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`;

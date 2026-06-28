import { Color } from '../color/index.js';

// Canonicalize a style (or a single layer) into a comparison form:
//   - every color string is parsed to a canonical rounded RGB(A) form, so that
//     equivalent encodings (#ff0000 / rgb(255,0,0) / hsl(0,100%,50%)) compare equal
//   - object keys are sorted, so property insertion order is irrelevant
// Array order is preserved (layer order and expression operand order are meaningful).
//
// This lets the per-group refactor be judged on *conceptual* parity: the builders may
// emit colors in any valid encoding and set properties in any order.

function isColorString(s: string): boolean {
	const t = s.trim().toLowerCase();
	return (
		t.startsWith('#') || t.startsWith('rgb(') || t.startsWith('rgba(') || t.startsWith('hsl(') || t.startsWith('hsla(')
	);
}

function canonicalizeColor(s: string): string {
	try {
		return Color.parse(s).asRGB().round().asString();
	} catch {
		return s;
	}
}

function walk(value: unknown): unknown {
	if (typeof value === 'string') return isColorString(value) ? canonicalizeColor(value) : value;
	if (Array.isArray(value)) return value.map(walk);
	if (value !== null && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			out[key] = walk((value as Record<string, unknown>)[key]);
		}
		return out;
	}
	return value;
}

export function normalizeStyle(style: unknown): unknown {
	return walk(style);
}

export function normalizeLayer(layer: unknown): unknown {
	return walk(layer);
}

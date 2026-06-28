import { describe, expect, it } from 'vitest';
import { Color } from '../color/index.js';
import { osm } from '../api/osm.js';
import { satellite } from '../api/satellite.js';

// Golden-file regression gate. Snapshots were frozen from the original pipeline and assert
// CONCEPTUAL parity — colors are canonicalized to RGB and object keys sorted, so equivalent
// color encodings and property order don't matter. A failure means the produced style changed;
// update the snapshot only if the change is intended.

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

// Canonicalize colors and sort object keys; array order (layer order, expression operands) is kept.
function normalizeStyle(value: unknown): unknown {
	if (typeof value === 'string') return isColorString(value) ? canonicalizeColor(value) : value;
	if (Array.isArray(value)) return value.map(normalizeStyle);
	if (value !== null && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			out[key] = normalizeStyle((value as Record<string, unknown>)[key]);
		}
		return out;
	}
	return value;
}

describe('style output baseline (conceptual parity net)', () => {
	const variants: Record<string, () => unknown> = {
		'osm-colorful-light': () => osm({ theme: { palette: 'colorful', darkMode: false } }),
		'osm-colorful-dark': () => osm({ theme: { palette: 'colorful', darkMode: true } }),
		'osm-colorful-de': () => osm({ theme: 'colorful', text: { language: 'de' } }),
		'osm-gray-light': () => osm({ theme: 'gray' }),
		'osm-natural-light': () => osm({ theme: 'natural' }),
		'osm-muted-light': () => osm({ theme: 'muted' }),
		'osm-toner-light': () => osm({ theme: 'toner' }),
		satellite: () => satellite(),
	};

	for (const [name, build] of Object.entries(variants)) {
		it(`matches the baseline for ${name}`, () => {
			expect(normalizeStyle(build())).toMatchSnapshot();
		});
	}
});

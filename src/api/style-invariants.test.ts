import { beforeAll, describe, expect, it } from 'vitest';
import type { LayerSpecification, StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { getStyleVariants } from '../variants.js';

// Structural sanity checks that must hold for EVERY layer of EVERY generated style variant
// (all palettes, languages, terrain, satellite, …). These catch layers that would render
// black / in a default font because a mandatory paint/layout property was forgotten.

interface NamedStyle {
	name: string;
	style: StyleSpecification;
}

let styles: NamedStyle[];

beforeAll(async () => {
	styles = await Promise.all(getStyleVariants().map(async (v) => ({ name: v.name, style: await v.build() })));
});

const paint = (l: LayerSpecification): Record<string, unknown> =>
	((l as { paint?: Record<string, unknown> }).paint ?? {}) as Record<string, unknown>;
const layout = (l: LayerSpecification): Record<string, unknown> =>
	((l as { layout?: Record<string, unknown> }).layout ?? {}) as Record<string, unknown>;

// A `background` layer pinned to opacity 0 is a non-rendering slot anchor (a `beforeId` target),
// not a real fill — it intentionally carries no color.
const isSlotAnchor = (l: LayerSpecification): boolean =>
	l.type === 'background' && paint(l)['background-opacity'] === 0;

// Collect "<variant> / <layer> (<type>)" for every layer matching `predicate` but failing `ok`.
function offenders(predicate: (l: LayerSpecification) => boolean, ok: (l: LayerSpecification) => boolean): string[] {
	const out: string[] = [];
	for (const { name, style } of styles) {
		for (const layer of style.layers) {
			if (!predicate(layer) || ok(layer)) continue;
			out.push(`${name} / ${layer.id} (${layer.type})`);
		}
	}
	return out;
}

function expectNoOffenders(list: string[]): void {
	expect(list, `\n${list.join('\n')}\n`).toEqual([]);
}

describe('generated style invariants', () => {
	it('builds at least one variant with layers', () => {
		expect(styles.length).toBeGreaterThan(0);
		expect(styles.every((s) => s.style.layers.length > 0)).toBe(true);
	});

	it('every text-rendering layer defines a font', () => {
		expectNoOffenders(
			offenders(
				(l) => l.type === 'symbol' && layout(l)['text-field'] != null,
				(l) => layout(l)['text-font'] != null
			)
		);
	});

	it('every text-rendering layer defines a text color', () => {
		expectNoOffenders(
			offenders(
				(l) => l.type === 'symbol' && layout(l)['text-field'] != null,
				(l) => paint(l)['text-color'] != null
			)
		);
	});

	it('every fill layer defines a fill-color', () => {
		expectNoOffenders(
			offenders(
				(l) => l.type === 'fill',
				(l) => paint(l)['fill-color'] != null
			)
		);
	});

	it('every line layer defines a line-color', () => {
		expectNoOffenders(
			offenders(
				(l) => l.type === 'line',
				(l) => paint(l)['line-color'] != null
			)
		);
	});

	it('every fill-extrusion layer defines a fill-extrusion-color', () => {
		expectNoOffenders(
			offenders(
				(l) => l.type === 'fill-extrusion',
				(l) => paint(l)['fill-extrusion-color'] != null
			)
		);
	});

	it('every rendering background layer defines a background-color', () => {
		expectNoOffenders(
			offenders(
				(l) => l.type === 'background' && !isSlotAnchor(l),
				(l) => paint(l)['background-color'] != null
			)
		);
	});

	it('every layer has a unique id within its style', () => {
		const dupes: string[] = [];
		for (const { name, style } of styles) {
			const seen = new Set<string>();
			for (const layer of style.layers) {
				if (seen.has(layer.id)) dupes.push(`${name} / ${layer.id}`);
				seen.add(layer.id);
			}
		}
		expectNoOffenders(dupes);
	});
});

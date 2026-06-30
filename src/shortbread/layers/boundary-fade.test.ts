import { beforeAll, describe, expect, it } from 'vitest';
import { normalizePropertyExpression, latest } from '@maplibre/maplibre-gl-style-spec';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../api/osm.js';

// Boundaries that appear above z0 fade in by opacity over their appearance zoom `z` → `z+1`:
// invisible (0) at z, half transparent (0.5) at z+0.5, fully opaque (1) at z+1.
// (Country/disputed boundaries exist from z0 and are always drawn, so they are not faded.)
const BOUNDARIES: { id: string; z: number }[] = [
	{ id: 'boundary-state', z: 7 }, // Shortbread admin level 4 appears at z7
	{ id: 'boundary-country-maritime', z: 4 }, // maritime borders are drawn from z4
];

let style: StyleSpecification;

beforeAll(async () => {
	style = await osm();
});

// Resolved line-opacity of a layer at a zoom; `null` if absent. No line-opacity ⇒ fully opaque (1).
function lineOpacity(id: string, zoom: number): number | null {
	const layer = style.layers.find((l) => l.id === id);
	if (!layer) return null;
	const value = (layer as { paint?: Record<string, unknown> }).paint?.['line-opacity'] ?? 1;
	const expr = normalizePropertyExpression(
		value as Parameters<typeof normalizePropertyExpression>[0],
		latest.paint_line['line-opacity'] as Parameters<typeof normalizePropertyExpression>[1]
	);
	return expr.evaluate({ zoom } as never, { type: 2, properties: {} } as never) as number;
}

describe('boundaries fade in by opacity at their appearance zoom', () => {
	for (const { id, z } of BOUNDARIES) {
		it(`${id} fades 0 → 0.5 → 1 over z${z}–${z + 1}`, () => {
			expect(lineOpacity(id, z), `${id} must exist`).not.toBeNull();
			expect(lineOpacity(id, z), `${id} must be invisible at z${z}`).toBe(0);
			expect(lineOpacity(id, z + 0.5), `${id} must be half transparent at z${z + 0.5}`).toBeCloseTo(0.5, 2);
			expect(lineOpacity(id, z + 1), `${id} must be fully opaque at z${z + 1}`).toBe(1);
		});
	}
});

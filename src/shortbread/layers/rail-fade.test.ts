import { beforeAll, describe, expect, it } from 'vitest';
import { normalizePropertyExpression, latest } from '@maplibre/maplibre-gl-style-spec';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { osm } from '../../api/osm.js';

// Rail tracks fade in by opacity over z14 → z15 — the zoom at which OSM Bright starts drawing rail
// (its width curves are ~0 below 14): invisible (0) at z14, half transparent (0.5) at z14.5, fully
// opaque (1) at z15. This holds for the base (:outline) and the hatching (fill) of every rail kind.
const RAIL_KINDS = ['rail', 'lightrail', 'subway', 'tram', 'narrowgauge', 'funicular', 'monorail'];
const Z = 14;

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

describe('rail tracks fade in by opacity at z14', () => {
	for (const kind of RAIL_KINDS) {
		for (const layerId of [`transport-${kind}`, `transport-${kind}:outline`]) {
			it(`${layerId} fades 0 → 0.5 → 1 over z${Z}–${Z + 1}`, () => {
				expect(lineOpacity(layerId, Z), `${layerId} must exist`).not.toBeNull();
				expect(lineOpacity(layerId, Z), `${layerId} must be invisible at z${Z}`).toBe(0);
				expect(lineOpacity(layerId, Z + 0.5), `${layerId} must be half transparent at z${Z + 0.5}`).toBeCloseTo(0.5, 2);
				expect(lineOpacity(layerId, Z + 1), `${layerId} must be fully opaque at z${Z + 1}`).toBe(1);
			});
		}
	}
});

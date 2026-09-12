import { describe, expect, it } from 'vitest';
import { SHORTBREAD_SCHEMA } from './schema.js';
import { osm } from '../api/index.js';
import { auditSchema } from '../lib/schema-audit.js';
import type { StyleSpecification } from '../types/index.js';

// ── Shortbread schema conformance ─────────────────────────────────────────────────
//
// `schema.ts` is the `vector_layers` block of the live VersaTiles OSM TileJSON — the machine-
// readable statement of what the tiles actually contain: which source-layers exist, at which zooms,
// and which fields each carries. It is vendored so these tests are offline and deterministic;
// refresh it with `npm run vendor-schema -- shortbread --write`, and check whether it has gone stale
// with `--check`.
//
// These tests answer a question no other suite does: **is the style asking for data that exists?**
// A filter on a field the schema does not have is not a syntax error — it silently evaluates to
// `undefined` and the layer renders everything, or nothing, with no warning. That is how
// `symbol-transit-subway` came to filter on a non-existent `station` field and never render.
//
// The audit itself lives in `src/lib/schema-audit.ts` and is generic over (style, record), so a
// second schema gets the same guard by restating only these three lines. See
// SCHEMA-SUPPORT-PLAN.md §8.1.
//
// See https://shortbread-tiles.org/schema/1.1/ for the prose specification.

/** Built with every feature on, so no layer is missing from the audit. */
const style: StyleSpecification = osm({ features: { buildings: 'extruded', landcover: true } });
const audit = auditSchema(style, SHORTBREAD_SCHEMA);

describe('every source-layer the style reads exists in the schema', () => {
	it('no unknown source-layer', () => {
		expect(audit.unknownSourceLayers, 'source-layers that do not exist in the tiles').toEqual([]);
	});
});

describe('every field the style reads exists on its source-layer', () => {
	it('no filter or expression reads a field the tiles do not carry', () => {
		expect(audit.unknownFields, 'reads of non-existent fields — these evaluate to undefined and fail silently').toEqual(
			[]
		);
	});

	// Language fields (`name_de`, …) are generated per tileset and legitimately vary, so a missing
	// one is a translation gap rather than a broken filter — hence its own list.
	it('every language field read is present in the tileset', () => {
		expect(audit.missingLanguageFields).toEqual([]);
	});
});

describe('no layer is drawn before its data exists', () => {
	it('every layer is gated at or after its source-layer minzoom', () => {
		expect(audit.drawnBeforeData).toEqual([]);
	});
});

describe('schema coverage', () => {
	// Source-layers the style deliberately does not render. Each entry is a decision, not an
	// oversight — adding a layer to the tiles should make this list fail until someone chooses.
	// Empty, and worth keeping that way: every source-layer the tiles carry is rendered. An entry
	// here is a deliberate decision not to draw something, not a backlog item.
	//
	// Kind-level gaps are not expressible here and are recorded at their layer instead — e.g.
	// `streets_polygons_labels` is rendered for `pedestrian` only, because the layer carries no
	// `ref` and `service` polygons are not drawn at all.
	const NOT_RENDERED: Record<string, string> = {};

	it('every source-layer is either rendered or explicitly listed as not rendered', () => {
		const unaccounted = audit.unrendered.filter((id) => !(id in NOT_RENDERED));
		expect(unaccounted, 'source-layers neither rendered nor listed as a known gap').toEqual([]);
	});

	it('nothing in the not-rendered list is actually rendered', () => {
		const stale = Object.keys(NOT_RENDERED).filter((id) => audit.usage.has(id));
		expect(stale, 'listed as not rendered, but the style renders it — remove the entry').toEqual([]);
	});
});

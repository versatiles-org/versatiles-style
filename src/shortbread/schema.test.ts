import { describe, expect, it } from 'vitest';
import { SHORTBREAD_SCHEMA } from './schema.js';
import { osm } from '../api/index.js';
import type { StyleSpecification } from '../types/index.js';

// ── Shortbread schema conformance ─────────────────────────────────────────────────
//
// `schema.json` is the `vector_layers` block of the live VersaTiles OSM TileJSON — the machine-
// readable statement of what the tiles actually contain: which source-layers exist, at which zooms,
// and which fields each carries. It is vendored so these tests are offline and deterministic;
// refresh it from https://tiles.versatiles.org/tiles/osm/tiles.json when the tileset changes.
//
// These tests answer a question no other suite does: **is the style asking for data that exists?**
// A filter on a field the schema does not have is not a syntax error — it silently evaluates to
// `undefined` and the layer renders everything, or nothing, with no warning. That is how
// `symbol-transit-subway` came to filter on a non-existent `station` field and never render.
//
// See https://shortbread-tiles.org/schema/1.1/ for the prose specification.

const SCHEMA = SHORTBREAD_SCHEMA;

/** Built with every feature on, so no layer is missing from the audit. */
const style: StyleSpecification = osm({ features: { buildings: 'extruded', landcover: true } });

/** Every `['get', 'field']` reachable from a value. */
function fieldsIn(value: unknown, out: Set<string> = new Set()): Set<string> {
	if (Array.isArray(value)) {
		if (value[0] === 'get' && typeof value[1] === 'string') out.add(value[1]);
		for (const item of value) fieldsIn(item, out);
	}
	return out;
}

/** Source-layer → the fields the style reads from it. */
function usage(): Map<string, Set<string>> {
	const used = new Map<string, Set<string>>();
	for (const layer of style.layers) {
		const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
		if (!sourceLayer) continue;
		const fields = used.get(sourceLayer) ?? new Set<string>();
		const l = layer as { filter?: unknown; paint?: Record<string, unknown>; layout?: Record<string, unknown> };
		for (const value of [l.filter, ...Object.values(l.paint ?? {}), ...Object.values(l.layout ?? {})]) {
			for (const f of fieldsIn(value)) fields.add(f);
		}
		used.set(sourceLayer, fields);
	}
	return used;
}

describe('every source-layer the style reads exists in the schema', () => {
	it('no unknown source-layer', () => {
		const unknown = [...usage().keys()].filter((id) => !(id in SCHEMA));
		expect(unknown, 'source-layers that do not exist in the tiles').toEqual([]);
	});
});

describe('every field the style reads exists on its source-layer', () => {
	// Language fields (`name_de`, …) are generated per tileset and legitimately vary, so a missing
	// one is a translation gap rather than a broken filter — checked separately below.
	const isLanguageField = (f: string) => /^name_[a-z-]+$/i.test(f);

	it('no filter or expression reads a field the tiles do not carry', () => {
		const bad: string[] = [];
		for (const [sourceLayer, fields] of usage()) {
			const known = new Set(SCHEMA[sourceLayer]?.fields ?? []);
			for (const field of fields) {
				if (isLanguageField(field) || known.has(field)) continue;
				bad.push(`${sourceLayer}.${field}`);
			}
		}
		expect(bad, 'reads of non-existent fields — these evaluate to undefined and fail silently').toEqual([]);
	});

	it('every language field read is present in the tileset', () => {
		const missing: string[] = [];
		for (const [sourceLayer, fields] of usage()) {
			const known = new Set(SCHEMA[sourceLayer]?.fields ?? []);
			for (const field of fields)
				if (isLanguageField(field) && !known.has(field)) missing.push(`${sourceLayer}.${field}`);
		}
		expect(missing).toEqual([]);
	});
});

describe('no layer is drawn before its data exists', () => {
	it('every layer is gated at or after its source-layer minzoom', () => {
		// Drawing below the source-layer's minzoom shows nothing at best; at worst it leaks data a
		// tileset extension happens to supply early, which is exactly what issue #124 was about.
		const early: string[] = [];
		for (const layer of style.layers) {
			const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
			if (!sourceLayer || !(sourceLayer in SCHEMA)) continue;
			const min = (layer as { minzoom?: number }).minzoom ?? 0;
			const dataFrom = SCHEMA[sourceLayer].minzoom;
			if (min < dataFrom) early.push(`${layer.id}: minzoom ${min} but ${sourceLayer} starts at z${dataFrom}`);
		}
		expect(early).toEqual([]);
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
		const used = new Set(usage().keys());
		const unaccounted = Object.keys(SCHEMA).filter((id) => !used.has(id) && !(id in NOT_RENDERED));
		expect(unaccounted, 'source-layers neither rendered nor listed as a known gap').toEqual([]);
	});

	it('nothing in the not-rendered list is actually rendered', () => {
		const used = new Set(usage().keys());
		const stale = Object.keys(NOT_RENDERED).filter((id) => used.has(id));
		expect(stale, 'listed as not rendered, but the style renders it — remove the entry').toEqual([]);
	});
});

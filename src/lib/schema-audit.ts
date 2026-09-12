/**
 * Auditing a built style against a vendored tileset schema record — generic over both.
 *
 * The questions answered here are the ones no other suite asks: **is the style reading data that
 * exists?**, and **is it drawing it before the tiles carry it?** A filter on a field the tiles lack is
 * not a syntax error — it silently evaluates to `undefined`, so the layer renders everything or
 * nothing with no warning. That is how `symbol-transit-subway` came to filter on a non-existent
 * `station` field and never render.
 *
 * This module holds no schema knowledge of its own; it takes the record as an argument. Two callers
 * use it for two different purposes:
 *
 *  - each schema's conformance test (`src/<schema>/schema.test.ts`) asserts that its own style is clean
 *    against its own record — offline, deterministic, a CI gate;
 *  - `scripts/schema-gate.ts` points one schema's style at *another* schema's record, which is how a
 *    prospective schema is assessed before any cartography is written: every mismatch it reports is a
 *    concept that has to be re-bound, and every group that cannot bind at all is a concept the other
 *    schema does not express (see SCHEMA-SUPPORT-PLAN.md §7 step 2).
 *
 * It is deliberately not re-exported from `src/lib/index.ts` or the public entry: it is tooling, and
 * keeping it unreachable from `src/index.ts` is what keeps it out of the published bundle.
 */
import type { StyleSpecification } from '../types/index.js';

/** One source-layer of a tileset: the zooms it spans and the fields it carries. */
export type SchemaLayer = { minzoom: number; maxzoom: number; fields: readonly string[] };

/** A vendored tileset schema: source-layer id → its zooms and fields. */
export type SchemaRecord = Readonly<Record<string, SchemaLayer>>;

/**
 * Language fields (`name_de`, `name:de`, …) are generated per tileset and legitimately vary, so a
 * missing one is a translation gap rather than a broken filter, and is reported separately. Both
 * conventions are matched: Shortbread and OpenMapTiles use `name_de`, Protomaps uses `name:de`, and
 * OpenMapTiles carries both.
 */
const LANGUAGE_FIELD = /^name[_:][a-z-]+$/i;

/** Every `['get', 'field']` reachable from a value. */
export function fieldsIn(value: unknown, out: Set<string> = new Set()): Set<string> {
	if (Array.isArray(value)) {
		if (value[0] === 'get' && typeof value[1] === 'string') out.add(value[1]);
		for (const item of value) fieldsIn(item, out);
	}
	return out;
}

/** Source-layer → the fields the style reads from it. Layers with no `source-layer` are not data. */
export function schemaUsage(style: StyleSpecification): Map<string, Set<string>> {
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

/** What a style asks of a schema, and where the schema cannot answer. Every list is sorted. */
export type SchemaAudit = {
	/** Source-layer → fields read, as `schemaUsage` computed it. */
	usage: Map<string, Set<string>>;
	/** Source-layers the style reads that the tiles do not have. */
	unknownSourceLayers: string[];
	/** `sourceLayer.field` reads of fields the tiles do not carry — these fail silently. */
	unknownFields: string[];
	/** `sourceLayer.field` language fields the style reads but this tileset does not translate. */
	missingLanguageFields: string[];
	/** Layers gated below the zoom their source-layer's data begins, as readable lines. */
	drawnBeforeData: string[];
	/** Source-layers the tiles carry that the style never reads. */
	unrendered: string[];
};

/** Audit a built style against a schema record. Pure: no I/O, no tiles, no network. */
export function auditSchema(style: StyleSpecification, schema: SchemaRecord): SchemaAudit {
	const usage = schemaUsage(style);
	const unknownSourceLayers: string[] = [];
	const unknownFields: string[] = [];
	const missingLanguageFields: string[] = [];

	for (const [sourceLayer, fields] of usage) {
		if (!(sourceLayer in schema)) {
			unknownSourceLayers.push(sourceLayer);
			// Its fields are not reported too: one missing source-layer would otherwise bury the
			// report under every field read from it.
			continue;
		}
		const known = new Set(schema[sourceLayer].fields);
		for (const field of fields) {
			if (known.has(field)) continue;
			(LANGUAGE_FIELD.test(field) ? missingLanguageFields : unknownFields).push(`${sourceLayer}.${field}`);
		}
	}

	// Drawing below the source-layer's minzoom shows nothing at best; at worst it leaks data a tileset
	// extension happens to supply early, which is exactly what issue #124 was about.
	const drawnBeforeData: string[] = [];
	for (const layer of style.layers) {
		const sourceLayer = (layer as { 'source-layer'?: string })['source-layer'];
		if (!sourceLayer || !(sourceLayer in schema)) continue;
		const min = (layer as { minzoom?: number }).minzoom ?? 0;
		const dataFrom = schema[sourceLayer].minzoom;
		if (min < dataFrom) drawnBeforeData.push(`${layer.id}: minzoom ${min} but ${sourceLayer} starts at z${dataFrom}`);
	}

	const unrendered = Object.keys(schema).filter((id) => !usage.has(id));

	const sorted = (list: string[]) => list.sort((a, b) => a.localeCompare(b));
	return {
		usage,
		unknownSourceLayers: sorted(unknownSourceLayers),
		unknownFields: sorted(unknownFields),
		missingLanguageFields: sorted(missingLanguageFields),
		drawnBeforeData: sorted(drawnBeforeData),
		unrendered: sorted(unrendered),
	};
}

/** How much of one layer group a schema can carry. */
export type GroupBinding = {
	/** Dotted group path, e.g. `roads.streets.residential`. */
	group: string;
	/** Layers the group controls that read tile data at all. */
	dataLayers: number;
	/** Of those, how many read a source-layer this schema has. */
	bound: number;
	/** The source-layers it needed and the schema lacks, deduplicated and sorted. */
	missing: string[];
};

/**
 * Per layer group, how much of it a schema can express.
 *
 * This is the report that decides whether a schema is worth supporting at all: a group with
 * `bound === 0` is a cartographic concept the tileset does not carry, and no filter rewrite can
 * conjure it. `dataLayers === 0` means the group is pure styling (backgrounds, slots) and binds
 * trivially.
 *
 * `groups` is a layer-group map as `getLayerGroupMap()` produces: a tree whose leaves are arrays of
 * layer ids. Branch nodes are walked; a leaf's path is its dotted key chain.
 */
export function auditGroupBinding(
	style: StyleSpecification,
	schema: SchemaRecord,
	groups: { [key: string]: string[] | { [key: string]: string[] | unknown } }
): GroupBinding[] {
	const sourceLayerOf = new Map<string, string | undefined>();
	for (const layer of style.layers) {
		sourceLayerOf.set(layer.id, (layer as { 'source-layer'?: string })['source-layer']);
	}

	const out: GroupBinding[] = [];
	const walk = (node: Record<string, unknown>, path: string[]): void => {
		for (const [key, value] of Object.entries(node)) {
			const here = [...path, key];
			if (Array.isArray(value)) {
				let dataLayers = 0;
				let bound = 0;
				const missing = new Set<string>();
				for (const id of value as string[]) {
					const sourceLayer = sourceLayerOf.get(id);
					// A layer the group names but the style did not emit (hidden by the options it was
					// built with) carries no evidence either way, so it is not counted.
					if (!sourceLayerOf.has(id) || sourceLayer === undefined) continue;
					dataLayers++;
					if (sourceLayer in schema) bound++;
					else missing.add(sourceLayer);
				}
				out.push({ group: here.join('.'), dataLayers, bound, missing: [...missing].sort() });
			} else if (value && typeof value === 'object') {
				walk(value as Record<string, unknown>, here);
			}
		}
	};
	walk(groups as Record<string, unknown>, []);
	return out.sort((a, b) => a.group.localeCompare(b.group));
}

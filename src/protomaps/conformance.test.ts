import { describe, expect, it } from 'vitest';
import { resolveLayerGroups } from '../options/index.js';
import { resolveProtomaps } from './options.js';
import { auditSchema } from '../lib/schema-audit.js';
import { PROTOMAPS_SCHEMA } from './schema.js';
import { buildContext } from './context.js';
import { buildStyleLayers, protomapsLayers } from './layers/index.js';
import type { StyleSpecification } from '../types/index.js';

// The same audit as the other two schemas, against a third record — SCHEMA-SUPPORT-PLAN.md §8.1. It
// proves the layers read source-layers and fields Protomaps has, and are not drawn before their data;
// it cannot prove a filter matches anything, which needs tiles (§8.2).

// `landcover` on, so the audit covers every layer the style can emit, the low-zoom band included.
const ctx = buildContext(
	resolveProtomaps({ urls: { protomaps: 'pmtiles://https://example.org/x.pmtiles' }, features: { landcover: true } })
);
const style = { version: 8, sources: {}, layers: buildStyleLayers(ctx) } as StyleSpecification;
const audit = auditSchema(style, PROTOMAPS_SCHEMA);

describe('the ported layers read data Protomaps carries', () => {
	it('no unknown source-layer', () => {
		expect(audit.unknownSourceLayers).toEqual([]);
	});

	it('no filter or expression reads a field the tiles do not carry', () => {
		// Three of these were real when the port was first written: `boundaries.maritime` (Protomaps does
		// not distinguish maritime borders), `landuse.name` (pedestrian areas carry no name) and
		// `roads.bicycle` (no designated-cycleway flag). Each is now an omitted layer rather than a filter
		// that silently matches nothing.
		expect(audit.unknownFields).toEqual([]);
	});

	it('every language field read is present in the tileset', () => {
		expect(audit.missingLanguageFields).toEqual([]);
	});

	it('every layer is gated at or after its source-layer minzoom', () => {
		expect(audit.drawnBeforeData).toEqual([]);
	});

	it('reads eight of the nine source-layers', () => {
		expect([...audit.usage.keys()].sort()).toEqual([
			'boundaries',
			'buildings',
			'landcover',
			'landuse',
			'places',
			'pois',
			'roads',
			'water',
		]);
		// `earth` is the landmass polygon. Shortbread has no counterpart — its background fill serves the
		// same purpose — so drawing it would add a layer only this schema has, which §23 warns against.
		expect(audit.unrendered).toEqual(['earth']);
	});
});

describe('the schema seam', () => {
	it('sources every data layer from the Protomaps source name', () => {
		const sources = new Set(style.layers.map((l) => (l as { source?: string }).source).filter(Boolean));
		expect([...sources]).toEqual(['protomaps']);
	});

	it('emits the four slot anchors §6 requires of every schema', () => {
		const anchors = style.layers.filter((l) => l.id.startsWith('slot-')).map((l) => l.id);
		expect(anchors).toEqual(['slot-below-fills', 'slot-below-streets', 'slot-below-symbols', 'slot-below-labels']);
	});

	it('reads Protomaps’ own name-field convention — `name:xx` only', () => {
		const de = buildContext(resolveProtomaps({ urls: { protomaps: 'pmtiles://x' }, text: { language: 'de' } }));
		expect(de.nameField).toEqual(['coalesce', ['get', 'name:de'], ['get', 'name']]);
		const strict = buildContext(
			resolveProtomaps({ urls: { protomaps: 'pmtiles://x' }, text: { language: 'de', languageStrict: true } })
		);
		expect(strict.nameField).toEqual(['get', 'name:de']);
	});

	it('floors each layer at its own source-layer’s data zoom', () => {
		// `roads` starts at z3 here, where Shortbread's `streets` starts at z4 and OpenMapTiles' at z4.
		const road = style.layers.find((l) => l.id === 'street-motorway') as { minzoom?: number } | undefined;
		expect(road?.minzoom).toBeGreaterThanOrEqual(3);
	});
});

describe('mixed-geometry source-layers', () => {
	// `water` and `roads` both carry lines and polygons, and a line layer paints polygon boundaries.
	const MIXED = new Set(['water', 'roads']);

	it('every layer reading one filters on geometry-type', () => {
		const offenders = style.layers
			.filter((l) => MIXED.has((l as { 'source-layer'?: string })['source-layer'] ?? ''))
			.filter((l) => !JSON.stringify((l as { filter?: unknown }).filter ?? null).includes('geometry-type'))
			.map((l) => l.id);
		expect(offenders).toEqual([]);
	});
});

describe('group tagging', () => {
	const tagged = [...protomapsLayers(ctx)];

	it('tags every layer that reads tile data', () => {
		const untagged = tagged.filter((t) => !t.group && t.layer.type !== 'background').map((t) => t.layer.id);
		expect(untagged).toEqual([]);
	});

	it('tags only groups that resolve to a leaf of the resolved option tree', () => {
		const resolved = resolveLayerGroups(undefined) as Record<string, unknown>;
		const leafAt = (path: string) =>
			path
				.split('.')
				.reduce<unknown>(
					(node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined),
					resolved
				);
		const unresolved = [...new Set(tagged.map((t) => t.group).filter(Boolean) as string[])]
			.filter((group) => leafAt(group) === undefined)
			.sort();
		expect(unresolved).toEqual([]);
	});
});

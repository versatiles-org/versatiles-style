import { describe, expect, it } from 'vitest';
import { buildContext, shortbreadLayers } from './index.js';
import { resolveOsm } from '../options/index.js';
import { resolveLayerGroups } from '../options/layer-groups.js';
import { Color } from '../color/index.js';
import type { MaplibreLayer } from '../types/index.js';

// Structural contracts on the *tagged* layer stream (before gate() drops the group tags), i.e.
// the layer-generation stage. These complement api/style-invariants.test.ts (which validates the
// final per-layer paint) with generation-stage guarantees: valid source-layers, a coherent group
// registry, sane zoom ranges, parseable colors.

const ctx = buildContext(resolveOsm());
const tagged = [...shortbreadLayers(ctx)];
const layers = tagged.map((t) => t.layer as unknown as Record<string, unknown>);

// The Shortbread vector schema's source-layers (https://shortbread-tiles.org). Every data layer
// must read from one of these — a typo here silently renders nothing, and passes MapLibre's own
// spec validation (which doesn't know the source's layer names).
const ALLOWED_SOURCE_LAYERS = new Set([
	'addresses',
	'aerialways',
	'boundaries',
	'boundary_labels',
	'bridges',
	'buildings',
	'dam_lines',
	'dam_polygons',
	'ferries',
	'land',
	'ocean',
	'pier_lines',
	'pier_polygons',
	'place_labels',
	'pois',
	'public_transport',
	'sites',
	'street_labels',
	'street_labels_points',
	'street_polygons',
	'streets',
	'water_lines',
	'water_polygons',
]);

describe('layer-generation invariants', () => {
	it('every data layer reads from a known Shortbread source-layer', () => {
		const offenders = layers
			.filter((l) => l['source-layer'] != null)
			.filter((l) => !ALLOWED_SOURCE_LAYERS.has(l['source-layer'] as string))
			.map((l) => `${l.id as string} → ${l['source-layer'] as string}`);
		expect(offenders).toStrictEqual([]);
	});

	it('the set of source-layers in use is stable (regression guard for new sources)', () => {
		const used = [...new Set(layers.map((l) => l['source-layer']).filter(Boolean) as string[])].sort();
		expect(used).toMatchSnapshot();
	});

	it('every group tag resolves to a boolean/number leaf in the resolved layer groups', () => {
		const resolved = resolveLayerGroups() as unknown as Record<string, unknown>;
		const resolvePath = (path: string): unknown => {
			let node: unknown = resolved;
			for (const seg of path.split('.')) {
				if (node && typeof node === 'object') node = (node as Record<string, unknown>)[seg];
				else return undefined;
			}
			return node;
		};
		const offenders = tagged
			.filter((t) => t.group != null)
			.filter((t) => {
				const v = resolvePath(t.group as string);
				return typeof v !== 'boolean' && typeof v !== 'number';
			})
			.map((t) => `${t.layer.id} → ${t.group}`);
		expect(offenders).toStrictEqual([]);
	});

	it('no layer has minzoom > maxzoom', () => {
		const offenders = layers
			.filter((l) => typeof l.minzoom === 'number' && typeof l.maxzoom === 'number')
			.filter((l) => (l.minzoom as number) > (l.maxzoom as number))
			.map((l) => `${l.id as string} (${l.minzoom}..${l.maxzoom})`);
		expect(offenders).toStrictEqual([]);
	});

	it('every layer id is unique', () => {
		const seen = new Set<string>();
		const dupes: string[] = [];
		for (const l of layers) {
			const id = l.id as string;
			if (seen.has(id)) dupes.push(id);
			seen.add(id);
		}
		expect(dupes).toStrictEqual([]);
	});

	it('every plain-string paint color is parseable by Color.parse', () => {
		const offenders: string[] = [];
		for (const l of layers) {
			const paint = (l.paint ?? {}) as Record<string, unknown>;
			for (const [key, value] of Object.entries(paint)) {
				if (!key.endsWith('-color') || typeof value !== 'string') continue; // skip expressions
				try {
					Color.parse(value);
				} catch {
					offenders.push(`${l.id as string}.${key} = ${value}`);
				}
			}
		}
		expect(offenders).toStrictEqual([]);
	});

	it('background & slot layers carry no source-layer', () => {
		const offenders = (layers as unknown as MaplibreLayer[])
			.filter((l) => l.type === 'background')
			.filter((l) => (l as Record<string, unknown>)['source-layer'] != null)
			.map((l) => l.id);
		expect(offenders).toStrictEqual([]);
	});
});
